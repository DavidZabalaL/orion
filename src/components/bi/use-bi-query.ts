"use client";

import { useEffect, useMemo, useState } from "react";
import type { BiDato } from "@/components/bi/bi-chart";

export type BiQueryResultado = {
  datos: BiDato[];
  ejeYLabel: string;
  cargando: boolean;
  error: string | null;
};

/** Ejecuta /api/bi/query y deriva el estado de carga de la comparación de "key" en vez de setState síncrono en el efecto. */
export function useBiQuery(dataset: string, ejeX: string, ejeY: string): BiQueryResultado {
  const params = useMemo(() => ({ dataset, ejeX, ejeY }), [dataset, ejeX, ejeY]);
  const key = useMemo(() => JSON.stringify(params), [params]);

  const [datos, setDatos] = useState<BiDato[]>([]);
  const [ejeYLabel, setEjeYLabel] = useState("");
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/bi/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Error al consultar.");
        return body;
      })
      .then((body) => {
        if (cancelado) return;
        setDatos(body.datos);
        setEjeYLabel(body.ejeY.label);
        setError(null);
        setResolvedKey(key);
      })
      .catch((e) => {
        if (cancelado) return;
        setError(e.message);
        setResolvedKey(key);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { datos, ejeYLabel, cargando: resolvedKey !== key, error };
}
