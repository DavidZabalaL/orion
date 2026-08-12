"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Truck, UserRound, Loader2 } from "lucide-react";
import { buscarGlobal, type ResultadoBusquedaGlobal } from "@/lib/busqueda-global";

const VACIO: ResultadoBusquedaGlobal = { unidades: [], operadores: [] };

export function GlobalSearch() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusquedaGlobal>(VACIO);
  const [abierto, setAbierto] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const res = await buscarGlobal(query);
        setResultados(res);
      });
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const resultadosVisibles = query.trim().length < 2 ? VACIO : resultados;

  useEffect(() => {
    function alClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", alClickFuera);
    return () => document.removeEventListener("mousedown", alClickFuera);
  }, []);

  const hayResultados = resultadosVisibles.unidades.length > 0 || resultadosVisibles.operadores.length > 0;

  function irA(href: string) {
    setAbierto(false);
    setQuery("");
    setResultados(VACIO);
    router.push(href);
  }

  function alEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (resultadosVisibles.unidades[0]) irA(`/unidades/${resultadosVisibles.unidades[0].numeroEconomico}`);
    else if (resultadosVisibles.operadores[0]) irA(`/operadores/${resultadosVisibles.operadores[0].id}`);
  }

  return (
    <div className="relative flex-1 max-w-md" ref={ref}>
      <form onSubmit={alEnviar}>
        <div
          className="flex items-center gap-2 rounded-md px-3 flex-1"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", height: "var(--h-md)" }}
        >
          {pending ? <Loader2 size={16} className="animate-spin" color="var(--sidebar-text)" /> : <Search size={16} color="var(--sidebar-text)" />}
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setAbierto(true);
            }}
            onFocus={() => setAbierto(true)}
            placeholder="Buscar por número económico, placa u operador…"
            className="bg-transparent outline-none flex-1 min-w-0"
            style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}
          />
        </div>
      </form>

      {abierto && query.trim().length >= 2 && (
        <div
          className="absolute left-0 top-full mt-2 w-full min-w-[320px] rounded-xl overflow-hidden z-50"
          style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-panel)", border: "1px solid var(--field-border)" }}
        >
          {!hayResultados ? (
            <div className="px-4 py-4 text-center" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              {pending ? "Buscando…" : "Sin resultados."}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {resultadosVisibles.unidades.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Unidades
                  </div>
                  {resultadosVisibles.unidades.map((u) => (
                    <button
                      key={u.numeroEconomico}
                      onClick={() => irA(`/unidades/${u.numeroEconomico}`)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                      style={{ borderBottom: "1px solid var(--field-border)" }}
                    >
                      <Truck size={15} color="var(--sidebar-text)" className="shrink-0" />
                      <div className="min-w-0">
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                          {u.numeroEconomico} <span style={{ color: "var(--sidebar-text)", fontWeight: 400 }}>· {u.placas}</span>
                        </div>
                        <div className="truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                          {u.marca} {u.unidadModelo}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {resultadosVisibles.operadores.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Operadores
                  </div>
                  {resultadosVisibles.operadores.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => irA(`/operadores/${o.id}`)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                      style={{ borderBottom: "1px solid var(--field-border)" }}
                    >
                      <UserRound size={15} color="var(--sidebar-text)" className="shrink-0" />
                      <div className="min-w-0">
                        <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{o.nombre}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{o.curp}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
