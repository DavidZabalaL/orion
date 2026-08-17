"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { fieldStyle } from "@/components/bi/selectores-combinacion";
import type { CombinacionBI } from "@/components/bi/selectores-combinacion";

type RespuestaNL = { ok: true; params: Partial<CombinacionBI> & { dataset: string } } | { ok: false; necesitaAclaracion: true; mensaje: string };

/**
 * Input de lenguaje natural arriba del explorador: al enviar, pre-llena los
 * selectores existentes con lo que interpretó el modelo — nunca ejecuta nada
 * por su cuenta. Si el backend no puede mapear la pregunta a un dataset/campo
 * válido, muestra el mensaje de aclaración en vez de aplicar nada.
 */
export function PreguntaNatural({ onInterpretado }: { onInterpretado: (params: { datasetId: string; ejeX: string; ejeY: string; agregacion: "conteo" | "suma" | "promedio"; tipoGrafica: CombinacionBI["tipoGrafica"]; filtros?: CombinacionBI["filtros"] }) => void }) {
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!pregunta.trim() || cargando) return;
    setCargando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/bi/nl-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta }),
      });
      const body: RespuestaNL | { error: string } = await res.json();
      if (!res.ok || "error" in body) {
        setMensaje("error" in body ? body.error : "No se pudo procesar la pregunta.");
      } else if (!body.ok) {
        setMensaje(body.mensaje);
      } else {
        const p = body.params;
        onInterpretado({
          datasetId: p.dataset,
          ejeX: p.ejeX as string,
          ejeY: p.ejeY as string,
          agregacion: p.agregacion as "conteo" | "suma" | "promedio",
          tipoGrafica: p.tipoGrafica as CombinacionBI["tipoGrafica"],
          filtros: p.filtros,
        });
      }
    } catch {
      setMensaje("No se pudo conectar con el servicio de lenguaje natural.");
    }
    setCargando(false);
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--sidebar-text)" />
          <input
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="Pregunta en lenguaje natural, ej. ¿cuántas unidades activas hay por proyecto?"
            className="pl-9"
            style={fieldStyle}
          />
        </div>
        <button
          type="submit"
          disabled={cargando}
          className="rounded-md px-4 h-10 font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
        >
          {cargando ? "Pensando…" : "Preguntar"}
        </button>
      </div>
      {mensaje && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{mensaje}</p>}
    </form>
  );
}
