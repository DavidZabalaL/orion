"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { avanzarEstatus, asignarTicket } from "@/app/(app)/rescate/actions";

export type TicketRow = {
  id: string;
  folio: string;
  numeroEconomico: string;
  estatus: string;
  prioridad: string;
  descripcion: string | null;
  ubicacion: string | null;
  createdAt: string;
  motivo: { nombre: string; categoria: string };
  reportadoPor: { nombre: string };
  asignadoA: { nombre: string } | null;
  proyecto: { nombre: string } | null;
};

const ESTATUS_LABEL: Record<string, string> = {
  ABIERTO: "Abierto", ASIGNADO: "Asignado", EN_ATENCION: "En atención",
  EN_TRANSITO: "En tránsito", RESUELTO: "Resuelto", CERRADO: "Cerrado", CANCELADO: "Cancelado",
};

const ESTATUS_STYLE: Record<string, { color: string; bg: string }> = {
  ABIERTO:     { color: "#f97316", bg: "#fff7ed" },
  ASIGNADO:    { color: "#3b82f6", bg: "#eff6ff" },
  EN_ATENCION: { color: "#8b5cf6", bg: "#f5f3ff" },
  EN_TRANSITO: { color: "#06b6d4", bg: "#ecfeff" },
  RESUELTO:    { color: "#22c55e", bg: "#f0fdf4" },
  CERRADO:     { color: "#6b7280", bg: "#f3f4f6" },
  CANCELADO:   { color: "#ef4444", bg: "#fef2f2" },
};

const PRIORIDAD_COLOR: Record<string, string> = {
  BAJA: "#22c55e", MEDIA: "#f59e0b", ALTA: "#f97316", URGENTE: "#ef4444",
};

const SIGUIENTES_ESTATUS: Record<string, string[]> = {
  ABIERTO:     ["ASIGNADO", "EN_ATENCION", "CANCELADO"],
  ASIGNADO:    ["EN_ATENCION", "CANCELADO"],
  EN_ATENCION: ["EN_TRANSITO", "RESUELTO", "CANCELADO"],
  EN_TRANSITO: ["RESUELTO", "CANCELADO"],
  RESUELTO:    ["CERRADO"],
  CERRADO:     [],
  CANCELADO:   [],
};

const selectStyle: React.CSSProperties = {
  background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)",
  fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", height: "var(--h-md)",
  borderRadius: "var(--radius-md)", padding: "0 10px",
};

function TicketAcciones({ t, usuarios }: { t: TicketRow; usuarios: { id: string; nombre: string }[] }) {
  const [pending, start] = useTransition();
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState("");
  const siguientes = SIGUIENTES_ESTATUS[t.estatus] ?? [];

  if (siguientes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        {siguientes.map((sig) => (
          <form
            key={sig}
            action={(fd) => {
              fd.set("ticketId", t.id);
              fd.set("nuevoEstatus", sig);
              fd.set("comentario", comentario);
              start(async () => {
                setError("");
                const res = await avanzarEstatus(fd);
                if (!res.ok) setError(res.error ?? "Error");
                else setComentario("");
              });
            }}
          >
            <button
              type="submit"
              disabled={pending}
              className="rounded-md px-3 h-8 text-xs font-semibold disabled:opacity-60"
              style={{ background: ESTATUS_STYLE[sig]?.bg ?? "var(--chip)", color: ESTATUS_STYLE[sig]?.color ?? "var(--sidebar-text)", fontFamily: "var(--font-ui)", border: `1px solid ${ESTATUS_STYLE[sig]?.color ?? "var(--field-border)"}` }}
            >
              → {ESTATUS_LABEL[sig]}
            </button>
          </form>
        ))}
      </div>
      {(siguientes.includes("CERRADO") || siguientes.includes("CANCELADO")) && (
        <input
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Comentario (requerido para cerrar/cancelar)"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", height: 32, borderRadius: "var(--radius-md)", padding: "0 10px", width: "100%", maxWidth: 360 }}
        />
      )}
      {t.estatus === "ABIERTO" && (
        <form action={(fd) => { fd.set("ticketId", t.id); start(() => asignarTicket(fd)); }}>
          <div className="flex items-center gap-2">
            <select name="asignadoAId" defaultValue={""} style={{ ...selectStyle, height: 32, fontSize: "var(--text-sm)", width: 200 }}>
              <option value="">Asignar a…</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
            <button type="submit" disabled={pending} className="rounded-md px-3 h-8 text-xs font-semibold" style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)" }}>
              Asignar
            </button>
          </div>
        </form>
      )}
      {error && <p style={{ color: "#ef4444", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}>{error}</p>}
    </div>
  );
}

