"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
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

type Estado =
  | { tipo: "idle" }
  | { tipo: "ok" }
  | { tipo: "ok-sin-correo"; mensaje?: string };

export function InvitarUsuarioForm({
  roles,
  proyectos,
}: {
  roles: { id: string; nombre: string }[];
  proyectos: { id: string; nombre: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<Estado>({ tipo: "idle" });
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <details className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <summary className="cursor-pointer" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
        Invitar usuario
      </summary>
      <form
        ref={formRef}
        className="flex flex-col gap-4 mt-4"
        action={(formData) => {
          startTransition(async () => {
            const res = await invitarUsuario(formData);
            if (res.correoEnviado) {
              setEstado({ tipo: "ok" });
              formRef.current?.reset();
            } else {
              setEstado({ tipo: "ok-sin-correo", mensaje: res.errorCorreo });
            }
            setTimeout(() => setEstado({ tipo: "idle" }), 6000);
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

        {estado.tipo === "ok-sin-correo" && (
          <div className="flex items-start gap-2 rounded-md px-3 py-2.5" style={{ background: "var(--status-revision-bg)" }}>
            <TriangleAlert size={15} color="var(--color-status-revision)" className="shrink-0 mt-0.5" />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-revision)" }}>
              El usuario se creó, pero no se pudo enviar el correo de invitación{estado.mensaje ? `: ${estado.mensaje}` : "."} Comparte el enlace de acceso manualmente.
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-md px-5 h-10 font-semibold disabled:opacity-60 w-fit"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {estado.tipo === "ok" ? <><CheckCircle2 size={16} /> Invitación enviada</> : pending ? "Enviando…" : "Enviar invitación"}
        </button>
      </form>
    </details>
  );
}
