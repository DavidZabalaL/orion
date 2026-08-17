"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { TipoAgregacion, TipoOrden, FiltroGuardable } from "@/lib/bi/metadata";

/**
 * Resumen automático de la gráfica actualmente visible. El backend
 * RE-EJECUTA la consulta (con RLS) en vez de confiar en datos del cliente —
 * este componente solo dispara la petición y muestra el texto o se queda en
 * silencio si no hay resumen (el gráfico se muestra igual, esto es un
 * complemento, nunca un bloqueante). El estado de "cargando" se deriva de
 * comparar la llave resuelta contra la actual (mismo patrón que
 * use-bi-query.ts) en vez de un setState síncrono al inicio del efecto.
 */
export function InsightBI({
  dataset,
  ejeX,
  ejeY,
  agregacion,
  orden,
  filtros,
  proyectoIds,
  tieneDatos,
}: {
  dataset: string;
  ejeX: string;
  ejeY: string;
  agregacion: TipoAgregacion;
  orden?: TipoOrden;
  filtros?: FiltroGuardable[];
  proyectoIds?: string[];
  /** Solo se dispara la petición cuando la gráfica ya tiene datos cargados. */
  tieneDatos: boolean;
}) {
  const key = useMemo(() => JSON.stringify({ dataset, ejeX, ejeY, agregacion, orden, filtros, proyectoIds }), [dataset, ejeX, ejeY, agregacion, orden, filtros, proyectoIds]);
  const [resumen, setResumen] = useState<string | null>(null);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!tieneDatos) return;
    let cancelado = false;
    fetch("/api/bi/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: key,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelado) return;
        setResumen(body?.resumen ?? null);
        setResolvedKey(key);
      })
      .catch(() => {
        if (cancelado) return;
        setResumen(null);
        setResolvedKey(key);
      });
    return () => {
      cancelado = true;
    };
  }, [key, tieneDatos]);

  if (!tieneDatos) return null;
  if (resolvedKey !== key) {
    return <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>Generando resumen…</p>;
  }
  if (!resumen) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg p-3" style={{ background: "var(--chip)" }}>
      <Sparkles size={14} className="mt-0.5 shrink-0" color="var(--color-primary)" />
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>{resumen}</p>
    </div>
  );
}
