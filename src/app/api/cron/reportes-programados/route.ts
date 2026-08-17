// Motor de ejecución real de ReporteProgramado — hasta esta fase, el modelo
// solo se podía crear/activar/desactivar (CRUD) sin que nada lo ejecutara.
// Disparado por Vercel Cron (ver vercel.json) cada hora; este handler decide
// internamente a quién le toca correr esta hora — Vercel Cron no garantiza
// granularidad más fina que "cada hora" en todos los planes, así que la
// lógica de "¿ya corrió en este periodo?" vive aquí, no en el scheduler.
//
// Convención de granularidad (documentada porque ReporteProgramado no tiene
// un selector de día): SEMANAL corre los lunes, MENSUAL corre el día 1 de
// cada mes, ambos a la hora configurada (hora de México).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ejecutarReporteProgramado } from "@/lib/bi/motor-reportes";
import { inicioDeHoyMx, inicioDeMesMx } from "@/lib/timezone";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OFFSET_MX_HORAS = 6;

export async function GET(request: Request): Promise<NextResponse> {
  const secreto = process.env.CRON_SECRET;
  if (secreto) {
    const encabezado = request.headers.get("authorization");
    if (encabezado !== `Bearer ${secreto}`) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
  }

  const marcoMx = new Date(Date.now() - OFFSET_MX_HORAS * 3_600_000);
  const horaMx = marcoMx.getUTCHours();
  const diaSemanaMx = marcoMx.getUTCDay(); // 0 = domingo, 1 = lunes
  const diaDelMesMx = marcoMx.getUTCDate();

  const activos = await prisma.reporteProgramado.findMany({ where: { activo: true } });

  const resultados: { id: string; nombre: string; ejecutado: boolean; estatus?: string; error?: string }[] = [];

  for (const reporte of activos) {
    const horaConfigurada = Number(reporte.hora.split(":")[0]);
    if (!Number.isFinite(horaConfigurada) || horaConfigurada !== horaMx) continue;

    let periodoInicio: Date;
    if (reporte.frecuencia === "DIARIO") {
      periodoInicio = inicioDeHoyMx();
    } else if (reporte.frecuencia === "SEMANAL") {
      if (diaSemanaMx !== 1) continue;
      periodoInicio = inicioDeHoyMx();
    } else {
      if (diaDelMesMx !== 1) continue;
      periodoInicio = inicioDeMesMx();
    }

    if (reporte.ultimaEjecucionEn && reporte.ultimaEjecucionEn >= periodoInicio) continue;

    const resultado = await ejecutarReporteProgramado(reporte.id);
    resultados.push({ id: reporte.id, nombre: reporte.nombre, ejecutado: true, estatus: resultado.estatus, error: resultado.error });
  }

  return NextResponse.json({ revisados: activos.length, ejecutados: resultados.length, resultados });
}