export function RescateTabla({ tickets, usuarios }: { tickets: TicketRow[]; usuarios: { id: string; nombre: string }[] }) {
  const [estatusFiltro, setEstatusFiltro] = useState("");
  const [prioridadFiltro, setPrioridadFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return tickets.filter((t) => {
      if (estatusFiltro && t.estatus !== estatusFiltro) return false;
      if (prioridadFiltro && t.prioridad !== prioridadFiltro) return false;
      if (q && !t.folio.includes(q) && !t.numeroEconomico.includes(q) && !t.motivo.nombre.toUpperCase().includes(q)) return false;
      return true;
    });
  }, [tickets, estatusFiltro, prioridadFiltro, busqueda]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar folio, unidad, motivo…"
          style={{ ...selectStyle, minWidth: 240, flex: 1, maxWidth: 300 }}
        />
        <select value={estatusFiltro} onChange={(e) => setEstatusFiltro(e.target.value)} style={selectStyle}>
          <option value="">Todos los estatus</option>
          {Object.entries(ESTATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={prioridadFiltro} onChange={(e) => setPrioridadFiltro(e.target.value)} style={selectStyle}>
          <option value="">Todas las prioridades</option>
          {["BAJA", "MEDIA", "ALTA", "URGENTE"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
              {["Prioridad", "Folio", "Unidad", "Motivo", "Estatus", "Asignado a", "Creado", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center" style={{ fontFamily: "var(--font-ui)", color: "var(--sidebar-text)" }}>Sin tickets que coincidan.</td></tr>
            ) : filtrados.map((t) => {
              const abierto = expandido === t.id;
              return (
                <>
                  <tr key={t.id} style={{ borderBottom: abierto ? "none" : "1px solid var(--field-border)" }}>
                    <td className="px-4 py-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: PRIORIDAD_COLOR[t.prioridad] ?? "#6b7280" }} title={t.prioridad} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/rescate/${t.id}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-primary)" }}>
                        {t.folio}
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--sidebar-text-active)", fontWeight: 600 }}>
                      {t.numeroEconomico}
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                      {t.motivo.nombre}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={ESTATUS_LABEL[t.estatus]} color={ESTATUS_STYLE[t.estatus]?.color} bg={ESTATUS_STYLE[t.estatus]?.bg} />
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                      {t.asignadoA?.nombre ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(t.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setExpandido((e) => e === t.id ? null : t.id)} style={{ color: "var(--sidebar-text)" }}>
                        <ChevronRight size={16} style={{ transform: abierto ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                      </button>
                    </td>
                  </tr>
                  {abierto && (
                    <tr key={`${t.id}-exp`} style={{ borderBottom: "1px solid var(--field-border)" }}>
                      <td colSpan={8} className="px-6 py-4" style={{ background: "var(--field-bg)" }}>
                        <div className="flex flex-col gap-3">
                          <div className="grid grid-cols-2 gap-4 md:grid-cols-4" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
                            <div><span style={{ color: "var(--sidebar-text)" }}>Proyecto</span><br /><strong style={{ color: "var(--field-text)" }}>{t.proyecto?.nombre ?? "—"}</strong></div>
                            <div><span style={{ color: "var(--sidebar-text)" }}>Reportado por</span><br /><strong style={{ color: "var(--field-text)" }}>{t.reportadoPor.nombre}</strong></div>
                            <div><span style={{ color: "var(--sidebar-text)" }}>Ubicación</span><br /><strong style={{ color: "var(--field-text)" }}>{t.ubicacion ?? "—"}</strong></div>
                            <div><span style={{ color: "var(--sidebar-text)" }}>Descripción</span><br /><strong style={{ color: "var(--field-text)" }}>{t.descripcion ?? "—"}</strong></div>
                          </div>
                          <TicketAcciones t={t} usuarios={usuarios} />
                          <Link href={`/rescate/${t.id}`} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-primary)" }}>
                            Ver detalle completo y timeline →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
