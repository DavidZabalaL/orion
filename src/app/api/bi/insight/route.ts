// Resumen automático de una gráfica ya visible en el explorador. Decisión de
// seguridad clave: este endpoint RE-EJECUTA la consulta server-side (con RLS)
// en vez de confiar en un `resultado` que mande el cliente — así nadie puede
// fabricar datos falsos para que el LLM los "explique", y el modelo solo ve
// agregados ya filtrados por permisos, nunca filas crudas con PII.
import { NextResponse } from "next/server";
import { tienePermisoModulo } from "@/lib/permisos";
import { validarParamsSimple, resolverAlcanceProyecto, ejecutarSimple, type Filtro } from "@/lib/bi/motor-consultas";
import { hashDeObjeto, obtenerInsightCacheado, guardarInsightCache } from "@/lib/bi/insight-cache";
import { geminiDisponible, obtenerClienteGemini, MODELO_INSIGHT } from "@/lib/ai/gemini-client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type BodyInsight = {
  dataset: string;
  ejeX: string;
  ejeY: string;
  agregacion: string;
  orden?: "dimension" | "valor_desc" | "valor_asc";
  filtros?: Filtro[];
  proyectoIds?: string[];
};

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await tienePermisoModulo("M"))) {
    return NextResponse.json({ error: "No tienes permiso para consultar el motor de BI." }, { status: 403 });
  }
  if (!geminiDisponible()) {
    return NextResponse.json({ error: "Los resúmenes automáticos no están configurados en este entorno." }, { status: 503 });
  }

  let body: BodyInsight;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const validado = validarParamsSimple(body.dataset, body.ejeX, body.ejeY, body.agregacion);
  if (!validado) return NextResponse.json({ error: "Parámetros de consulta inválidos." }, { status: 400 });
  const { dataset, campoX, campoY, agregacion } = validado;

  try {
    const { condicion: alcance, llave: llaveAlcance } = await resolverAlcanceProyecto(dataset, body.proyectoIds);
    const filtrosLlave = JSON.stringify(body.filtros ?? []);
    const resultado = await ejecutarSimple(dataset, campoX, campoY, agregacion, body.orden, body.filtros, alcance, llaveAlcance, filtrosLlave);

    if (resultado.datos.length === 0) {
      return NextResponse.json({ resumen: null, cacheado: false });
    }

    const claveConsulta = hashDeObjeto({ tipo: "insight", dataset: dataset.id, ejeX: campoX.id, ejeY: campoY.id, agregacion, orden: body.orden ?? "", filtrosLlave, llaveAlcance });
    const datosHash = hashDeObjeto(resultado.datos);

    const cacheado = await obtenerInsightCacheado("insight", claveConsulta, datosHash);
    if (cacheado) return NextResponse.json({ resumen: cacheado, cacheado: true });

    const client = obtenerClienteGemini();
    const datosTexto = resultado.datos.map((d) => `${d.dimension}: ${d.valor}`).join("\n");
    const response = await client.models.generateContent({
      model: MODELO_INSIGHT,
      contents: `Dataset: ${dataset.label}\nDimensión: ${campoX.label}\nMétrica: ${resultado.ejeY.label}\n\n${datosTexto}`,
      config: {
        maxOutputTokens: 300,
        systemInstruction:
          "Eres un analista de datos de una flota vehicular. Se te da una tabla ya agregada (dimensión → valor) y debes escribir 2-3 frases en español explicando el patrón principal (el valor más alto/bajo, alguna concentración notable). No inventes cifras que no estén en la tabla. No des recomendaciones, solo describe.",
      },
    });

    const resumen = response.text?.trim() || null;
    if (resumen) {
      await guardarInsightCache({ tipo: "insight", claveConsulta, datosHash, resumen, modelo: MODELO_INSIGHT });
    }

    return NextResponse.json({ resumen, cacheado: false });
  } catch (error) {
    console.error("Error en /api/bi/insight", error);
    return NextResponse.json({ error: "No se pudo generar el resumen." }, { status: 500 });
  }
}
