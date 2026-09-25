"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { crearGastoProrrateado } from "@/app/(app)/mantenimiento/actions";
import { CATEGORIA_APLICA_A_UNIDAD, CATEGORIA_GASTO_LABEL, ESTATUS_GASTO_LABEL } from "@/lib/categorias-gasto";

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

export function GastoProrrateadoForm({
  unidades,
  proyectos,
}: {
  unidades: { numeroEconomico: string; proyectoId: string | null }[];
  proyectos: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<number | null>(null);
  const [proyectoId, setProyectoId] = useState(proyectos.length === 1 ? proyectos[0].id : "");
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [costoTotal, setCostoTotal] = useState("");

  const unidadesDelProyecto = useMemo(
    () => (proyectoId ? unidades.filter((u) => u.proyectoId === proyectoId) : []),
    [unidades, proyectoId]
  );

  const n = seleccionadas.size;
  const costoNum = parseFloat(costoTotal) || 0;
  const costoPorUnidad = n > 0 && costoNum > 0 ? costoNum / n : null;

  const categoriasAplicables = Object.entries(CATEGORIA_GASTO_LABEL).filter(
    ([k]) => (CATEGORIA_APLICA_A_UNIDAD as Record<string, boolean>)[k] !== false
  );

  function toggleUnidad(ne: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(ne)) next.delete(ne);
      else next.add(ne);
      return next;
    });
  }

  function toggleTodas() {
    const nes = unidadesDelProyecto.map((u) => u.numeroEconomico);
    setSeleccionadas(seleccionadas.size === nes.length ? new Set() : new Set(nes));
  }

  function handleProyectoChange(id: string) {
    setProyectoId(id);
    setSeleccionadas(new Set());
  }

  if (exito !== null) {
    return (
      <div className="rounded-xl p-8 text-center flex flex-col items-center gap-4" style={{ background: "var(--field-bg)" }}>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Gasto prorrateado en {exito} unidades
        </p>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Se crearon {exito} registros en el módulo de Mantenimiento y Gastos.
        </p>
        <button
          type="button"
          onClick={() => router.push("/mantenimiento")}
          className="rounded-md px-5 h-10 font-semibold"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          Ver mantenimiento
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      action={(formData) => {
        if (n === 0) { setError("Selecciona al menos una unidad."); return; }
        seleccionadas.forEach((ne) => formData.append("numerosEconomicos", ne));
        setError(null);
        startTransition(async () => {
          const res = await crearGastoProrrateado(formData);
          if (!res.ok) { setError(res.error ?? "No se pudo guardar."); return; }
          setExito(res.creados ?? 0);
        });
      }}
    >
      {proyectos.length > 1 && (
        <div>
          <label style={labelStyle}>Proyecto *</label>
          <select
            value={proyectoId}
            onChange={(e) => handleProyectoChange(e.target.value)}
            style={fieldStyle}
            required
          >
            <option value="">Seleccionar proyecto…</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
      )}

      {proyectos.length === 1 && (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Proyecto: <strong style={{ color: "var(--sidebar-text-active)" }}>{proyectos[0].nombre}</strong>
        </p>
      )}

      {proyectoId && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label style={labelStyle}>
              Unidades a cargar {unidadesDelProyecto.length > 0 ? `(${unidadesDelProyecto.length} disponibles)` : ""}
            </label>
            {unidadesDelProyecto.length > 0 && (
              <button
                type="button"
                onClick={toggleTodas}
                style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-primary)", fontWeight: 600 }}
              >
                {seleccionadas.size === unidadesDelProyecto.length ? "Deseleccionar todas" : "Seleccionar todas"}
              </button>
            )}
          </div>
          <div
            className="rounded-xl p-3 grid grid-cols-2 gap-2 md:grid-cols-4 overflow-y-auto"
            style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", maxHeight: 240 }}
          >
            {unidadesDelProyecto.length === 0 ? (
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                Sin unidades en este proyecto.
              </span>
            ) : (
              unidadesDelProyecto.map((u) => (
                <label
                  key={u.numeroEconomico}
                  className="flex items-center gap-2 cursor-pointer py-1"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-sm)",
                    color: seleccionadas.has(u.numeroEconomico) ? "var(--sidebar-text-active)" : "var(--field-text)",
                    fontWeight: seleccionadas.has(u.numeroEconomico) ? 600 : 400,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={seleccionadas.has(u.numeroEconomico)}
                    onChange={() => toggleUnidad(u.numeroEconomico)}
                  />
                  {u.numeroEconomico}
                </label>
              ))
            )}
          </div>
          {n > 0 && (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", marginTop: 6 }}>
              {n} unidad{n !== 1 ? "es" : ""} seleccionada{n !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label style={labelStyle}>Categoría *</label>
          <select name="categoria" required style={fieldStyle} defaultValue="">
            <option value="" disabled>Seleccionar…</option>
            {categoriasAplicables.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Fecha *</label>
          <input name="fecha" type="date" required style={fieldStyle} />
        </div>
        <div className="md:col-span-2">
          <label style={labelStyle}>Descripción</label>
          <input name="descripcion" style={fieldStyle} />
        </div>
        <div className="md:col-span-2">
          <label style={labelStyle}>Notas adicionales</label>
          <textarea
            name="notas"
            rows={2}
            style={{ ...fieldStyle, height: "auto", padding: "8px 12px", resize: "vertical" }}
          />
        </div>
        <div>
          <label style={labelStyle}>Costo total (MXN) *</label>
          <input
            name="costoTotal"
            type="number"
            step="0.01"
            min="0.01"
            required
            style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }}
            value={costoTotal}
            onChange={(e) => setCostoTotal(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          {costoPorUnidad !== null ? (
            <div
              className="rounded-md px-4 py-2 w-full"
              style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)" }}
            >
              <span style={{ ...labelStyle, marginBottom: 2 }}>Costo por unidad</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
                ${costoPorUnidad.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ) : (
            <div
              className="rounded-md px-4 py-2 w-full"
              style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)" }}
            >
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                Selecciona unidades e ingresa el costo total para ver el costo por unidad.
              </span>
            </div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Proveedor</label>
          <input name="proveedor" style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>SC (Solicitud de compra)</label>
          <input name="sc" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <label style={labelStyle}>ODC (Orden de compra)</label>
          <input name="odc" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <label style={labelStyle}>Estatus</label>
          <select name="estatus" style={fieldStyle} defaultValue="PROGRAMADO">
            {Object.entries(ESTATUS_GASTO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Fecha ingreso taller</label>
          <input name="fechaIngresoTaller" type="date" style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Fecha estimada de salida</label>
          <input name="fechaEstimadaSalida" type="date" style={fieldStyle} />
        </div>
      </div>

      {error && (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || n === 0 || !costoTotal}
          className="rounded-md px-5 h-10 font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {pending ? "Guardando…" : n > 0 ? `Crear ${n} registro${n !== 1 ? "s" : ""}` : "Selecciona unidades"}
        </button>
      </div>
    </form>
  );
}
