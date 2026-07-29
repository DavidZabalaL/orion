"use client";

import { useMemo, useState } from "react";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { EmptyState } from "@/components/ui/table";

export function ChecklistDiarioLista({
  unidades,
  checklistSet,
  combustibleSet,
  tagSet,
}: {
  unidades: { numeroEconomico: string }[];
  checklistSet: string[];
  combustibleSet: string[];
  tagSet: string[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const checklist = useMemo(() => new Set(checklistSet), [checklistSet]);
  const combustible = useMemo(() => new Set(combustibleSet), [combustibleSet]);
  const tag = useMemo(() => new Set(tagSet), [tagSet]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return unidades;
    return unidades.filter((u) => u.numeroEconomico.toUpperCase().includes(q));
  }, [unidades, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar número económico…" />
      {filtradas.length === 0 ? (
        <EmptyState>Sin unidades que coincidan.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                {["Unidad", "Checklist", "Combustible", "TAG"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((u) => (
                <tr key={u.numeroEconomico} style={{ borderBottom: "1px solid var(--field-border)" }}>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{u.numeroEconomico}</td>
                  <td className="px-4 py-3"><Dot ok={checklist.has(u.numeroEconomico)} /></td>
                  <td className="px-4 py-3"><Dot ok={combustible.has(u.numeroEconomico)} /></td>
                  <td className="px-4 py-3"><Dot ok={tag.has(u.numeroEconomico)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Dot({ ok = false }: { ok?: boolean }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ok ? "var(--resource-disponible)" : "var(--priority-alta)" }} />;
}
