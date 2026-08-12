"use client";

import { useState, useMemo, useTransition } from "react";
import { AlertTriangle, CheckCircle, Plus, Pencil, Trash2, X } from "lucide-react";
import { crearInsumo, actualizarInsumo, eliminarInsumo } from "@/app/(app)/inventario-insumos/actions";

export type InsumoRow = {
  id: string;
  nombre: string;
  categoria: string | null;
  unidad: string;
  existencias: string;
  minimoStock: string;
  proyectoId: string;
  proyectoNombre: string;
};

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-sm)",
  height: 36,
  width: "100%",
  borderRadius: "var(--radius-md)",
  padding: "0 10px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase" as const,
  display: "block",
  marginBottom: 4,
};

function InsumoForm({
  proyectos,
  inicial,
  onCancel,
}: {
  proyectos: { id: string; nombre: string }[];
  inicial?: InsumoRow;
  onCancel: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  async function onSubmit(fd: FormData) {
    setError("");
    const res = inicial ? await actualizarInsumo(fd) : await crearInsumo(fd);
    if (!res.ok) setError(res.error ?? "Error desconocido");
    else onCancel();
  }

  return (
    <form
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--field-border)" }}
      action={(fd) => start(() => onSubmit(fd))}
    >
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {!inicial && (
          <div>
            <label style={labelStyle}>Proyecto *</label>
            <select name="proyectoId" required style={fieldStyle}>
              <option value="">Seleccionar…</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={labelStyle}>Nombre del insumo *</label>
          <input name="nombre" required defaultValue={inicial?.nombre ?? ""} style={fieldStyle} placeholder="Ej. Aceite 15W-40" />
        </div>
        <div>
          <label style={labelStyle}>Categoría</label>
          <input name="categoria" defaultValue={inicial?.categoria ?? ""} style={fieldStyle} placeholder="Ej. Lubricantes" />
        </div>
        <div>
          <label style={labelStyle}>Unidad de medida</label>
          <select name="unidad" defaultValue={inicial?.unidad ?? "pza"} style={fieldStyle}>
            <option value="pza">pza</option>
            <option value="L">L (litros)</option>
            <option value="kg">kg</option>
            <option value="caja">caja</option>
            <option value="m">m (metros)</option>
            <option value="par">par</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Existencias actuales</label>
          <input name="existencias" type="number" step="0.01" min="0" defaultValue={inicial ? Number(inicial.existencias) : 0} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <label style={labelStyle}>Mínimo de stock</label>
          <input name="minimoStock" type="number" step="0.01" min="0" defaultValue={inicial ? Number(inicial.minimoStock) : 0} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
      </div>
      {error && <p style={{ color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="rounded-md px-4 h-9 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
          {pending ? "Guardando…" : inicial ? "Guardar cambios" : "Agregar insumo"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-4 h-9" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function InventarioTabla({
  insumos,
  proyectos,
}: {
  insumos: InsumoRow[];
  proyectos: { id: string; nombre: string }[];
}) {
  const [proyectoFiltro, setProyectoFiltro] = useState("");
  const [mostrando, setMostrando] = useState<"nuevo" | string | null>(null);
  const [pending, start] = useTransition();

  const filtrados = useMemo(() => {
    if (!proyectoFiltro) return insumos;
    return insumos.filter((i) => i.proyectoId === proyectoFiltro);
  }, [insumos, proyectoFiltro]);

  const selectStyle: React.CSSProperties = {
    background: "var(--field-bg)",
    border: "1px solid var(--field-border)",
    color: "var(--field-text)",
    fontFamily: "var(--font-ui)",
    fontSize: "var(--text-base)",
    height: "var(--h-md)",
    borderRadius: "var(--radius-md)",
    padding: "0 10px",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <select value={proyectoFiltro} onChange={(e) => setProyectoFiltro(e.target.value)} style={{ ...selectStyle, minWidth: 200 }}>
          <option value="">Todos los proyectos</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <button
          onClick={() => setMostrando((m) => m === "nuevo" ? null : "nuevo")}
          className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {mostrando === "nuevo" ? <X size={15} /> : <Plus size={15} />}
          {mostrando === "nuevo" ? "Cancelar" : "Agregar insumo"}
        </button>
      </div>

      {mostrando === "nuevo" && (
        <InsumoForm proyectos={proyectos} onCancel={() => setMostrando(null)} />
      )}

      <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
              {["Estado", "Proyecto", "Insumo", "Categoría", "Existencias", "Mínimo", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center" style={{ fontFamily: "var(--font-ui)", color: "var(--sidebar-text)" }}>Sin insumos registrados.</td></tr>
            ) : filtrados.map((insumo) => {
              const bajo = Number(insumo.existencias) < Number(insumo.minimoStock);
              return (
                <>
                  <tr key={insumo.id} style={{ borderBottom: mostrando === insumo.id ? "none" : "1px solid var(--field-border)" }}>
                    <td className="px-4 py-3">
                      {bajo
                        ? <AlertTriangle size={16} color="var(--color-status-escena, #ef4444)" title="Stock bajo mínimo" />
                        : <CheckCircle size={16} color="#22c55e" title="Stock suficiente" />
                      }
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{insumo.proyectoNombre}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{insumo.nombre}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{insumo.categoria ?? "—"}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: bajo ? "var(--color-status-escena, #ef4444)" : "var(--field-text)", fontWeight: bajo ? 700 : 400 }}>
                      {Number(insumo.existencias).toLocaleString("es-MX")} {insumo.unidad}
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                      {Number(insumo.minimoStock).toLocaleString("es-MX")} {insumo.unidad}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMostrando((m) => m === insumo.id ? null : insumo.id)}
                          className="flex items-center gap-1 rounded-md px-2 py-1"
                          style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}
                          title="Editar"
                        >
                          <Pencil size={12} /> Editar
                        </button>
                        <form action={(fd) => { fd.set("id", insumo.id); start(() => eliminarInsumo(fd)); }}>
                          <input type="hidden" name="id" value={insumo.id} />
                          <button
                            type="submit"
                            disabled={pending}
                            onClick={(e) => { if (!confirm(`¿Eliminar "${insumo.nombre}"?`)) e.preventDefault(); }}
                            className="flex items-center gap-1 rounded-md px-2 py-1 disabled:opacity-50"
                            style={{ background: "var(--chip)", color: "var(--color-status-escena, #ef4444)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}
                            title="Eliminar"
                          >
                            <Trash2 size={12} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                  {mostrando === insumo.id && (
                    <tr key={`${insumo.id}-edit`} style={{ borderBottom: "1px solid var(--field-border)" }}>
                      <td colSpan={7} className="px-4 py-4" style={{ background: "var(--field-bg)" }}>
                        <InsumoForm proyectos={proyectos} inicial={insumo} onCancel={() => setMostrando(null)} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtrados.filter((i) => Number(i.existencias) < Number(i.minimoStock)).length > 0 && (
        <div className="rounded-md px-4 py-3 flex items-center gap-2" style={{ background: "var(--status-escena-bg, #fef2f2)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena, #ef4444)" }}>
          <AlertTriangle size={16} />
          {filtrados.filter((i) => Number(i.existencias) < Number(i.minimoStock)).length} insumo(s) con stock por debajo del mínimo.
        </div>
      )}
    </div>
  );
}
