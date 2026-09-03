"use server";

import { prisma } from "@/lib/prisma";
import { parsearWorkbook, type FilaMapeada, type ResultadoImportacion } from "@/lib/excel-parse";
import { parsearFechaFlexible } from "@/lib/import-tag";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";

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
  const unidades = await prisma.unidad.findMany({ select: { numeroEconomico: true, capacidadTanqueLitros: true, rendimientoPromedio: true, proyectoId: true } });
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
      resultado.advertencias.push({ fila: numFila, mensaje: `${numeroEconomico}: sin kilometraje en el archivo; se guardó sin rendimiento ni nivel de tanque.` });
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
      const duplicada = await prisma.combustible.findFirst({ where: { numeroEconomico, fecha, litros, costo, kmActual } });
      if (duplicada) {
        resultado.omitidas.push({ fila: numFila, motivo: "Transacción duplicada (misma unidad, fecha, litros, costo y kilometraje ya existente)." });
        continue;
      }
    }

    let rendimientoCalculado: number | null = null;
    let alertaSobrellenado = false;
    let nivelEstimadoDespues: number | null = null;

    if (unidad && numeroEconomico && kmActual) {
      const capacidadTanqueLitros = unidad.capacidadTanqueLitros ? Number(unidad.capacidadTanqueLitros) : null;
      const rendimientoPromedio = unidad.rendimientoPromedio ? Number(unidad.rendimientoPromedio) : null;

      const anterior = await prisma.combustible.findFirst({
        where: { numeroEconomico, kmActual: { lt: kmActual } },
        orderBy: { kmActual: "desc" },
      });
      const rendimientoCrudo = anterior?.kmActual != null ? (kmActual - anterior.kmActual) / litros : null;
      // rendimientoCalculado es Decimal(6,2) — un salto de kilometraje mal
      // capturado en el archivo (típico: un dígito de más/de menos en KM IN/KM
      // FIN de una carga anterior) puede dar un rendimiento absurdo que no
      // cabe en la columna y tumbaría la fila completa, perdiendo un gasto
      // real por un dato derivado poco confiable. Se descarta el cálculo (no
      // el gasto) cuando se sale de un rango físicamente razonable.
      rendimientoCalculado = rendimientoCrudo !== null && Math.abs(rendimientoCrudo) < 9999.99 ? rendimientoCrudo : null;

      if (capacidadTanqueLitros) {
        const litrosConsumidosEstimados =
          anterior?.kmActual != null && rendimientoPromedio && kmActual > anterior.kmActual ? (kmActual - anterior.kmActual) / rendimientoPromedio : 0;
        const nivelAntes = anterior?.nivelEstimadoDespues != null
          ? Math.max(0, Math.min(Number(anterior.nivelEstimadoDespues), capacidadTanqueLitros) - litrosConsumidosEstimados)
          : 0;
        const nivelCrudo = nivelAntes + litros;
        nivelEstimadoDespues = Math.abs(nivelCrudo) < 9999.99 ? nivelCrudo : null;
        alertaSobrellenado = nivelEstimadoDespues !== null && nivelEstimadoDespues > capacidadTanqueLitros;
        if (alertaSobrellenado) {
          resultado.advertencias.push({ fila: numFila, mensaje: `${numeroEconomico}: la carga excede la capacidad máxima registrada de tanque.` });
        }
      }
    }

    try {
      await prisma.combustible.create({
        data: {
          numeroEconomico,
          proyectoReportanteId: numeroEconomico ? null : (proyectoFallbackId || null),
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
      resultado.creadas.push(numeroEconomico ? `${numeroEconomico} · ${fecha.toISOString().slice(0, 10)}` : `Sin asignar · ${fecha.toISOString().slice(0, 10)}`);
    } catch (e) {
      resultado.omitidas.push({ fila: numFila, motivo: e instanceof Error ? e.message : "Error desconocido al guardar." });
    }
  }

  if (resultado.creadas.length > 0) invalidarCacheBI(["combustible"]);

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
