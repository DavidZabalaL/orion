"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, TriangleAlert } from "lucide-react";
import { actualizarProyecto, eliminarProyecto } from "@/app/(app)/proyectos/actions";

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

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 4,
};

export type ProyectoParaEditar = {
  id: string;
  nombre: string;
  estadoRepublica: string;
  fechaInicio: string; // ISO yyyy-mm-dd
  estatus: string;
};

export function ProyectoAcciones({ proyecto }: { proyecto: ProyectoParaEditar }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modo, setModo] = useState<"ver" | "editar" | "confirmar-eliminar">("ver");
  const [error, setError] = useState<string | null>(null);

  function handleEditar(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await actualizarProyecto(formData);
      if (res.ok) {
        setModo("ver");
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo guardar.");
      }
    });
  }

  function handleEliminar(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await eliminarProyecto(formData);
      if (res.ok) {
        router.push("/proyectos");
      } else {
        setError(res.error ?? "No se pudo eliminar.");
        setModo("ver");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setModo(modo === "editar" ? "ver" : "editar")}
          className="flex items-center gap-1.5 rounded-md px-3 h-9"
          style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
        >
          <Pencil size={13} /> Editar
        </button>
        <button
          onClick={() => setModo("confirmar-eliminar")}
          className="flex items-center gap-1.5 rounded-md px-3 h-9"
          style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
        >
          <Trash2 size={13} /> Eliminar
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md px-3 py-2.5" style={{ background: "var(--status-escena-bg)" }}>
          <TriangleAlert size={15} color="var(--color-status-escena)" className="shrink-0 mt-0.5" />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto shrink-0 rounded-md px-2 py-0.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>
            Cerrar
          </button>
        </div>
      )}

      {modo === "confirmar-eliminar" && (
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-start gap-2">
            <TriangleAlert size={16} color="var(--color-status-escena)" className="shrink-0 mt-0.5" />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
              ¿Seguro que quieres eliminar <strong>{proyecto.nombre}</strong>? Esta acción no se puede deshacer.
            </span>
          </div>
          <form action={handleEliminar} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={proyecto.id} />
            <button type="submit" disabled={pending} className="rounded-md px-3 h-8 font-semibold disabled:opacity-60" style={{ background: "var(--color-status-escena)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
              {pending ? "Eliminando…" : "Sí, eliminar"}
            </button>
            <button type="button" onClick={() => setModo("ver")} className="rounded-md px-3 h-8" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              Cancelar
            </button>
          </form>
        </div>
      )}

      {modo === "editar" && (
        <form action={handleEditar} className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <input type="hidden" name="id" value={proyecto.id} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label style={labelStyle}>Nombre</label>
              <input name="nombre" defaultValue={proyecto.nombre} required style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Estado de la república</label>
              <input name="estadoRepublica" defaultValue={proyecto.estadoRepublica} required style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Fecha de inicio</label>
              <input name="fechaInicio" type="date" defaultValue={proyecto.fechaInicio} required style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Estatus</label>
              <select name="estatus" defaultValue={proyecto.estatus} style={fieldStyle}>
                <option value="ACTIVO">Activo</option>
                <option value="CERRADO">Cerrado</option>
              </select>
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
