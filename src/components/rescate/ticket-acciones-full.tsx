"use client";

import { useState, useTransition } from "react";
import { avanzarEstatus, asignarTicket } from "@/app/(app)/rescate/actions";
import { useRouter } from "next/navigation";

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

const SIGUIENTES_ESTATUS: Record<string, string[]> = {
  ABIERTO:     ["ASIGNADO", "EN_ATENCION", "CANCELADO"],
  ASIGNADO:    ["EN_ATENCION", "CANCELADO"],
  EN_ATENCION: ["EN_TRANSITO", "RESUELTO", "CANCELADO"],
  EN_TRANSITO: ["RESUELTO", "CANCELADO"],
  RESUELTO:    ["CERRADO"],
  CERRADO:     [],
  CANCELADO:   [],
};

export function TicketAccionesFull({
  ticketId,
  estatus,
  reportadoPorId,
  motivoCategoria,
  usuarios,
}: {
  ticketId: string;
  estatus: string;
  reportadoPorId: string;
  motivoCategoria: string;
  usuarios: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [comentario, setComentario] = useState("");
  const [asignadoAId, setAsignadoAId] = useState("");
  const [error, setError] = useState("");

  const siguientes = SIGUIENTES_ESTATUS[estatus] ?? [];
  if (siguientes.length === 0) return null;

  const requiereComentario = siguientes.some((s) => ["CERRADO", "CANCELADO"].includes(s));

  const fieldStyle: React.CSSProperties = {
    background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)",
    fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", height: 36,
    borderRadius: "var(--radius-md)", padding: "0 10px",
  };

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
        Acciones
      </h2>

      {estatus === "ABIERTO" && (
        <div>
          <label style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>
            Asignar a
          </label>
          <div className="flex items-center gap-2">
            <select value={asignadoAId} onChange={(e) => setAsignadoAId(e.target.value)} style={{ ...fieldStyle, width: 260 }}>
              <option value="">Seleccionar usuario…</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
            <button
              disabled={!asignadoAId || pending}
              onClick={() => {
                const fd = new FormData();
                fd.set("ticketId", ticketId);
                fd.set("asignadoAId", asignadoAId);
                start(async () => {
                  setError("");
                  const res = await asignarTicket(fd);
                  if (!res.ok) setError(res.error ?? "Error");
                  else router.refresh();
                });
              }}
              className="rounded-md px-4 h-9 font-semibold disabled:opacity-40"
              style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
            >
              Asignar
            </button>
          </div>
        </div>
      )}

      {requiereComentario && (
        <div>
          <label style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>
            Comentario
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={2}
            placeholder="Describe la acción tomada o el motivo de cierre/cancelación…"
            style={{ ...fieldStyle, height: "auto", padding: "8px 10px", resize: "vertical", width: "100%" }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {siguientes.map((sig) => (
          <button
            key={sig}
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set("ticketId", ticketId);
              fd.set("nuevoEstatus", sig);
              fd.set("comentario", comentario);
              start(async () => {
                setError("");
                const res = await avanzarEstatus(fd);
                if (!res.ok) setError(res.error ?? "Error");
                else { setComentario(""); router.refresh(); }
              });
            }}
            className="rounded-md px-4 h-9 font-semibold disabled:opacity-60"
            style={{
              background: ESTATUS_STYLE[sig]?.bg ?? "var(--chip)",
              color: ESTATUS_STYLE[sig]?.color ?? "var(--sidebar-text)",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--text-sm)",
              border: `1px solid ${ESTATUS_STYLE[sig]?.color ?? "var(--field-border)"}`,
            }}
          >
            {pending ? "…" : `→ ${ESTATUS_LABEL[sig]}`}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "#ef4444", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>{error}</p>}

      {motivoCategoria === "SEGURIDAD" && (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "#ef4444" }}>
          Ticket de Seguridad — no puede ser cerrado por quien lo reportó.
        </p>
      )}
    </div>
  );
}
