"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { crearRol } from "@/app/(app)/usuarios/actions";
import { CampoAyuda } from "@/components/ui/campo-ayuda";

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

type Estado = { tipo: "idle" } | { tipo: "ok" } | { tipo: "error"; mensaje: string };

export function CrearRolForm({ roles }: { roles: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<Estado>({ tipo: "idle" });
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <details className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <summary className="cursor-pointer" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
        Crear rol
      </summary>
      <form
        ref={formRef}
        className="flex flex-col gap-4 mt-4"
        action={(formData) => {
          startTransition(async () => {
            const res = await crearRol(formData);
            if (res.id) {
              setEstado({ tipo: "ok" });
              formRef.current?.reset();
              router.refresh();
            } else {
              setEstado({ tipo: "error", mensaje: res.error ?? "No se pudo crear el rol." });
            }
            setTimeout(() => setEstado({ tipo: "idle" }), 6000);
          });
        }}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <CampoAyuda style={labelStyle} texto="Nombre del rol tal como se mostrará al invitar usuarios (ej. 'Operador Senior').">Nombre *</CampoAyuda>
            <input name="nombre" required style={fieldStyle} />
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Copia los permisos de un rol existente como punto de partida — puedes ajustarlos después en este mismo panel.">Basar permisos en (opcional)</CampoAyuda>
            <select name="basadoEnRolId" style={fieldStyle}>
              <option value="">Sin permisos (desde cero)</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {estado.tipo === "error" && (
          <div className="flex items-start gap-2 rounded-md px-3 py-2.5" style={{ background: "var(--status-revision-bg)" }}>
            <TriangleAlert size={15} color="var(--color-status-revision)" className="shrink-0 mt-0.5" />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-revision)" }}>{estado.mensaje}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-md px-5 h-10 font-semibold disabled:opacity-60 w-fit"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {estado.tipo === "ok" ? <><CheckCircle2 size={16} /> Rol creado</> : pending ? "Creando…" : "Crear rol"}
        </button>
      </form>
    </details>
  );
}
