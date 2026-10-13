"use server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parsearWorkbook, type FilaMapeada, type ResultadoImportacion } from "@/lib/excel-parse";
import { parsearFechaFlexible } from "@/lib/import-tag";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";
import { recalcularCombustibleUnidad } from "@/lib/combustible-estimado";

export type { HojaParseada } from "@/lib/excel-parse";

export async function parsearExcelCombustible(formData: FormData) {
  await exigirPermisoModulo("D", "editar");
  return parsearWorkbook(formData);
}

export async function importarCombustible(filas: FilaMapeada[], proyectoFallbackId?: string | null): Promise<ResultadoImportacion> {
  await exigirPermisoModulo("D", "editar");

  const resultado: ResultadoImportacion = { creadas: [], actualizadas: [], omitidas: [], advertencias: [] };

  const permitidos = await proyectosPermitidosParaModulo("D");
  if (proyectoFallbackId && permitidos !== null && !permitidos.includes(proyectoFallbackId)) {
    throw new Error("No tienes permiso para asignar al proyecto seleccionado.");
  }
  const unidades = await prisma.unidad.findMany({ select: { numeroEconomico: true, proyectoId: true } });
  const unidadPorEconomico = new Map(unidades.map((u) => [u.numeroEconomico, u]));
  const creadasPorUnidad: { id: string; numFila: number; numeroEconomico: string }[] = [];

  const filasConIndice = filas.map((fila, i) => ({ fila, numFila: i + 2 }));
  filasConIndice.sort((a, b) => {
    const ea = String(a.fila.numeroEconomico ?? "").trim().toUpperCase();
    const eb = String(b.fila.numeroEconomico ?? "").trim().toUpperCase();
    if (ea !== eb) return ea.localeCompare(eb);
    return (parseInt(a.fila.kmActual ?? "0", 10) || 0) - (parseInt(b.fila.kmActual ?? "0", 10) || 0);
  });

  for (const { fila, numFila } of filasConIndice) {
    const numeroEconomicoBruto = String(fila.numeroEconomico ?? "").trim().toUpperCase();
    const fecha = parsearFechaFlexible(fila.fecha ?? "");
    const litros = parseFloat(String(fila.litros ?? "").replace(/[^0-9.-]/g, ""));
    const costo = parseFloat(String(fila.costo ?? "").replace(/[^0-9.-]/g, ""));
    const kmActualBruto = parseInt(String(fila.kmActual ?? "").replace(/[^0-9-]/g, ""), 10);
    const estacion = String(fila.estacion ?? "").trim() || null;

    if (!fecha || isNaN(litros) || litros <= 0 || isNaN(costo) || costo <= 0) {
      resultado.omitidas.push({ fila: numFila, motivo: "Faltan campos obligatorios o son inválidos (fecha, litros o costo)." });
      continue;
    }

    // Reportes de proveedores de combustible (Efectivale) a veces traen el
    // económico con un espacio en vez del guion ("G5 002" en lugar de
    // "G5-002") — un problema de captura del lado del proveedor, no una
    // convención real de nomenclatura. Se reintenta con el guion antes de
    // darlo por inexistente.
    const numeroEconomicoNormalizado = unidadPorEconomico.has(numeroEconomicoBruto)
      ? numeroEconomicoBruto
      : numeroEconomicoBruto.replace(/\s+/g, "-");
    const unidad = numeroEconomicoBruto ? unidadPorEconomico.get(numeroEconomicoNormalizado) : undefined;

    if (numeroEconomicoBruto && !unidad) {
      resultado.advertencias.push({
        fila: numFila,
        mensaje: proyectoFallbackId
          ? `Número económico "${numeroEconomicoBruto}" no existe; se asignó al proyecto seleccionado como gasto operativo.`
          : `Número económico "${numeroEconomicoBruto}" no existe; quedará pendiente de asignar.`,
      });
    } else if (!numeroEconomicoBruto && proyectoFallbackId) {
      resultado.advertencias.push({ fila: numFila, mensaje: "Sin número económico; se asignó al proyecto seleccionado como gasto operativo." });
    }

    // Sin unidad reconocida no hay a quién atribuir el permiso de proyecto
    // más que al proyecto elegido como comodín (ya validado al inicio).
    if (unidad && permitidos !== null && (!unidad.proyectoId || !permitidos.includes(unidad.proyectoId))) {
      resultado.omitidas.push({ fila: numFila, motivo: `No tienes permiso para registrar cargas de la unidad "${numeroEconomicoNormalizado}".` });
      continue;
    }

    const numeroEconomico = unidad ? numeroEconomicoNormalizado : null;
    // Algunas tarjetas (unidades "Corporativo") no traen kilometraje en el
    // reporte del proveedor — se guarda igual, sin cálculo de rendimiento ni
    // nivel de tanque (el bloque de abajo ya lo omite solo cuando falta).
    const kmActual = !isNaN(kmActualBruto) && kmActualBruto > 0 ? kmActualBruto : null;
    if (unidad && !kmActual) {
      resultado.advertencias.push({ fila: numFila, mensaje: `${numeroEconomico}: sin kilometraje en el archivo; el rendimiento y el nivel de tanque se tomarán del GPS si hay lecturas.` });
    }

    // `fecha` no lleva hora (el importador no captura hora ni tarjeta, solo el
    // día) y dos cargas reales distintas de la misma unidad el mismo día
    // pueden coincidir en litros/costo (ej. una dotación fija diaria cargada
    // con tarjetas distintas). Por eso se exige también que coincida el
    // kilometraje: una re-importación accidental de la misma fila siempre
    // trae el mismo km; dos cargas reales distintas casi nunca, porque la
    // unidad se mueve entre una carga y otra. Para filas sin unidad no hay
    // encadenamiento de kilometraje con qué comparar, así que no se deduplican.
    if (numeroEconomico) {
      // Prisma no compara correctamente columnas Decimal cuando el filtro se
      // pasa como number nativo de JS (bug reproducido con litros/costo vía
      // findFirst): hay que envolverlos en Prisma.Decimal para que el
      // adaptador los serialice igual que el valor guardado en la columna.
      const duplicada = await prisma.combustible.findFirst({
        where: { numeroEconomico, fecha, litros: new Prisma.Decimal(litros), costo: new Prisma.Decimal(costo), kmActual },
      });
      if (duplicada) {
        resultado.omitidas.push({ fila: numFila, motivo: "Transacción duplicada (misma unidad, fecha, litros, costo y kilometraje ya existente)." });
        continue;
      }
    }

    try {
      const creada = await prisma.combustible.create({
        data: {
          numeroEconomico,
          proyectoReportanteId: numeroEconomico ? null : (proyectoFallbackId || null),
          fecha,
          litros,
          costo,
          kmActual,
          estacion,
          fuente: "ARCHIVO",
        },
      });
      if (numeroEconomico) creadasPorUnidad.push({ id: creada.id, numFila, numeroEconomico });
      resultado.creadas.push(numeroEconomico ? `${numeroEconomico} · ${fecha.toISOString().slice(0, 10)}` : `Sin asignar · ${fecha.toISOString().slice(0, 10)}`);
    } catch (e) {
      resultado.omitidas.push({ fila: numFila, motivo: e instanceof Error ? e.message : "Error desconocido al guardar." });
    }
  }

  // Km recorridos, rendimiento y nivel de tanque se calculan al final, una vez
  // por unidad y ya con todas sus cargas nuevas (ver combustible-estimado.ts).
  for (const numeroEconomico of new Set(creadasPorUnidad.map((c) => c.numeroEconomico))) {
    const { estimados } = await recalcularCombustibleUnidad(numeroEconomico);
    for (const c of creadasPorUnidad) {
      if (c.numeroEconomico === numeroEconomico && estimados.get(c.id)?.alertaSobrellenado) {
        resultado.advertencias.push({ fila: c.numFila, mensaje: `${numeroEconomico}: la carga excede la capacidad estimada del tanque.` });
      }
    }
  }

  if (resultado.creadas.length > 0) invalidarCacheBI(["combustible", "presupuesto_partida"]);

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "combustible",
      accion: "import",
      entidad: "Combustible",
      detalle: { creadas: resultado.creadas.length, omitidas: resultado.omitidas.length },
    });
  }

  return resultado;
}
