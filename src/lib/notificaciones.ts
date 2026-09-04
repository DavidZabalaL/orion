import { prisma } from "@/lib/prisma";

export type Notificacion = {
  id: string;
  titulo: string;
  descripcion: string;
  href: string;
  fecha: Date;
  severidad: "alta" | "media" | "baja";
};

const DIA_MS = 24 * 60 * 60 * 1000;

function severidadPorDias(diasRestantes: number): Notificacion["severidad"] {
  if (diasRestantes <= 0) return "alta";
  if (diasRestantes <= 7) return "media";
  return "baja";
}

const CATEGORIAS_MANTENIMIENTO = [
  "MANTENIMIENTO_PREVENTIVO",
  "MANTENIMIENTO_CORRECTIVO",
  "TENENCIA",
  "VERIFICACION",
  "RENTA_VEHICULOS",
] as const;

export async function obtenerNotificaciones(usuarioId: string): Promise<Notificacion[]> {
  const config = await prisma.configuracionNotificaciones.findFirst();
  if (!config) return [];

  const ahora = new Date();
  const notificaciones: Notificacion[] = [];

  if (config.alertaSeguroActiva && config.alertaSeguroDiasPrevios.length > 0) {
    const maxDias = Math.max(...config.alertaSeguroDiasPrevios);
    const seguros = await prisma.seguro.findMany({
      where: {
        estatus: { in: ["VIGENTE", "POR_VENCER"] },
        fechaVencimiento: { lte: new Date(ahora.getTime() + maxDias * DIA_MS) },
      },
      orderBy: { fechaVencimiento: "asc" },
      take: 10,
      select: { id: true, numeroEconomico: true, aseguradora: true, fechaVencimiento: true },
    });
    for (const s of seguros) {
      const dias = Math.ceil((s.fechaVencimiento.getTime() - ahora.getTime()) / DIA_MS);
      notificaciones.push({
        id: `seguro-${s.id}`,
        titulo: `Seguro por vencer — ${s.numeroEconomico}`,
        descripcion:
          dias <= 0
            ? `${s.aseguradora} venció${dias < 0 ? ` hace ${Math.abs(dias)} día(s)` : " hoy"}`
            : `${s.aseguradora} vence en ${dias} día(s)`,
        href: `/seguros/${s.id}`,
        fecha: s.fechaVencimiento,
        severidad: severidadPorDias(dias),
      });
    }
  }

  if (config.alertaMantenimientoActiva && config.alertaMantenimientoDiasPrevios.length > 0) {
    const maxDias = Math.max(...config.alertaMantenimientoDiasPrevios);
    const gastos = await prisma.gastoVehicular.findMany({
      where: {
        categoria: { in: [...CATEGORIAS_MANTENIMIENTO] },
        estatus: "PROGRAMADO",
        fecha: { lte: new Date(ahora.getTime() + maxDias * DIA_MS) },
      },
      orderBy: { fecha: "asc" },
      take: 10,
      select: { id: true, numeroEconomico: true, categoria: true, fecha: true },
    });
    for (const g of gastos) {
      const dias = Math.ceil((g.fecha.getTime() - ahora.getTime()) / DIA_MS);
      notificaciones.push({
        id: `mantenimiento-${g.id}`,
        titulo: `${g.categoria.replaceAll("_", " ")} — ${g.numeroEconomico}`,
        descripcion:
          dias <= 0
            ? `Programado${dias < 0 ? ` hace ${Math.abs(dias)} día(s)` : " para hoy"}`
            : `Programado en ${dias} día(s)`,
        href: `/mantenimiento`,
        fecha: g.fecha,
        severidad: severidadPorDias(dias),
      });
    }
  }

  if (config.alertaDocumentoOperadorActiva && config.alertaDocumentoOperadorDiasPrevios.length > 0) {
    const maxDias = Math.max(...config.alertaDocumentoOperadorDiasPrevios);
    const documentos = await prisma.documentoOperador.findMany({
      where: {
        fechaVencimiento: { not: null, lte: new Date(ahora.getTime() + maxDias * DIA_MS) },
      },
      orderBy: { fechaVencimiento: "asc" },
      take: 10,
      select: {
        id: true,
        tipoDocumento: true,
        fechaVencimiento: true,
        operador: { select: { id: true, nombre: true } },
      },
    });
    for (const d of documentos) {
      if (!d.fechaVencimiento) continue;
      const dias = Math.ceil((d.fechaVencimiento.getTime() - ahora.getTime()) / DIA_MS);
      notificaciones.push({
        id: `documento-${d.id}`,
        titulo: `${d.tipoDocumento.replaceAll("_", " ")} — ${d.operador.nombre}`,
        descripcion:
          dias <= 0
            ? `Venció${dias < 0 ? ` hace ${Math.abs(dias)} día(s)` : " hoy"}`
            : `Vence en ${dias} día(s)`,
        href: `/operadores/${d.operador.id}`,
        fecha: d.fechaVencimiento,
        severidad: severidadPorDias(dias),
      });
    }
  }

  // Triangulación (reemplaza la conciliación manual de TAG): cruces reales de
  // combustible/TAG/GPS que no cuadran, en vez de un botón manual que no
  // comparaba nada. Acotado a los últimos 7 días y máx. 10 alertas por
  // categoría, mismo criterio que las demás categorías de arriba.
  const desde7dias = new Date(ahora.getTime() - 7 * DIA_MS);

  if (config.alertaTagSinGpsActiva) {
    const bufferMs = config.alertaTagSinGpsMinutos * 60 * 1000;
    const tagsRecientes = await prisma.tag.findMany({
      where: { numeroEconomico: { not: null }, fecha: { gte: desde7dias } },
      orderBy: { fecha: "desc" },
      take: 30,
      select: { id: true, numeroEconomico: true, fecha: true, caseta: true },
    });
    if (tagsRecientes.length > 0) {
      const economicos = Array.from(new Set(tagsRecientes.map((t) => t.numeroEconomico as string)));
      const posiciones = await prisma.posicionGPS.findMany({
        where: { numeroEconomico: { in: economicos }, timestamp: { gte: new Date(desde7dias.getTime() - bufferMs), lte: new Date(ahora.getTime() + bufferMs) } },
        select: { numeroEconomico: true, timestamp: true },
      });
      const posPorEconomico = new Map<string, Date[]>();
      for (const p of posiciones) posPorEconomico.set(p.numeroEconomico, [...(posPorEconomico.get(p.numeroEconomico) ?? []), p.timestamp]);

      let contador = 0;
      for (const t of tagsRecientes) {
        if (contador >= 10) break;
        const numeroEconomico = t.numeroEconomico as string;
        const cercanas = posPorEconomico.get(numeroEconomico) ?? [];
        const hayGpsCercano = cercanas.some((ts) => Math.abs(ts.getTime() - t.fecha.getTime()) <= bufferMs);
        if (!hayGpsCercano) {
          contador++;
          notificaciones.push({
            id: `triangulacion-tag-${t.id}`,
            titulo: `TAG sin GPS cercano — ${numeroEconomico}`,
            descripcion: `Cargo en ${t.caseta ?? "caseta sin registrar"} sin ninguna posición GPS de la unidad cerca de esa hora.`,
            href: `/unidades/${numeroEconomico}`,
            fecha: t.fecha,
            severidad: "media",
          });
        }
      }
    }
  }

  if (config.alertaCombustibleSinActividadActiva) {
    const cargasBrutas = await prisma.combustible.findMany({
      where: { fecha: { gte: desde7dias }, numeroEconomico: { not: null } },
      orderBy: { fecha: "desc" },
      take: 30,
      select: { id: true, numeroEconomico: true, fecha: true, litros: true, estacion: true },
    });
    // Las cargas sin unidad (gasto operativo de proyecto) no tienen con qué
    // triangular actividad GPS/TAG — se excluyen antes, no aquí.
    const cargas = cargasBrutas as (Omit<(typeof cargasBrutas)[number], "numeroEconomico"> & { numeroEconomico: string })[];
    if (cargas.length > 0) {
      const economicos = Array.from(new Set(cargas.map((c) => c.numeroEconomico)));
      const [posiciones, tags] = await Promise.all([
        prisma.posicionGPS.findMany({ where: { numeroEconomico: { in: economicos }, timestamp: { gte: desde7dias } }, select: { numeroEconomico: true, timestamp: true } }),
        prisma.tag.findMany({ where: { numeroEconomico: { in: economicos }, fecha: { gte: desde7dias } }, select: { numeroEconomico: true, fecha: true } }),
      ]);
      const diaClave = (numeroEconomico: string, fecha: Date) => `${numeroEconomico}-${fecha.toISOString().slice(0, 10)}`;
      const actividadPorDia = new Set<string>();
      for (const p of posiciones) actividadPorDia.add(diaClave(p.numeroEconomico, p.timestamp));
      for (const t of tags) if (t.numeroEconomico) actividadPorDia.add(diaClave(t.numeroEconomico, t.fecha));

      let contador = 0;
      for (const c of cargas) {
        if (contador >= 10) break;
        if (!actividadPorDia.has(diaClave(c.numeroEconomico, c.fecha))) {
          contador++;
          notificaciones.push({
            id: `triangulacion-combustible-${c.id}`,
            titulo: `Combustible sin actividad — ${c.numeroEconomico}`,
            descripcion: `${c.litros} L cargados en ${c.estacion ?? "estación no registrada"} sin señal GPS ni cruce de TAG ese día.`,
            href: `/unidades/${c.numeroEconomico}`,
            fecha: c.fecha,
            severidad: "media",
          });
        }
      }
    }
  }

  if (config.alertaDisponibleSinGpsDiasActiva) {
    const limite = new Date(ahora.getTime() - config.alertaDisponibleSinGpsDias * DIA_MS);
    const activas = await prisma.unidad.findMany({ where: { estatus: "ACTIVO", disponibilidad: true }, select: { numeroEconomico: true } });
    if (activas.length > 0) {
      const ultimasPosiciones = await prisma.posicionGPS.groupBy({
        by: ["numeroEconomico"],
        where: { numeroEconomico: { in: activas.map((a) => a.numeroEconomico) } },
        _max: { timestamp: true },
      });
      const ultimaPorEconomico = new Map(ultimasPosiciones.map((p) => [p.numeroEconomico, p._max.timestamp]));

      let contador = 0;
      for (const a of activas) {
        if (contador >= 10) break;
        const ultima = ultimaPorEconomico.get(a.numeroEconomico) ?? null;
        if (!ultima || ultima < limite) {
          contador++;
          const dias = ultima ? Math.floor((ahora.getTime() - ultima.getTime()) / DIA_MS) : null;
          notificaciones.push({
            id: `triangulacion-gps-${a.numeroEconomico}`,
            titulo: `Activa sin señal GPS — ${a.numeroEconomico}`,
            descripcion: dias !== null ? `Sin posición GPS desde hace ${dias} día(s).` : "Sin ninguna posición GPS registrada.",
            href: `/unidades/${a.numeroEconomico}`,
            fecha: ultima ?? limite,
            severidad: "alta",
          });
        }
      }
    }
  }

  const leidas = await prisma.notificacionLeida.findMany({
    where: { usuarioId, notificacionId: { in: notificaciones.map((n) => n.id) } },
    select: { notificacionId: true },
  });
  const idsLeidas = new Set(leidas.map((l) => l.notificacionId));

  return notificaciones
    .filter((n) => !idsLeidas.has(n.id))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .slice(0, 20);
}
