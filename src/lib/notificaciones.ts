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

export async function obtenerNotificaciones(): Promise<Notificacion[]> {
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

  return notificaciones.sort((a, b) => a.fecha.getTime() - b.fecha.getTime()).slice(0, 20);
}
