"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { actualizarNotificacionRescateProyecto } from "@/app/(app)/usuarios/notificaciones/actions";

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
  width: "100%",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  display: "block",
  marginBottom: 6,
};

export type ProyectoConDestinatarios = { id: string; nombre: string; destinatariosRescate: string[] };

export function NotificacionesRescateProyectoForm({ proyectos }: { proyectos: ProyectoConDestinatarios[] }) {
  const [proyectoId, setProyectoId] = useState(proyectos[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);
  const proyecto = proyectos.find((p) => p.id === proyectoId);

  if (proyectos.length === 0) return null;

  return (
    <form
      className="flex flex-col gap-4 rounded-xl p-5"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      action={(formData) => {
        startTransition(async () => {
          await actualizarNotificacionRescateProyecto(formData);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        });
      }}
    >
      <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
        Notificaciones de rescate por proyecto
      </h3>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
        Al crear un ticket de rescate para una unidad de este proyecto, se avisa por correo a estos destinatarios.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label style={labelStyle}>Proyecto</label>
          <select name="proyectoId" value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} style={fieldStyle}>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Correos (separados por coma)</label>
          <input
            key={proyectoId}
            name="destinatariosRescate"
            defaultValue={proyecto?.destinatariosRescate.join(", ") ?? ""}
            placeholder="coordinador.zona@grupokabat.com"
            style={fieldStyle}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-md px-5 h-10 font-semibold disabled:opacity-60 w-fit"
        style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      >
        {ok ? <><CheckCircle2 size={16} /> Guardado</> : pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
