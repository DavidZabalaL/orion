"use client";

import { useMemo, useState } from "react";
import { Table, EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";

export type AnomaliaRow = {
  id: string;
  timestamp: string;
  numeroEconomico: string;
  motivoAnomalia: string | null;
  lat: number;
  lng: number;
};

export function AnomaliasLista({ anomalos }: { anomalos: AnomaliaRow[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return anomalos;
    return anomalos.filter((p) => p.numeroEconomico.toUpperCase().includes(q));
  }, [anomalos, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar número económico…" />
      {filtrados.length === 0 ? (
        <EmptyState>Sin puntos que coincidan.</EmptyState>
      ) : (
        <Table headers={["Fecha / hora", "Unidad", "Motivo", "Lat", "Lng"]} minWidth={640}>
          {filtrados.map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(p.timestamp)}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{p.numeroEconomico}</td>
              <td className="px-4 py-3"><Badge label={p.motivoAnomalia ?? "—"} color="var(--color-status-escena)" bg="var(--status-escena-bg)" /></td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{p.lat.toFixed(4)}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{p.lng.toFixed(4)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

export type HuecoRow = {
  id: string;
  numeroEconomico: string;
  timestampInicio: string;
  timestampFin: string | null;
  duracionMinutos: number | null;
  patronRecurrente: boolean;
};

export function HuecosLista({ huecos }: { huecos: HuecoRow[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return huecos;
    return huecos.filter((h) => h.numeroEconomico.toUpperCase().includes(q));
  }, [huecos, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar número económico…" />
      {filtrados.length === 0 ? (
        <EmptyState>Sin huecos que coincidan.</EmptyState>
      ) : (
        <Table headers={["Unidad", "Inicio", "Fin", "Duración", "Patrón recurrente"]} minWidth={640}>
          {filtrados.map((h) => (
            <tr key={h.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{h.numeroEconomico}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(h.timestampInicio)}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{h.timestampFin ? fmtFechaHora(h.timestampFin) : "En curso"}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{h.duracionMinutos ? `${h.duracionMinutos} min` : "—"}</td>
              <td className="px-4 py-3">{h.patronRecurrente ? <Badge label="Sí" color="var(--color-status-revision)" bg="var(--status-revision-bg)" /> : "—"}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
