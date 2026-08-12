"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { alternarEstatusUsuario, actualizarUsuario, eliminarUsuario } from "@/app/(app)/usuarios/actions";

type Usuario = {
  id: string;
  nombre: string;
  correo: string;
  rolId: string;
  rol: string;
  proyectoIds: string[];
  proyectos: string[];
  estatus: string;
};

const ESTATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVO: { label: "Activo", color: "var(--color-status-cerrado)", bg: "var(--status-cerrado-bg)" },
  INVITADO: { label: "Invitado", color: "var(--color-status-revision)", bg: "var(--status-revision-bg)" },
  DESACTIVADO: { label: "Desactivado", color: "var(--sidebar-text)", bg: "var(--chip)" },
};

const fieldStyle: React.CSSProperties = {
  background: "var(--panel-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-sm)",
  height: "var(--h-sm)",
  borderRadius: "var(--radius-md)",
  padding: "0 10px",
  width: "100%",
};

export function UsuarioRow({
  usuario: u,
  roles,
  proyectosDisponibles,
}: {
  usuario: Usuario;
  roles: { id: string; nombre: string }[];
  proyectosDisponibles: { id: string; nombre: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [modo, setModo] = useState<"ver" | "editar" | "confirmar-eliminar">("ver");
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
  const style = ESTATUS_STYLE[u.estatus];

  function handleEliminar(formData: FormData) {
    startTransition(async () => {
      const res = await eliminarUsuario(formData);
      if (!res.ok) {
        setErrorEliminar(res.error ?? "No se pudo eliminar.");
        setModo("ver");
      }
    });
  }

  return (
    <div className="rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-[160px]">
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{u.nombre}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{u.correo}</div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
          <span>{u.rol}</span>
          <span style={{ color: "var(--sidebar-text)" }}>{u.proyectos.length ? u.proyectos.join(", ") : "Sin proyectos"}</span>
        </div>

        <Badge label={style.label} color={style.color} bg={style.bg} />

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <button
            onClick={() => setModo(modo === "editar" ? "ver" : "editar")}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5"
            style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
          >
            <Pencil size={12} /> Editar
          </button>
          <form action={(fd) => startTransition(() => alternarEstatusUsuario(fd))}>
            <input type="hidden" name="id" value={u.id} />
            <input type="hidden" name="estatus" value={u.estatus} />
            <button type="submit" disabled={pending} className="rounded-md px-2.5 py-1.5 disabled:opacity-60" style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
              {u.estatus === "DESACTIVADO" ? "Reactivar" : "Desactivar"}
            </button>
          </form>
          <button
            onClick={() => setModo("confirmar-eliminar")}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5"
            style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
          >
            <Trash2 size={12} /> Eliminar
          </button>
        </div>
      </div>

      {errorEliminar && (
        <div className="flex items-start gap-2 rounded-md px-3 py-2.5 mt-3" style={{ background: "var(--status-escena-bg)" }}>
          <TriangleAlert size={15} color="var(--color-status-escena)" className="shrink-0 mt-0.5" />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{errorEliminar}</span>
          <button onClick={() => setErrorEliminar(null)} className="ml-auto shrink-0 rounded-md px-2 py-0.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>
            Cerrar
          </button>
        </div>
      )}

      {modo === "confirmar-eliminar" && (
        <div className="rounded-md px-3 py-3 mt-3 flex flex-col gap-3" style={{ background: "var(--field-bg)" }}>
          <div className="flex items-start gap-2">
            <TriangleAlert size={16} color="var(--color-status-escena)" className="shrink-0 mt-0.5" />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
              ¿Seguro que quieres eliminar a <strong>{u.nombre}</strong>? Esta acción no se puede deshacer.
            </span>
          </div>
          <form action={handleEliminar} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={u.id} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md px-3 h-8 font-semibold disabled:opacity-60"
              style={{ background: "var(--color-status-escena)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
            >
              {pending ? "Eliminando…" : "Sí, eliminar"}
            </button>
            <button
              type="button"
              onClick={() => setModo("ver")}
              className="rounded-md px-3 h-8"
              style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {modo === "editar" && (
        <form
          action={(fd) => {
            startTransition(async () => {
              await actualizarUsuario(fd);
              setModo("ver");
            });
          }}
          className="rounded-md p-3 mt-3 flex flex-col gap-3"
          style={{ background: "var(--field-bg)" }}
        >
          <input type="hidden" name="id" value={u.id} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block mb-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Nombre</label>
              <input name="nombre" defaultValue={u.nombre} required style={fieldStyle} />
            </div>
            <div>
              <label className="block mb-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Rol</label>
              <select name="rolId" defaultValue={u.rolId} style={fieldStyle}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block mb-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Proyectos asignados</label>
            <div className="flex flex-wrap gap-2">
              {proyectosDisponibles.map((p) => (
                <label key={p.id} className="flex items-center gap-1.5 rounded-md px-2 py-1" style={{ background: "var(--panel-bg)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--field-text)" }}>
                  <input type="checkbox" name="proyectoIds" value={p.id} defaultChecked={u.proyectoIds.includes(p.id)} />
                  {p.nombre}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={pending} className="rounded-md px-3 h-8 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" onClick={() => setModo("ver")} className="rounded-md px-3 h-8" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
