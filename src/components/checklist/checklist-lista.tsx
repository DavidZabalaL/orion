"use client";

import { Fragment, useMemo, useState } from "react";
import { ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Table, EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";

type ChecklistRow = {
  id: string;
  fecha: string;
  odometro: number;
  horometro: number | null;
  unidad: { numeroEconomico: string; marca: string; unidadModelo: string };
  puntosInspeccion: Record<string, string>;
  evidencia: { url: string } | null;
  capturadoPor: { nombre: string } | null;
};

export function ChecklistLista({ checklists }: { checklists: ChecklistRow[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return checklists;
    return checklists.filter((c) => c.unidad.numeroEconomico.toUpperCase().includes(q));
  }, [checklists, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar número económico…" />
      {filtrados.length === 0 ? (
        <EmptyState>Sin checklists que coincidan.</EmptyState>
      ) : (
        <Table headers={["Hora", "Unidad", "Odómetro", "Puntos", "Foto", ""]} minWidth={720}>
          {filtrados.map((c) => (
            <Fragment key={c.id}>
              <tr style={{ borderBottom: expandido === c.id ? "none" : "1px solid var(--field-border)" }}>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(c.fecha)}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{c.unidad.numeroEconomico}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{c.odometro} km</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(c.puntosInspeccion).map(([k, v]) => (
                      <Badge key={k} label={k} color={v === "ok" ? "var(--color-status-cerrado)" : "var(--color-status-revision)"} bg={v === "ok" ? "var(--status-cerrado-bg)" : "var(--status-revision-bg)"} />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {c.evidencia ? <ImageIcon size={16} color="var(--color-status-cerrado)" /> : <span style={{ color: "var(--sidebar-text)" }}>—</span>}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setExpandido((e) => (e === c.id ? null : c.id))}
                    className="flex items-center gap-1 rounded-md px-2.5 py-1"
                    style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
                  >
                    {expandido === c.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Ver ficha
                  </button>
                </td>
              </tr>
              {expandido === c.id && (
                <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                  <td colSpan={6} className="px-4 py-4" style={{ background: "var(--field-bg)" }}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
                      <div className="flex-1 grid grid-cols-2 gap-3 md:grid-cols-3">
                        <Detalle label="Unidad" value={`${c.unidad.numeroEconomico} — ${c.unidad.marca} ${c.unidad.unidadModelo}`} />
                        <Detalle label="Fecha y hora" value={fmtFechaHora(c.fecha)} />
                        <Detalle label="Capturado por" value={c.capturadoPor?.nombre ?? "—"} />
                        <Detalle label="Odómetro" value={`${c.odometro} km`} />
                        {c.horometro !== null && <Detalle label="Horómetro" value={`${c.horometro} hrs`} />}
                        {Object.entries(c.puntosInspeccion).map(([k, v]) => (
                          <Detalle key={k} label={k} value={v === "ok" ? "OK" : "Revisar"} />
                        ))}
                      </div>
                      {c.evidencia && (
                        <a href={c.evidencia.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={c.evidencia.url} alt="Evidencia fotográfica del checklist" className="rounded-lg object-cover" style={{ width: 160, height: 160 }} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </Table>
      )}
    </div>
  );
}

function Detalle({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{value}</div>
    </div>
  );
}
