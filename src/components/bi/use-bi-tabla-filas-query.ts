"use client";

import { useMemo, useState, useEffect } from "react";
import type { FiltroGuardable } from "@/lib/bi/metadata";

export type BiTablaFilasParams = {
  dataset: string;
  columnas: string[];
  filtros?: FiltroGuardable[];
  proyectoIds?: string[];
};

export type BiTablaFilasResultado = {
  columnas: { id: string; label: string }[];
  filas: Record<string, string | number | null>[];
  truncado: boolean;
  cargando: boolean;
  error: string | null;
};

const VACIO: Omit<BiTablaFilasResultado, "cargando" | "error"> = { columnas: [], filas: [], truncado: false };

/** Ejecuta /api/bi/query con tipoAnalisis "tabla_filas" — equivalente a useBiQuery pero para el widget de tabla de registros (columnas libres, sin agrupar). */
export function useBiTablaFilasQuery(params: BiTablaFilasParams): BiTablaFilasResultado {
  const key = useMemo(() => JSON.stringify(params), [params]);
  const [resultado, setResultado] = useState(VACIO);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    // Se reconstruye desde `key` (no se referencia `params` directamente) para
    // que este efecto dependa solo de `key`, igual que useBiQuery.
    const parsedParams: BiTablaFilasParams = JSON.parse(key);
    const ejecutar = async (): Promise<Omit<BiTablaFilasResultado, "cargando" | "error">> => {
      if (parsedParams.columnas.length === 0) return VACIO;
      const res = await fetch("/api/bi/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoAnalisis: "tabla_filas", ...parsedParams }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al consultar.");
      return { columnas: body.columnas ?? [], filas: body.filas ?? [], truncado: body.truncado ?? false };
    };
    ejecutar()
      .then((resultado) => {
        if (cancelado) return;
        setResultado(resultado);
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
  }, [key]);

  return { ...resultado, cargando: resolvedKey !== key, error };
}
