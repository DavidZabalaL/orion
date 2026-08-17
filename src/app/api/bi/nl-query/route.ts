// Consultas en lenguaje natural sobre el motor de BI. Invariante de
// seguridad: el LLM SOLO puede producir los mismos parámetros que ya acepta
// /api/bi/query (dataset/ejeX/ejeY/agregación/tipoGrafica/filtros) vía tool
// use forzado — nunca genera SQL. El resultado se revalida por completo
// contra BI_DATASETS (validar-interpretacion.ts) antes de devolverse; si no
// calza, se rechaza con necesitaAclaracion en vez de intentar "corregirlo".
// Este endpoint NUNCA ejecuta la consulta — solo devuelve los parámetros
// para que el cliente los aplique a sus propios controles, exactamente como
// si el usuario los hubiera elegido a mano.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tienePermisoModulo } from "@/lib/permisos";
import { anthropicDisponible, obtenerClienteAnthropic, MODELO_INTERPRETACION } from "@/lib/ai/anthropic-client";
import { construirToolInterpretarConsulta, NOMBRE_TOOL_INTERPRETAR } from "@/lib/bi/nl-schema";
import { validarInterpretacion } from "@/lib/bi/validar-interpretacion";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const LIMITE_PREGUNTAS_POR_MINUTO = 10;
const VENTANA_RATE_LIMIT_MS = 60_000;

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await tienePermisoModulo("J"))) {
    return NextResponse.json({ error: "No tienes permiso para usar el explorador de BI." }, { status: 403 });
  }
  if (!anthropicDisponible()) {
    return NextResponse.json({ error: "La búsqueda en lenguaje natural no está configurada en este entorno." }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });

  let body: { pregunta?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }
  const pregunta = typeof body.pregunta === "string" ? body.pregunta.trim().slice(0, 500) : "";
  if (!pregunta) return NextResponse.json({ error: "Escribe una pregunta." }, { status: 400 });

  const desde = new Date(Date.now() - VENTANA_RATE_LIMIT_MS);
  const recientes = await prisma.nlQueryLog.count({ where: { usuarioId: session.user.id, createdAt: { gte: desde } } });
  if (recientes >= LIMITE_PREGUNTAS_POR_MINUTO) {
    return NextResponse.json({ error: "Demasiadas preguntas en poco tiempo. Espera un minuto e intenta de nuevo." }, { status: 429 });
  }

  const { tool, catalogoDatasets } = construirToolInterpretarConsulta();
  const systemPrompt = `Traduces preguntas en español sobre una flota vehicular a parámetros de consulta. Fecha actual: ${new Date().toISOString().slice(0, 10)}.

Catálogo de datasets y campos disponibles (son los ÚNICOS que puedes usar — nunca inventes un id que no esté aquí):
${catalogoDatasets}

Si la pregunta no se puede responder con este catálogo, o es ambigua, usa aclaracion_necesaria=true.`;

  let interpretacionCruda: unknown = null;
  let exito = false;
  let motivoRechazo: string | undefined;
  let paramsFinales: unknown = null;

  try {
    const client = obtenerClienteAnthropic();
    const response = await client.messages.create({
      model: MODELO_INTERPRETACION,
      max_tokens: 1024,
      system: systemPrompt,
      tools: [tool],
      tool_choice: { type: "tool", name: NOMBRE_TOOL_INTERPRETAR },
      messages: [{ role: "user", content: pregunta }],
    });

    const bloqueTool = response.content.find((b) => b.type === "tool_use");
    if (!bloqueTool || bloqueTool.type !== "tool_use") {
      motivoRechazo = "El modelo no produjo una interpretación estructurada.";
    } else {
      interpretacionCruda = bloqueTool.input;
      const resultado = validarInterpretacion(bloqueTool.input);
      if (resultado.ok) {
        exito = true;
        paramsFinales = resultado.params;
      } else {
        motivoRechazo = resultado.motivo;
      }
    }
  } catch (error) {
    console.error("Error en /api/bi/nl-query", error);
    motivoRechazo = "No se pudo procesar la pregunta en este momento.";
  }

  await prisma.nlQueryLog.create({
    data: {
      usuarioId: session.user.id,
      pregunta,
      interpretacion: interpretacionCruda as never,
      parametros: paramsFinales as never,
      exito,
      motivoRechazo,
    },
  });

  if (!exito) {
    return NextResponse.json({ ok: false, necesitaAclaracion: true, mensaje: motivoRechazo ?? "No se pudo interpretar la pregunta." });
  }
  return NextResponse.json({ ok: true, params: paramsFinales });
}
