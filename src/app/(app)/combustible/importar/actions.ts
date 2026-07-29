"use server";

import { prisma } from "@/lib/prisma";
import { parsearWorkbook, type FilaMapeada, type ResultadoImportacion } from "@/lib/excel-parse";
import { parsearFechaFlexible } from "@/lib/import-tag";
import { exigirPermisoModulo } from "@/lib/permisos";

export type { HojaParseada } from "@/lib/excel-parse";

export async function parsearExcelCombustible(formData: FormData) {
  await exigirPermisoModulo("D", "editar");
  return parsearWorkbook(formData);
}

export async function importarCombustible(filas: FilaMapeada[]): Promise<ResultadoImportacion> {
  await exigirPermisoModulo("D", "editar");

  const resultado: ResultadoImportacion = { creadas: [], actualizadas: [], omitidas: [], advertencias: [] };

  const unidades = await prisma.unidad.findMany({ select: { numeroEconomico: true, capacidadTanqueLitros: true, rendimientoPromedio: true } });
  const unidadPorEconomico = new Map(unidades.map((u) => [u.numeroEconomico, u]));

  // Se procesa en orden por unidad y kilometraje para que el rendimiento y el
  // nivel estimado de tanque se calculen encadenados, igual que en captura manual.
  const filasConIndice = filas.map((fila, i) => ({ fila, numFila: i + 2 }));
  filasConIndice.sort((a, b) => {
    const ea = String(a.fila.numeroEconomico ?? "").trim().toUpperCase();
    const eb = String(b.fila.numeroEconomico ?? "").trim().toUpperCase();
    if (ea !== eb) return ea.localeCompare(eb);
    return (parseInt(a.fila.kmActual ?? "0", 10) || 0) - (parseInt(b.fila.kmActual ?? "0", 10) || 0);
  });

  for (const { fila, numFila } of filasConIndice) {
    const numeroEconomico = String(fila.numeroEconomico ?? "").trim().toUpperCase();
    const fecha = parsearFechaFlexible(fila.fecha ?? "");
    const litros = parseFloat(String(fila.litros ?? "").replace(/[^0-9.-]/g, ""));
    const costo = parseFloat(String(fila.costo ?? "").replace(/[^0-9.-]/g, ""));
    const kmActual = parseInt(String(fila.kmActual ?? "").replace(/[^0-9-]/g, ""), 10);
    const estacion = String(fila.estacion ?? "").trim() || null;

    if (!numeroEconomico || !fecha || isNaN(litros) || litros <= 0 || isNaN(costo) || costo <= 0 || isNaN(kmActual) || kmActual <= 0) {
      resultado.omitidas.push({ fila: numFila, motivo: "Faltan campos obligatorios o son inválidos (económico, fecha, litros, costo o km)." });
      continue;
    }

    const unidad = unidadPorEconomico.get(numeroEconomico);
    if (!unidad) {
      resultado.omitidas.push({ fila: numFila, motivo: `El número económico "${numeroEconomico}" no existe.` });
      continue;
    }

    const duplicada = await prisma.combustible.findFirst({ where: { numeroEconomico, fecha, litros, costo } });
    if (duplicada) {
      resultado.omitidas.push({ fila: numFila, motivo: "Transacción duplicada (misma unidad, fecha, litros y costo ya existente)." });
      continue;
    }

    const capacidadTanqueLitros = unidad.capacidadTanqueLitros ? Number(unidad.capacidadTanqueLitros) : null;
    const rendimientoPromedio = unidad.rendimientoPromedio ? Number(unidad.rendimientoPromedio) : null;

    const anterior = await prisma.combustible.findFirst({
      where: { numeroEconomico, kmActual: { lt: kmActual } },
      orderBy: { kmActual: "desc" },
    });
    const rendimientoCalculado = anterior ? (kmActual - anterior.kmActual) / litros : null;

    let alertaSobrellenado = false;
    let nivelEstimadoDespues: number | null = null;
    if (capacidadTanqueLitros) {
      const litrosConsumidosEstimados =
        anterior && rendimientoPromedio && kmActual > anterior.kmActual ? (kmActual - anterior.kmActual) / rendimientoPromedio : 0;
      const nivelAntes = anterior?.nivelEstimadoDespues != null
        ? Math.max(0, Math.min(Number(anterior.nivelEstimadoDespues), capacidadTanqueLitros) - litrosConsumidosEstimados)
        : 0;
      nivelEstimadoDespues = nivelAntes + litros;
      alertaSobrellenado = nivelEstimadoDespues > capacidadTanqueLitros;
      if (alertaSobrellenado) {
        resultado.advertencias.push({ fila: numFila, mensaje: `${numeroEconomico}: la carga excede la capacidad máxima registrada de tanque.` });
      }
    }

    try {
      await prisma.combustible.create({
        data: {
          numeroEconomico,
          fecha,
          litros,
          costo,
          kmActual,
          estacion,
          fuente: "ARCHIVO",
          rendimientoCalculado,
          nivelEstimadoDespues,
          alertaSobrellenado,
        },
      });
      resultado.creadas.push(`${numeroEconomico} · ${fecha.toISOString().slice(0, 10)}`);
    } catch (e) {
      resultado.omitidas.push({ fila: numFila, motivo: e instanceof Error ? e.message : "Error desconocido al guardar." });
    }
  }

  return resultado;
}
