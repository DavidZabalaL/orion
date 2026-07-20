"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { actualizarModulosProyecto } from "@/app/(app)/usuarios/actions";

export function ProyectoModulosForm({
  proyecto,
  modulos,
}: {
  proyecto: { id: string; nombre: string; modulosActivos: string[] };
  modulos: { id: string; label: string }[];
}) {
  const [activos, setActivos] = useState<Set<string>>(new Set(proyecto.modulosActivos));
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);

  return (
    <form
      className="rounded-xl p-5"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      action={(formData) => {
        startTransition(async () => {
          await actualizarModulosProyecto(formData);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        });
      }}
    >
      <input type="hidden" name="proyectoId" value={proyecto.id} />

      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{proyecto.nombre}</h3>
        <button type="submit" disabled={pending} className="flex items-center gap-2 rounded-md px-3 h-8 disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}>
          {ok ? <><CheckCircle2 size={14} /> Guardado</> : pending ? "Guardando…" : "Guardar"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {modulos.map((m) => {
          const activo = activos.has(m.id);
          return (
            <label
              key={m.id}
              className="flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer"
              style={{ background: activo ? "var(--status-cerrado-bg)" : "var(--field-bg)", color: activo ? "var(--color-status-cerrado)" : "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
            >
              <input
                type="checkbox"
                name="modulosActivos"
                value={m.id}
                checked={activo}
                onChange={() => setActivos((s) => {
                  const next = new Set(s);
                  if (next.has(m.id)) next.delete(m.id); else next.add(m.id);
                  return next;
                })}
                className="hidden"
              />
              {m.id} · {m.label}
            </label>
          );
        })}
      </div>
    </form>
  );
}
