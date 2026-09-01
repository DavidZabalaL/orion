"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Table, EmptyState } from "@/components/ui/table";
import { blobProxy } from "@/lib/blob";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { fmtFechaHora } from "@/lib/formato";
import { Panel, SeccionTitulo, FilaItem } from "@/components/ui/documento-panel";
import { SECCIONES_CARGA_COMBUSTIBLE } from "@/lib/checklist-carga-combustible";

type ChecklistCargaCombustibleRow = {
  id: string;
  fecha: string;
  unidad: { numeroEconomico: string; marca: string; unidadModelo: string };
  respuestasSemanal: Record<string, string> | null;
  capturadoPor: { nombre: string } | null;
};

export function ChecklistCargaCombustibleLista({ checklists }: { checklists: ChecklistCargaCombustibleRow[] }) {
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
        <EmptyState>Sin cargas de combustible capturadas hoy.</EmptyState>
      ) : (
        <Table headers={["Hora", "Unidad", "Combustible", "Responsable", ""]} minWidth={700}>
          {filtrados.map((c) => {
            const respuestas = c.respuestasSemanal ?? {};
            return (
              <Fragment key={c.id}>
                <tr style={{ borderBottom: expandido === c.id ? "none" : "1px solid var(--field-border)" }}>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(c.fecha)}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{c.unidad.numeroEconomico}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{respuestas.tipo_combustible ?? "—"}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{respuestas.responsable ?? c.capturadoPor?.nombre ?? "—"}</td>
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
                    <td colSpan={5} className="px-4 py-4" style={{ background: "var(--field-bg)" }}>
                      <DetalleCargaCombustible respuestas={respuestas} />
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

function DetalleCargaCombustible({ respuestas }: { respuestas: Record<string, string> }) {
  return (
    <div className="flex flex-col gap-4">
      {SECCIONES_CARGA_COMBUSTIBLE.map((seccion) => {
        const textoCampos = seccion.campos
          .map((c) => ({ label: c.label, value: respuestas[c.key] }))
          .filter((c) => c.value);
        const fotoCampos = seccion.fotos
          .map((f) => ({ label: f.label, url: respuestas[f.key] }))
          .filter((f) => f.url);
        const firma = "firma" in seccion && seccion.firma ? respuestas[seccion.firma.key] : undefined;

        if (!textoCampos.length && !fotoCampos.length && !firma) return null;

        return (
          <Panel key={seccion.key}>
            <SeccionTitulo titulo={seccion.titulo} />
            {textoCampos.map((c) => (
              <FilaItem
                key={c.label}
                label={c.label}
                badge={
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)", fontWeight: 500 }}>
                    {c.value}
                  </span>
                }
              />
            ))}
            {fotoCampos.length > 0 && (
              <div className="px-5 py-4" style={{ borderTop: "1px solid var(--field-border)" }}>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                  Evidencia fotográfica
                </p>
                <div className="flex flex-wrap gap-4">
                  {fotoCampos.map((f) => (
                    <div key={f.label} className="flex flex-col gap-1.5 items-center">
                      <a href={blobProxy(f.url!)} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={blobProxy(f.url!)}
                          alt={f.label}
                          style={{ width: 110, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid var(--field-border)" }}
                        />
                      </a>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textAlign: "center", maxWidth: 110 }}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {firma && (
              <div className="px-5 py-4 flex flex-col gap-2" style={{ borderTop: "1px solid var(--field-border)" }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Firma del responsable
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={firma}
                  alt="Firma"
                  style={{ maxWidth: 260, height: 90, objectFit: "contain", background: "#fff", border: "1px solid var(--field-border)", borderRadius: 8, padding: 8 }}
                />
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
