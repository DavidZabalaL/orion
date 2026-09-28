"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Archive, RotateCcw, Check, X } from "lucide-react";
import { crearDepartamento, renombrarDepartamento, alternarActivoDepartamento } from "@/app/(app)/usuarios/departamentos/actions";

type Departamento = { id: string; nombre: string; activo: boolean; gastosLigados: number };

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-sm)",
  height: "var(--h-md)",
  borderRadius: "var(--radius-md)",
  padding: "0 10px",
};

export function DepartamentosLista({ departamentos: iniciales }: { departamentos: Departamento[] }) {
  const [departamentos, setDepartamentos] = useState(iniciales);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function agregar() {
    const nombre = nombreNuevo.trim();
    if (!nombre) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("nombre", nombre);
      const res = await crearDepartamento(fd);
      if (!res.ok || !res.id) { setError(res.error ?? "No se pudo crear."); return; }
      setDepartamentos((prev) => [...prev, { id: res.id!, nombre, activo: true, gastosLigados: 0 }]);
      setNombreNuevo("");
    });
  }

  function guardarEdicion(id: string) {
    const nombre = nombreEditado.trim();
    if (!nombre) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("nombre", nombre);
      const res = await renombrarDepartamento(fd);
      if (!res.ok) { setError(res.error ?? "No se pudo renombrar."); return; }
      setDepartamentos((prev) => prev.map((d) => (d.id === id ? { ...d, nombre } : d)));
      setEditandoId(null);
    });
  }

  function alternarActivo(id: string, activoActual: boolean) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("activo", String(!activoActual));
      const res = await alternarActivoDepartamento(fd);
      if (!res.ok) { setError(res.error ?? "No se pudo actualizar."); return; }
      setDepartamentos((prev) => prev.map((d) => (d.id === id ? { ...d, activo: !activoActual } : d)));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") agregar(); }}
          placeholder="Nombre del nuevo departamento…"
          className="flex-1 rounded-md"
          style={fieldStyle}
        />
        <button
          type="button"
          onClick={agregar}
          disabled={pending || !nombreNuevo.trim()}
          className="flex items-center gap-1.5 rounded-md px-4 font-semibold disabled:opacity-50"
          style={{ height: "var(--h-md)", background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
        >
          <Plus size={15} /> Agregar
        </button>
      </div>

      {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}

      <div className="flex flex-col gap-2 rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        {departamentos.length === 0 && (
          <p className="p-4" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
            Sin departamentos capturados.
          </p>
        )}
        {departamentos.map((d) => (
          <div key={d.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ borderColor: "var(--field-border)", opacity: d.activo ? 1 : 0.55 }}>
            {editandoId === d.id ? (
              <>
                <input
                  value={nombreEditado}
                  onChange={(e) => setNombreEditado(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") guardarEdicion(d.id); }}
                  className="flex-1 rounded-md"
                  style={fieldStyle}
                  autoFocus
                />
                <button type="button" onClick={() => guardarEdicion(d.id)} disabled={pending} style={{ color: "#16a34a" }}><Check size={17} /></button>
                <button type="button" onClick={() => setEditandoId(null)} style={{ color: "var(--sidebar-text)" }}><X size={17} /></button>
              </>
            ) : (
              <>
                <span className="flex-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                  {d.nombre}
                </span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                  {d.activo ? "Activo" : "Inactivo"} · {d.gastosLigados} gasto(s)
                </span>
                <button type="button" onClick={() => { setEditandoId(d.id); setNombreEditado(d.nombre); }} title="Renombrar" style={{ color: "var(--sidebar-text)" }}>
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => alternarActivo(d.id, d.activo)}
                  disabled={pending}
                  title={d.activo ? "Quitar (los gastos ya asignados no se ven afectados)" : "Reactivar"}
                  style={{ color: d.activo ? "var(--color-status-escena)" : "#16a34a" }}
                >
                  {d.activo ? <Archive size={15} /> : <RotateCcw size={15} />}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
