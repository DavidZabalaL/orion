"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Search } from "lucide-react";

export type UnidadSeleccionable = { numeroEconomico: string; modelo: string; proyecto: string | null };

const MAX_SELECCION = 30;

/**
 * Selector de varias unidades por número económico para el comparativo
 * (criterio "Elegir unidades"). La unidad base siempre va incluida.
 */
export function SelectorUnidadesComparativo({
  base,
  unidades,
  seleccionInicial,
  periodo,
}: {
  base: string;
  unidades: UnidadSeleccionable[];
  seleccionInicial: string[];
  periodo: string;
}) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<string[]>(seleccionInicial.filter((n) => n !== base));
  const [busqueda, setBusqueda] = useState("");

  const visibles = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return unidades.filter((u) => u.numeroEconomico !== base && (!q || `${u.numeroEconomico} ${u.modelo} ${u.proyecto ?? ""}`.toUpperCase().includes(q)));
  }, [unidades, busqueda, base]);

  function alternar(n: string) {
    setSeleccion((s) => (s.includes(n) ? s.filter((x) => x !== n) : s.length >= MAX_SELECCION ? s : [...s, n]));
  }

  function comparar() {
    const lista = [base, ...seleccion].map(encodeURIComponent).join(",");
    router.push(`/unidades/comparativo?base=${encodeURIComponent(base)}&criterio=seleccion&periodo=${periodo}&unidades=${lista}`);
  }

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)", fontWeight: 600 }}>
          Elige las unidades a comparar con {base} ({seleccion.length} seleccionada{seleccion.length === 1 ? "" : "s"}, máx. {MAX_SELECCION})
        </span>
        <div className="flex items-center gap-2">
          {seleccion.length > 0 && (
            <button type="button" onClick={() => setSeleccion([])} className="rounded-md px-3 h-8" style={{ background: "var(--chip)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
              Limpiar
            </button>
          )}
          <button
            type="button"
            onClick={comparar}
            disabled={seleccion.length === 0}
            className="rounded-md px-4 h-8 disabled:opacity-50"
            style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
          >
            Comparar
          </button>
        </div>
      </div>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--sidebar-text)" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por número económico, modelo o proyecto…"
          className="w-full rounded-md pl-8 pr-3"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
        />
      </div>
      <div className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((u) => {
          const activo = seleccion.includes(u.numeroEconomico);
          return (
            <button
              key={u.numeroEconomico}
              type="button"
              onClick={() => alternar(u.numeroEconomico)}
              aria-pressed={activo}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left"
              style={{ background: activo ? "var(--status-asignado-bg)" : "transparent" }}
            >
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                style={{ border: `1px solid ${activo ? "var(--color-primary)" : "var(--field-border)"}`, background: activo ? "var(--color-primary)" : "transparent" }}
              >
                {activo && <Check size={11} color="#fff" />}
              </span>
              <span className="min-w-0">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{u.numeroEconomico}</span>
                <span className="block truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                  {u.modelo}
                  {u.proyecto ? ` · ${u.proyecto}` : ""}
                </span>
              </span>
            </button>
          );
        })}
        {visibles.length === 0 && (
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Sin coincidencias.</p>
        )}
      </div>
    </div>
  );
}
