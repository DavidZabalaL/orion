"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { invitarUsuario } from "@/app/(app)/usuarios/actions";

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

export function InvitarUsuarioForm({
  roles,
  proyectos,
}: {
  roles: { id: string; nombre: string }[];
  proyectos: { id: string; nombre: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);

  return (
    <details className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <summary className="cursor-pointer" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
        Invitar usuario
      </summary>
      <form
        className="flex flex-col gap-4 mt-4"
        action={(formData) => {
          startTransition(async () => {
            await invitarUsuario(formData);
            setOk(true);
            setTimeout(() => setOk(false), 2500);
          });
        }}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input name="nombre" required style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Correo *</label>
            <input name="correo" type="email" required style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Rol *</label>
            <select name="rolId" required style={fieldStyle}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Proyectos asignados</label>
          <div className="flex flex-wrap gap-3">
            {proyectos.map((p) => (
              <label key={p.id} className="flex items-center gap-2 rounded-md px-3 py-2" style={{ background: "var(--field-bg)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                <input type="checkbox" name="proyectoIds" value={p.id} />
                {p.nombre}
              </label>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-md px-5 h-10 font-semibold disabled:opacity-60 w-fit"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {ok ? <><CheckCircle2 size={16} /> Invitado</> : pending ? "Enviando…" : "Enviar invitación"}
        </button>
      </form>
    </details>
  );
}
