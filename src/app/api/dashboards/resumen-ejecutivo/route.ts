import { NextRequest, NextResponse } from "next/server";
import { tienePermisoModulo } from "@/lib/permisos";
import { geminiDisponible, obtenerClienteGemini, MODELO_INSIGHT } from "@/lib/ai/gemini-client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ResumenItem {
  title: string;
  value: string | number;
}

// El PDF usa la fuente estándar "Helvetica" de @react-pdf/renderer, cuya
// codificación (WinAnsi/Latin-1) no cubre todo Unicode — un solo carácter
// fuera de ese rango (típicamente una comilla tipográfica, un guion largo o
// puntos suspensivos que Gemini genera con naturalidad en prosa) puede
// corromper o truncar el <Text> completo donde aparece. Se normalizan los
// casos comunes a su equivalente ASCII y se descarta cualquier otro símbolo
// fuera de Latin-1 en vez de dejarlo pasar tal cual.
function sanitizarParaPdf(texto: string): string {
  return texto
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\n\r\t -ÿ]/g, "");
}

/**
 * POST /api/dashboards/resumen-ejecutivo — redacta el texto narrativo del
 * resumen ejecutivo exportable en PDF desde el dashboard unificado, a partir
 * de los KPIs que el usuario eligió incluir, opcionalmente guiado por
 * instrucciones libres. Mismo cliente de IA (Gemini) que ya usa
 * /api/bi/insight, y mismo criterio de no fallar en silencio: si la IA no
 * está disponible o falla, el PDF debe poder generarse igual sin narrativa,
 * pero el motivo se devuelve al cliente para mostrarlo.
 */
export async function POST(req: NextRequest) {
  if (!(await tienePermisoModulo("M"))) {
    return NextResponse.json({ error: "No tienes permiso para generar resúmenes ejecutivos." }, { status: 403 });
  }

  let body: { items?: ResumenItem[]; customPrompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const listaItems = Array.isArray(body.items) ? body.items : [];
  const prompt = (body.customPrompt || "").trim().slice(0, 1000);

  if (listaItems.length === 0 && !prompt) {
    return NextResponse.json({ summary: "" });
  }

  if (!geminiDisponible()) {
    return NextResponse.json({ summary: "", error: "Los resúmenes con IA no están configurados en este entorno." });
  }

  const listaDatos = listaItems.length > 0
    ? listaItems.map((it) => `- ${it.title}: ${it.value}`).join("\n")
    : "(sin indicadores seleccionados)";

  const system = `Eres un consultor senior de estrategia de negocio, con años de experiencia asesorando a la dirección de empresas con flotas vehiculares en México. Grupo Kabat te pidió redactar el resumen ejecutivo de un reporte de Orión (su plataforma de control vehicular) para su equipo directivo.

No te limites a listar o repetir las cifras: interprétalas con criterio experto — señala qué significan, qué tendencia, riesgo u oportunidad revelan, y qué implicación tienen para la operación de la flota. Escribe como lo haría un consultor experimentado presentando su diagnóstico a la dirección, con seguridad y sin rodeos.

Reglas:
- 4 a 6 frases, en español, en prosa (sin viñetas, sin markdown, sin título).
- No inventes cifras ni datos que no estén en los indicadores de abajo — tu valor está en la interpretación, no en la invención.
- Si los indicadores son insuficientes para un diagnóstico sólido, dilo brevemente en vez de rellenar con generalidades vacías.

Indicadores:
${listaDatos}
${prompt ? `\nEl equipo directivo pidió específicamente lo siguiente para este resumen — priorízalo sobre el criterio general de arriba, sin dejar de basarte únicamente en los indicadores reales: "${prompt}"` : ""}`;

  try {
    const client = obtenerClienteGemini();
    const response = await client.models.generateContent({
      model: MODELO_INSIGHT,
      contents: "Genera el resumen ejecutivo.",
      // gemini-3.1-pro-preview razona internamente antes de responder, y esos
      // tokens de "pensamiento" cuentan contra maxOutputTokens — con un tope
      // bajo (600) el modelo podía agotar el presupuesto pensando y dejar el
      // texto visible cortado a media frase. 2048 deja margen de sobra para
      // el razonamiento y las 4-6 frases que pide el prompt.
      config: { maxOutputTokens: 2048, systemInstruction: system },
    });
    // Si el modelo se quedó sin presupuesto de tokens, el texto puede venir
    // cortado a media frase — mejor tratarlo como fallo explícito (el modal
    // ya muestra un aviso y genera el PDF sin resumen) que mostrar un
    // párrafo roto en el PDF.
    if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
      return NextResponse.json({ summary: "", error: "El resumen con IA se cortó por límite de longitud. Intenta de nuevo." });
    }
    const texto = sanitizarParaPdf(response.text?.trim() || "");
    return NextResponse.json({ summary: texto });
  } catch (error) {
    console.error("[dashboards/resumen-ejecutivo] error:", error);
    const motivo = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ summary: "", error: motivo });
  }
}
