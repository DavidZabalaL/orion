// Proyección y detección de anomalías sobre una serie de tiempo del motor de
// BI. El cálculo (regresión lineal, z-score) es 100% determinista — ver
// src/lib/bi/forecast.ts — el LLM solo redacta la explicación de los números
// ya calculados, nunca los predice ni los corrige.
import { NextResponse } from "next/server";
import { tienePermisoModulo } from "@/lib/permisos";
import { validarParamsSimple, resolverAlcanceProyecto, ejecutarSimple, type Filtro } from "@/lib/bi/motor-consultas";
import { proyectar, detectarAnomalias, tendencia } from "@/lib/bi/forecast";
import { hashDeObjeto, obtenerInsightCacheado, guardarInsightCache } from "@/lib/bi/insight-cache";
import { geminiDisponible, obtenerClienteGemini, MODELO_INTERPRETACION } from "@/lib/ai/gemini-client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_PERIODOS_ADELANTE = 12;

type BodyForecast = {
  dataset: string;
  ejeXTemporal: string;
  ejeY: string;
  agregacion: string;
  filtros?: Filtro[];
  proyectoIds?: string[];
  periodosAdelante?: number;
  explicar?: boolean;
};

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await tienePermisoModulo("J"))) {
    return NextResponse.json({ error: "No tienes permiso para consultar el motor de BI." }, { status: 403 });
  }

  let body: BodyForecast;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const validado = validarParamsSimple(body.dataset, body.ejeXTemporal, body.ejeY, body.agregacion);
  if (!validado) return NextResponse.json({ error: "Parámetros de consulta inválidos." }, { status: 400 });
  const { dataset, campoX, campoY, agregacion } = validado;
  if (campoX.tipo !== "fecha_mes" && campoX.tipo !== "fecha_dia") {
    return NextResponse.json({ error: "El forecast requiere un eje X de fecha (fecha_mes o fecha_dia)." }, { status: 400 });
  }
  const periodosAdelante = Math.min(Math.max(1, body.periodosAdelante ?? 3), MAX_PERIODOS_ADELANTE);
  const explicar = body.explicar !== false;

  try {
    const { condicion: alcance, llave: llaveAlcance } = await resolverAlcanceProyecto(dataset, body.proyectoIds);
    const filtrosLlave = JSON.stringify(body.filtros ?? []);
    const resultado = await ejecutarSimple(dataset, campoX, campoY, agregacion, "dimension", body.filtros, alcance, llaveAlcance, filtrosLlave, true);

    if (resultado.datos.length < 3) {
      return NextResponse.json({ error: "Se necesitan al menos 3 periodos con datos para proyectar." }, { status: 400 });
    }

    const valores = resultado.datos.map((d) => d.valor);
    const proyeccion = proyectar(valores, periodosAdelante);
    const anomalias = detectarAnomalias(resultado.datos);
    const tendenciaCalculada = tendencia(valores);

    let respuesta: Record<string, unknown> = {
      historico: resultado.datos,
      proyeccion,
      anomalias,
      tendencia: tendenciaCalculada,
    };

    if (explicar && geminiDisponible()) {
      const claveConsulta = hashDeObjeto({ tipo: "forecast", dataset: dataset.id, ejeX: campoX.id, ejeY: campoY.id, agregacion, filtrosLlave, llaveAlcance, periodosAdelante });
      const datosHash = hashDeObjeto({ historico: resultado.datos, proyeccion, anomalias });
      let explicacion = await obtenerInsightCacheado("forecast", claveConsulta, datosHash);

      if (!explicacion) {
        try {
          const client = obtenerClienteGemini();
          const response = await client.models.generateContent({
            model: MODELO_INTERPRETACION,
            contents: `Métrica: ${resultado.ejeY.label}\nTendencia: ${tendenciaCalculada}\nÚltimos valores históricos: ${resultado.datos.slice(-6).map((d) => `${d.dimension}=${d.valor}`).join(", ")}\nProyección próximos ${periodosAdelante} periodos: ${proyeccion.map((v) => v.toFixed(1)).join(", ")}\nAnomalías detectadas: ${anomalias.length === 0 ? "ninguna" : anomalias.map((a) => `${a.dimension}=${a.valor}`).join(", ")}`,
            config: {
              maxOutputTokens: 250,
              systemInstruction:
                "Redactas en español 2-3 frases explicando una proyección y anomalías YA CALCULADAS. No recalcules ni corrijas las cifras que se te dan — solo explícalas con lenguaje claro para alguien no técnico.",
            },
          });
          explicacion = response.text?.trim() || null;
          if (explicacion) await guardarInsightCache({ tipo: "forecast", claveConsulta, datosHash, resumen: explicacion, modelo: MODELO_INTERPRETACION });
        } catch (error) {
          console.error("Error generando explicación de forecast", error);
          explicacion = null;
        }
      }
      respuesta = { ...respuesta, explicacion };
    }

    return NextResponse.json(respuesta);
  } catch (error) {
    console.error("Error en /api/bi/forecast", error);
    return NextResponse.json({ error: "No se pudo calcular la proyección." }, { status: 500 });
  }
}
