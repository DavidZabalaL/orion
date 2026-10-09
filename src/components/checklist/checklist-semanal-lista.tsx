"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Table, EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { Badge } from "@/components/ui/badge";
import { Panel, SeccionTitulo, FilaItem, ColorChip } from "@/components/ui/documento-panel";
import { fmtFechaHora } from "@/lib/formato";
import { contarAlertasPorCategoria, SECCIONES_CHECKLIST_SEMANAL } from "@/lib/checklist-semanal";

type ChecklistSemanalRow = {
  id: string;
  fecha: string;
  unidad: { numeroEconomico: string; marca: string; unidadModelo: string };
  respuestasSemanal: Record<string, string> | null;
  capturadoPor: { nombre: string } | null;
};

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
            const { operativas, esteticas } = contarAlertasPorCategoria(respuestas);
            return (
              <Fragment key={c.id}>
                <tr style={{ borderBottom: expandido === c.id ? "none" : "1px solid var(--field-border)" }}>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(c.fecha)}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{c.unidad.numeroEconomico}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{respuestas.oficinaSede ?? "—"}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{c.capturadoPor?.nombre ?? "—"}</td>
                  <td className="px-4 py-3">
                    {operativas === 0 && esteticas === 0 ? (
                      <Badge label="Sin alertas" color="var(--color-status-cerrado)" bg="var(--status-cerrado-bg)" />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {operativas > 0 && (
                          <Badge label={`${operativas} operativa${operativas === 1 ? "" : "s"}`} color="var(--color-status-escena)" bg="var(--status-escena-bg)" />
                        )}
                        {esteticas > 0 && (
                          <Badge label={`${esteticas} estética${esteticas === 1 ? "" : "s"}`} color="var(--color-status-revision)" bg="var(--status-revision-bg)" />
                        )}
                      </div>
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
                      <div className="flex flex-col gap-3">
                        {SECCIONES_CHECKLIST_SEMANAL.map((seccion) => {
                          const filas: { label: string; valor: string | null; foto: string | null }[] = [];
                          for (const campo of seccion.campos) {
                            if (campo.tipo === "foto") {
                              const url = respuestas[campo.key];
                              if (url) filas.push({ label: campo.label, valor: null, foto: url });
                            } else {
                              const valor = respuestas[campo.key];
                              if (!valor) continue;
                              const foto = "fotoKey" in campo && campo.fotoKey ? (respuestas[campo.fotoKey] || null) : null;
                              filas.push({ label: campo.label, valor, foto });
                            }
                          }
                          if (!filas.length) return null;
                          return (
                            <Panel key={seccion.key}>
                              <SeccionTitulo titulo={seccion.titulo} />
                              {filas.map((fila, i) => (
                                <FilaItem
                                  key={i}
                                  label={fila.label}
                                  badge={fila.valor ? <ColorChip value={fila.valor} /> : null}
                                  foto={fila.foto ?? undefined}
                                />
                              ))}
                            </Panel>
                          );
                        })}
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
