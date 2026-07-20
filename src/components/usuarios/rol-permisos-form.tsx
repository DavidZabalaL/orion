"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { actualizarPermisosRol } from "@/app/(app)/usuarios/actions";

type Permiso = "ninguno" | "ver" | "editar" | "aprobar";

function nivelDe(p?: { ver?: boolean; editar?: boolean; aprobar?: boolean }): Permiso {
  if (!p) return "ninguno";
  if (p.aprobar) return "aprobar";
  if (p.editar) return "editar";
  if (p.ver) return "ver";
  return "ninguno";
}

const NIVELES: { value: Permiso; label: string; color: string; bg: string }[] = [
  { value: "ninguno", label: "Ninguno", color: "var(--sidebar-text)", bg: "var(--chip)" },
  { value: "ver", label: "Ver", color: "var(--color-status-asignado)", bg: "var(--status-asignado-bg)" },
  { value: "editar", label: "Editar", color: "var(--color-status-revision)", bg: "var(--status-revision-bg)" },
  { value: "aprobar", label: "Aprobar", color: "var(--color-status-cerrado)", bg: "var(--status-cerrado-bg)" },
];

export function RolPermisosForm({
  rol,
  modulos,
}: {
  rol: { id: string; nombre: string; permisos: Record<string, { ver?: boolean; editar?: boolean; aprobar?: boolean }> };
  modulos: { id: string; label: string }[];
}) {
  const esGlobal = "*" in rol.permisos;
  const [niveles, setNiveles] = useState<Record<string, Permiso>>(
    Object.fromEntries(modulos.map((m) => [m.id, esGlobal ? "aprobar" : nivelDe(rol.permisos[m.id])]))
  );
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);

  if (esGlobal) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{rol.nombre}</h3>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Acceso global a todos los módulos (rol administrativo).</p>
      </div>
    );
  }

  return (
    <form
      className="rounded-xl p-5"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      action={(formData) => {
        startTransition(async () => {
          await actualizarPermisosRol(formData);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        });
      }}
    >
      <input type="hidden" name="rolId" value={rol.id} />
      <input type="hidden" name="modulos" value={modulos.map((m) => m.id).join(",")} />

      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{rol.nombre}</h3>
        <button type="submit" disabled={pending} className="flex items-center gap-2 rounded-md px-3 h-8 disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}>
          {ok ? <><CheckCircle2 size={14} /> Guardado</> : pending ? "Guardando…" : "Guardar"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {modulos.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 rounded-md px-3 py-2" style={{ background: "var(--field-bg)" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{m.id} · {m.label}</span>
            <input type="hidden" name={`permiso_${m.id}`} value={niveles[m.id]} />
            <div className="flex gap-1">
              {NIVELES.map((n) => (
                <button
                  key={n.value}
                  type="button"
                  onClick={() => setNiveles((s) => ({ ...s, [m.id]: n.value }))}
                  className="rounded-full px-2.5 py-1"
                  style={{
                    fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600,
                    background: niveles[m.id] === n.value ? n.bg : "transparent",
                    color: niveles[m.id] === n.value ? n.color : "var(--sidebar-text)",
                  }}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </form>
  );
}
