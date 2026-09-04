"use server";

import { prisma } from "@/lib/prisma";
import { parsearWorkbook, type FilaMapeada, type ResultadoImportacion } from "@/lib/excel-parse";
import { parsearFechaFlexible, agregarHora } from "@/lib/import-tag";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";

export type { HojaParseada } from "@/lib/excel-parse";

export async function parsearExcelTag(formData: FormData) {
  await exigirPermisoModulo("E", "editar");
  return parsearWorkbook(formData);
}

export async function importarTags(
  filas: FilaMapeada[],
  proveedorTag: string,
  proyectoFallbackId?: string | null
): Promise<ResultadoImportacion> {
  await exigirPermisoModulo("E", "editar");

  const resultado: ResultadoImportacion = { creadas: [], actualizadas: [], omitidas: [], advertencias: [] };

  if (!["IAVE", "PASE", "TELEVIA"].includes(proveedorTag)) {
    throw new Error("Selecciona un proveedor válido.");
  }

  if (proyectoFallbackId) {
    const permitidos = await proyectosPermitidosParaModulo("E");
    if (permitidos !== null && !permitidos.includes(proyectoFallbackId)) {
      throw new Error("No tienes permiso para asignar al proyecto seleccionado.");
    }
  }

  const unidades = await prisma.unidad.findMany({ select: { numeroEconomico: true } });
  const economicosValidos = new Set(unidades.map((u) => u.numeroEconomico));

  const existentes = await prisma.tag.findMany({
    where: { proveedorTag: proveedorTag as never },
    select: { fecha: true, monto: true, caseta: true, tarjetaIdmx: true },
  });
  // Antes solo comparaba fecha+monto+caseta, sin hora ni tarjeta — dos cruces
  // reales y distintos el mismo día por la misma caseta con el mismo importe
  // (frecuente: casetas cobran una tarifa fija) se colapsaban en uno solo. Con
  // hora capturada, `fecha` ya trae la hora exacta del cruce (ver agregarHora
  // más abajo); se agrega también la tarjeta IDMX cuando el archivo la trae.
  const clave = (fecha: Date, monto: number, caseta: string | null, tarjetaIdmx: string | null) =>
    `${fecha.toISOString()}|${monto.toFixed(2)}|${(caseta ?? "").trim().toUpperCase()}|${(tarjetaIdmx ?? "").trim().toUpperCase()}`;
  const vistos = new Set(existentes.map((e) => clave(e.fecha, Number(e.monto), e.caseta, e.tarjetaIdmx)));

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const numFila = i + 2;

    const fechaBase = parsearFechaFlexible(fila.fecha ?? "");
    const fecha = fechaBase ? agregarHora(fechaBase, fila.hora) : null;
    const monto = parseFloat(String(fila.monto ?? "").replace(/[^0-9.-]/g, ""));
    const caseta = String(fila.caseta ?? "").trim() || null;
    const tarjetaIdmx = String(fila.tarjetaIdmx ?? "").trim() || null;

    if (!fecha || isNaN(monto) || monto <= 0) {
      resultado.omitidas.push({ fila: numFila, motivo: "Fecha o monto inválidos/faltantes." });
      continue;
    }

    const claveFila = clave(fecha, monto, caseta, tarjetaIdmx);
    if (vistos.has(claveFila)) {
      resultado.omitidas.push({ fila: numFila, motivo: "Transacción duplicada (misma fecha, hora, monto, caseta y tarjeta ya existente)." });
      continue;
    }
    vistos.add(claveFila);

    let numeroEconomico: string | null = null;
    const economicoBruto = String(fila.numeroEconomico ?? "").trim().toUpperCase();
    if (economicoBruto) {
      if (economicosValidos.has(economicoBruto)) {
        numeroEconomico = economicoBruto;
      } else if (proyectoFallbackId) {
        resultado.advertencias.push({ fila: numFila, mensaje: `Número económico "${economicoBruto}" no existe; se asignó al proyecto seleccionado como gasto operativo.` });
      } else {
        resultado.advertencias.push({ fila: numFila, mensaje: `Número económico "${economicoBruto}" no existe; quedará pendiente de asignar.` });
      }
    } else if (proyectoFallbackId) {
      resultado.advertencias.push({ fila: numFila, mensaje: "Sin número económico; se asignó al proyecto seleccionado como gasto operativo." });
    }

    try {
      await prisma.tag.create({
        data: {
          numeroEconomico,
          proyectoReportanteId: numeroEconomico ? null : (proyectoFallbackId || null),
          fecha,
          monto,
          caseta,
          tarjetaIdmx,
          proveedorTag: proveedorTag as never,
        },
      });
      resultado.creadas.push(claveFila);
    } catch (e) {
      resultado.omitidas.push({ fila: numFila, motivo: e instanceof Error ? e.message : "Error desconocido al guardar." });
    }
  }

  if (resultado.creadas.length > 0) invalidarCacheBI(["peajes"]);

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "tag",
      accion: "import",
      entidad: "Tag",
      detalle: { creadas: resultado.creadas.length, omitidas: resultado.omitidas.length, proveedorTag },
    });
  }

  return resultado;
}
