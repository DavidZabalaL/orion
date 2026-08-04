"use client";

import { useEffect, useMemo, useState } from "react";
import type { BiDato, BiCaja, BiPar, BiCruzado } from "@/components/bi/bi-chart";
import type { TipoAgregacion, TipoGrafica, TipoOrden, FiltroGuardable } from "@/lib/bi/metadata";

export type BiQueryParams = {
  dataset: string;
  ejeX: string;
  ejeY: string;
  agregacion: TipoAgregacion;
  tipoGrafica: TipoGrafica;
  ejeSplit?: string;
  orden?: TipoOrden;
  filtros?: FiltroGuardable[];
  proyectoIds?: string[];
};

export type BiQueryResultado = {
  datos: BiDato[];
  ejeYLabel: string;
  cajas: BiCaja[];
  pares: BiPar[];
  splitLabels: [string, string];
  cruzado: BiCruzado | null;
  truncado: boolean;
  cargando: boolean;
  error: string | null;
};

const VACIO: Omit<BiQueryResultado, "cargando" | "error"> = { datos: [], ejeYLabel: "", cajas: [], pares: [], splitLabels: ["", ""], cruzado: null, truncado: false };

/** Ejecuta /api/bi/query y deriva el estado de carga de la comparación de "key" en vez de setState síncrono en el efecto. */
export function useBiQuery(params: BiQueryParams): BiQueryResultado {
  const key = useMemo(() => JSON.stringify(params), [params]);

  const [resultado, setResultado] = useState(VACIO);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/bi/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: key,
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Error al consultar.");
        return body;
      })
      .then((body) => {
        if (cancelado) return;
        setResultado({
          datos: body.datos ?? [],
          ejeYLabel: body.ejeY?.label ?? "",
          cajas: body.cajas ?? [],
          pares: body.pares ?? [],
          splitLabels: body.splitLabels ?? ["", ""],
          cruzado: body.cruzado ?? null,
          truncado: (body.truncado ?? false) || (body.cruzado?.truncado ?? false),
        });
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
