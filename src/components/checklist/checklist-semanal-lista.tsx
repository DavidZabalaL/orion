"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, TriangleAlert } from "lucide-react";
import { Table, EmptyState } from "@/components/ui/table";
import { blobProxy } from "@/lib/blob";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";
import { todasLasClavesFoto } from "@/lib/checklist-semanal";

type ChecklistSemanalRow = {
  id: string;
  fecha: string;
  unidad: { numeroEconomico: string; marca: string; unidadModelo: string };
  respuestasSemanal: Record<string, string> | null;
  capturadoPor: { nombre: string } | null;
};

const CLAVES_FOTO = new Set([...todasLasClavesFoto(), "fotoLicenciaUrl"]);
const CLAVES_META = new Set(["oficinaSede", "licenciaPermanente", "fotoLicenciaUrl", "modelo", "tipoVehiculo"]);

export function ChecklistSemanalLista({ checklists }: { checklists: ChecklistSemanalRow[] }) {
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
        <EmptyState>Sin checklists semanales capturados hoy.</EmptyState>
      ) : (
        <Table headers={["Hora", "Unidad", "Oficina / Sede", "Capturado por", "Alertas", ""]} minWidth={760}>
          {filtrados.map((c) => {
            const respuestas = c.respuestasSemanal ?? {};
            const alertas = Object.entries(respuestas).filter(([k, v]) => !CLAVES_FOTO.has(k) && v === "MAL ESTADO").length;
            return (
              <Fragment key={c.id}>
                <tr style={{ borderBottom: expandido === c.id ? "none" : "1px solid var(--field-border)" }}>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(c.fecha)}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{c.unidad.numeroEconomico}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{respuestas.oficinaSede ?? "—"}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{c.capturadoPor?.nombre ?? "—"}</td>
                  <td className="px-4 py-3">
                    {alertas > 0 ? (
                      <Badge label={`${alertas} en mal estado`} color="var(--color-status-escena)" bg="var(--status-escena-bg)" />
                    ) : (
                      <Badge label="Sin alertas" color="var(--color-status-cerrado)" bg="var(--status-cerrado-bg)" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandido((e) => (e === c.id ? null : c.id))}
                      className="flex items-center gap-1 rounded-md px-2.5 py-1"
                      style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
                    >
                      {expandido === c.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Ver detalle
                    </button>
                  </td>
                </tr>
                {expandido === c.id && (
                  <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                    <td colSpan={6} className="px-4 py-4" style={{ background: "var(--field-bg)" }}>
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          {Object.entries(respuestas)
                            .filter(([k]) => !CLAVES_FOTO.has(k) && !CLAVES_META.has(k))
                            .map(([k, v]) => (
                              <div key={k}>
                                <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>{k}</div>
                                <div className="flex items-center gap-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: v === "MAL ESTADO" ? "var(--color-status-escena)" : "var(--field-text)" }}>
                                  {v === "MAL ESTADO" && <TriangleAlert size={12} />} {v}
                                </div>
                              </div>
                            ))}
                        </div>
                        {(() => {
                          const fotos = Object.entries(respuestas).filter(([k, v]) => CLAVES_FOTO.has(k) && v);
                          return fotos.length > 0 ? (
                            <div>
                              <div className="mb-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>
                                Evidencia fotográfica ({fotos.length})
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {fotos.map(([k, url]) => (
                                  <a key={k} href={blobProxy(url)} target="_blank" rel="noopener noreferrer" title={k}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={blobProxy(url)} alt={k} className="rounded-lg object-cover" style={{ width: 90, height: 90 }} />
                                  </a>
                                ))}
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </Table>
      )}
    </div>
  );
}
