"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

export type OpcionUnidad = { numeroEconomico: string; etiqueta?: string };

export function ComboboxUnidad({
  name,
  unidades,
  defaultValue,
  required,
  placeholder = "Buscar número económico…",
  style,
  onSeleccionar,
}: {
  name: string;
  unidades: OpcionUnidad[];
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  onSeleccionar?: (numeroEconomico: string) => void;
}) {
  const inicial = unidades.find((u) => u.numeroEconomico === defaultValue);
  const [valor, setValor] = useState(defaultValue ?? "");
  const [query, setQuery] = useState(inicial ? etiquetaDe(inicial) : "");
  const [abierto, setAbierto] = useState(false);

  const filtradas = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q || q === (inicial ? etiquetaDe(inicial).toUpperCase() : "")) return unidades;
    return unidades.filter((u) => etiquetaDe(u).toUpperCase().includes(q));
  }, [unidades, query, inicial]);

  function elegir(u: OpcionUnidad) {
    setValor(u.numeroEconomico);
    setQuery(etiquetaDe(u));
    setAbierto(false);
    onSeleccionar?.(u.numeroEconomico);
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={valor} required={required} />
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setValor("");
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          placeholder={placeholder}
          style={style}
        />
        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" color="var(--sidebar-text)" />
      </div>
      {abierto && (
        <div
          className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-md"
          style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-md, var(--shadow-sm))", border: "1px solid var(--field-border)" }}
        >
          {filtradas.length === 0 ? (
            <div className="px-3 py-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              Sin coincidencias.
            </div>
          ) : (
            filtradas.map((u) => (
              <button
                key={u.numeroEconomico}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(u)}
                className="block w-full text-left px-3 py-2"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-sm)",
                  color: "var(--field-text)",
                  background: valor === u.numeroEconomico ? "var(--chip)" : "transparent",
                }}
              >
                {etiquetaDe(u)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function etiquetaDe(u: OpcionUnidad) {
  return u.etiqueta ?? u.numeroEconomico;
}
