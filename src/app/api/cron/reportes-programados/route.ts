// Motor de ejecución real de ReporteProgramado — hasta esta fase, el modelo
// solo se podía crear/activar/desactivar (CRUD) sin que nada lo ejecutara.
// Disparado por Vercel Cron (ver vercel.json) cada hora; este handler decide
// internamente a quién le toca correr esta hora — Vercel Cron no garantiza
// granularidad más fina que "cada hora" en todos los planes, así que la
// lógica de "¿ya corrió en este periodo?" vive aquí, no en el scheduler.
//
// Convención de granularidad: SEMANAL corre el día de la semana configurado
// en ReporteProgramado.diaSemana (0=domingo…6=sábado), MENSUAL corre el día
// del mes en ReporteProgramado.diaMes (o el último día del mes si este es
// más corto que el configurado, ej. diaMes=31 en febrero), ambos a la hora
// configurada (hora de México).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ejecutarReporteProgramado } from "@/lib/bi/motor-reportes";
import { inicioDeHoyMx } from "@/lib/timezone";
import { bearerAutorizado } from "@/lib/secreto";

/** Último día del mes en curso (hora México), dado el marco ya desplazado a MX. */
function esUltimoDiaDelMesMx(marcoMx: Date): boolean {
  const manana = new Date(marcoMx);
  manana.setUTCDate(manana.getUTCDate() + 1);
  return manana.getUTCMonth() !== marcoMx.getUTCMonth();
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OFFSET_MX_HORAS = 6;

export async function GET(request: Request): Promise<NextResponse> {
  // Falla cerrado: sin CRON_SECRET configurado se rechaza todo.
  if (!bearerAutorizado(request, "CRON_SECRET")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
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

    if (reporte.frecuencia === "SEMANAL") {
      if (diaSemanaMx !== reporte.diaSemana) continue;
    } else if (reporte.frecuencia !== "DIARIO") {
      const diaConfigurado = reporte.diaMes;
      // El mes puede ser más corto que el día configurado (ej. diaMes=31 en
      // febrero): en ese caso corre el último día del mes en vez de nunca.
      const esDiaConfigurado = diaDelMesMx === diaConfigurado || (diaConfigurado >= diaDelMesMx && esUltimoDiaDelMesMx(marcoMx));
      if (!esDiaConfigurado) continue;
    }

    // Solo cuenta como "ya enviado" lo que salió a partir de la hora
    // programada de hoy: una prueba con "Ejecutar ahora" antes de esa hora
    // (ej. al crear el reporte a las 15:58 para las 17:00) ya no se come el
    // envío automático a todos los destinatarios.
    const horaProgramadaHoy = new Date(inicioDeHoyMx().getTime() + horaConfigurada * 3_600_000);
    if (reporte.ultimaEjecucionEn && reporte.ultimaEjecucionEn >= horaProgramadaHoy) continue;

    const resultado = await ejecutarReporteProgramado(reporte.id);
    resultados.push({ id: reporte.id, nombre: reporte.nombre, ejecutado: true, estatus: resultado.estatus, error: resultado.error });
  }

  return NextResponse.json({ revisados: activos.length, ejecutados: resultados.length, resultados });
}
