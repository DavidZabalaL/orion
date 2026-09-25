"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, Plus, Pencil, Trash2, X, ArrowDownToLine, Users } from "lucide-react";
import {
  crearInsumo,
  actualizarInsumo,
  eliminarInsumo,
  registrarEntradaInsumo,
  registrarConsumoMasivo,
} from "@/app/(app)/inventario-insumos/actions";

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

type AccionExpand = { tipo: "entrada" | "consumo"; id: string } | null;

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

const HOY = new Date().toISOString().slice(0, 10);

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

function EntradaInsumoForm({ insumo, onDone }: { insumo: InsumoRow; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  if (exito) {
    return (
      <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "var(--field-bg)" }}>
        <CheckCircle size={16} color="#22c55e" />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>
          Entrada registrada. Las existencias han sido actualizadas.
        </span>
        <button type="button" onClick={onDone} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", marginLeft: "auto" }}>
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: "var(--panel-bg)", border: "1px solid var(--field-border)" }}
      action={(fd) => {
        fd.set("insumoId", insumo.id);
        start(async () => {
          const res = await registrarEntradaInsumo(fd);
          if (!res.ok) { setError(res.error ?? "Error al registrar."); return; }
          setExito(true);
          router.refresh();
        });
      }}
    >
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
        Registrar entrada — {insumo.nombre}
        <span style={{ fontWeight: 400, color: "var(--sidebar-text)", marginLeft: 8 }}>
          Existencias actuales: {Number(insumo.existencias).toLocaleString("es-MX")} {insumo.unidad}
        </span>
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label style={labelStyle}>Fecha</label>
          <input name="fecha" type="date" defaultValue={HOY} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Cantidad ({insumo.unidad}) *</label>
          <input name="cantidad" type="number" step="0.01" min="0.01" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <label style={labelStyle}>Proveedor</label>
          <input name="proveedor" style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Costo unitario (MXN)</label>
          <input name="costoUnitario" type="number" step="0.01" min="0" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div className="col-span-2 md:col-span-4">
          <label style={labelStyle}>Nota</label>
          <input name="nota" style={fieldStyle} placeholder="Opcional — referencia de compra, orden, etc." />
        </div>
      </div>
      {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="rounded-md px-4 h-9 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
          {pending ? "Guardando…" : "Registrar entrada"}
        </button>
        <button type="button" onClick={onDone} className="rounded-md px-4 h-9" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ConsumoMasivoForm({
  insumo,
  unidades,
  onDone,
}: {
  insumo: InsumoRow;
  unidades: { numeroEconomico: string; proyectoId: string | null }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [exito, setExito] = useState<number | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [cantidadPorUnidad, setCantidadPorUnidad] = useState("");

  const unidadesDelProyecto = useMemo(
    () => unidades.filter((u) => u.proyectoId === insumo.proyectoId),
    [unidades, insumo.proyectoId]
  );

  const n = seleccionadas.size;
  const cantidad = parseFloat(cantidadPorUnidad) || 0;
  const totalNecesario = n * cantidad;
  const existencias = Number(insumo.existencias);
  const stockSuficiente = existencias >= totalNecesario && totalNecesario > 0;

  function toggleUnidad(ne: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(ne)) next.delete(ne); else next.add(ne);
      return next;
    });
  }
  function toggleTodas() {
    const nes = unidadesDelProyecto.map((u) => u.numeroEconomico);
    setSeleccionadas(seleccionadas.size === nes.length ? new Set() : new Set(nes));
  }

  if (exito !== null) {
    return (
      <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "var(--field-bg)" }}>
        <CheckCircle size={16} color="#22c55e" />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>
          Consumo registrado en {exito} unidad{exito !== 1 ? "es" : ""}. Existencias actualizadas.
        </span>
        <button type="button" onClick={onDone} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", marginLeft: "auto" }}>
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: "var(--panel-bg)", border: "1px solid var(--field-border)" }}
      action={(fd) => {
        if (n === 0) { setError("Selecciona al menos una unidad."); return; }
        seleccionadas.forEach((ne) => fd.append("numerosEconomicos", ne));
        fd.set("insumoId", insumo.id);
        setError("");
        start(async () => {
          const res = await registrarConsumoMasivo(fd);
          if (!res.ok) { setError(res.error ?? "Error al registrar."); return; }
          setExito(res.creados ?? 0);
          router.refresh();
        });
      }}
    >
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
        Consumo masivo — {insumo.nombre}
        <span style={{ fontWeight: 400, color: "var(--sidebar-text)", marginLeft: 8 }}>
          Existencias: {existencias.toLocaleString("es-MX")} {insumo.unidad}
        </span>
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label style={labelStyle}>Unidades ({unidadesDelProyecto.length} en proyecto)</label>
            {unidadesDelProyecto.length > 0 && (
              <button type="button" onClick={toggleTodas} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-primary)", fontWeight: 600 }}>
                {seleccionadas.size === unidadesDelProyecto.length ? "Deseleccionar todas" : "Seleccionar todas"}
              </button>
            )}
          </div>
          <div
            className="rounded-lg p-2 grid grid-cols-2 gap-1 overflow-y-auto"
            style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", maxHeight: 160 }}
          >
            {unidadesDelProyecto.length === 0 ? (
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Sin unidades.</span>
            ) : unidadesDelProyecto.map((u) => (
              <label
                key={u.numeroEconomico}
                className="flex items-center gap-1.5 cursor-pointer py-0.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-sm)",
                  color: seleccionadas.has(u.numeroEconomico) ? "var(--sidebar-text-active)" : "var(--field-text)",
                  fontWeight: seleccionadas.has(u.numeroEconomico) ? 600 : 400,
                }}
              >
                <input type="checkbox" checked={seleccionadas.has(u.numeroEconomico)} onChange={() => toggleUnidad(u.numeroEconomico)} />
                {u.numeroEconomico}
              </label>
            ))}
          </div>
          {n > 0 && (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", marginTop: 4 }}>
              {n} unidad{n !== 1 ? "es" : ""} seleccionada{n !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label style={labelStyle}>Cantidad por unidad ({insumo.unidad}) *</label>
            <input
              name="cantidadPorUnidad"
              type="number"
              step="0.01"
              min="0.01"
              required
              style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }}
              value={cantidadPorUnidad}
              onChange={(e) => setCantidadPorUnidad(e.target.value)}
            />
          </div>
          {n > 0 && cantidad > 0 && (
            <div
              className="rounded-md px-3 py-2"
              style={{ background: stockSuficiente ? "var(--field-bg)" : "var(--status-escena-bg, #fef2f2)", border: "1px solid var(--field-border)" }}
            >
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: stockSuficiente ? "var(--sidebar-text)" : "var(--color-status-escena)" }}>
                Total a descontar: <strong>{totalNecesario.toLocaleString("es-MX")} {insumo.unidad}</strong>
                {!stockSuficiente && " — stock insuficiente"}
              </span>
            </div>
          )}
          <div>
            <label style={labelStyle}>Fecha</label>
            <input name="fecha" type="date" defaultValue={HOY} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Nota</label>
            <input name="nota" style={fieldStyle} placeholder="Opcional" />
          </div>
        </div>
      </div>

      {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending || n === 0 || !cantidadPorUnidad || !stockSuficiente}
          className="rounded-md px-4 h-9 font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
        >
          {pending ? "Guardando…" : `Registrar consumo en ${n > 0 ? n : "?"} unidad${n !== 1 ? "es" : ""}`}
        </button>
        <button type="button" onClick={onDone} className="rounded-md px-4 h-9" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function InventarioTabla({
  insumos,
  proyectos,
  unidades = [],
}: {
  insumos: InsumoRow[];
  proyectos: { id: string; nombre: string }[];
  unidades?: { numeroEconomico: string; proyectoId: string | null }[];
}) {
  const [proyectoFiltro, setProyectoFiltro] = useState("");
  const [mostrando, setMostrando] = useState<"nuevo" | string | null>(null);
  const [accion, setAccion] = useState<AccionExpand>(null);
  const [pending, start] = useTransition();

  const filtrados = useMemo(() => {
    if (!proyectoFiltro) return insumos;
    return insumos.filter((i) => i.proyectoId === proyectoFiltro);
  }, [insumos, proyectoFiltro]);

  function abrirAccion(tipo: "entrada" | "consumo", id: string) {
    if (mostrando === id) setMostrando(null);
    setAccion((a) => a?.tipo === tipo && a?.id === id ? null : { tipo, id });
  }

  function abrirEditar(id: string) {
    if (accion?.id === id) setAccion(null);
    setMostrando((m) => m === id ? null : id);
  }

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
        <table className="w-full min-w-[820px] border-collapse">
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
              const expandido = mostrando === insumo.id || accion?.id === insumo.id;
              return (
                <>
                  <tr key={insumo.id} style={{ borderBottom: expandido ? "none" : "1px solid var(--field-border)" }}>
                    <td className="px-4 py-3">
                      {bajo
                        ? <AlertTriangle size={16} color="var(--color-status-escena, #ef4444)" />
                        : <CheckCircle size={16} color="#22c55e" />
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => abrirEditar(insumo.id)}
                          className="flex items-center gap-1 rounded-md px-2 py-1"
                          style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}
                          title="Editar"
                        >
                          <Pencil size={12} /> Editar
                        </button>
                        <button
                          onClick={() => abrirAccion("entrada", insumo.id)}
                          className="flex items-center gap-1 rounded-md px-2 py-1"
                          style={{ background: accion?.tipo === "entrada" && accion?.id === insumo.id ? "var(--color-primary)" : "var(--chip)", color: accion?.tipo === "entrada" && accion?.id === insumo.id ? "#fff" : "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}
                          title="Registrar entrada de stock"
                        >
                          <ArrowDownToLine size={12} /> Entrada
                        </button>
                        <button
                          onClick={() => abrirAccion("consumo", insumo.id)}
                          className="flex items-center gap-1 rounded-md px-2 py-1"
                          style={{ background: accion?.tipo === "consumo" && accion?.id === insumo.id ? "var(--color-primary)" : "var(--chip)", color: accion?.tipo === "consumo" && accion?.id === insumo.id ? "#fff" : "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}
                          title="Consumo masivo en múltiples unidades"
                        >
                          <Users size={12} /> Consumo masivo
                        </button>
                        <form action={(fd) => { fd.set("id", insumo.id); start(() => { eliminarInsumo(fd); }); }}>
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
                  {accion?.id === insumo.id && (
                    <tr key={`${insumo.id}-accion`} style={{ borderBottom: "1px solid var(--field-border)" }}>
                      <td colSpan={7} className="px-4 py-4" style={{ background: "var(--field-bg)" }}>
                        {accion.tipo === "entrada" ? (
                          <EntradaInsumoForm insumo={insumo} onDone={() => setAccion(null)} />
                        ) : (
                          <ConsumoMasivoForm insumo={insumo} unidades={unidades} onDone={() => setAccion(null)} />
                        )}
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
