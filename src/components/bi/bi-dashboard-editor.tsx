"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Printer, Save, Trash2, X, TriangleAlert, CheckCircle2 } from "lucide-react";
import { WIDGETS_BI_DEFAULT, TAMANO_COLSPAN, type WidgetDashboardBI, type TamanoWidget } from "@/lib/bi/metadata";
import { BiCard } from "@/components/bi/bi-card";
import { BiAgregarWidget } from "@/components/bi/bi-agregar-widget";
import { guardarVistaDashboard, eliminarVistaDashboard } from "@/app/(app)/dashboards/actions";

export type VistaDashboard = { id: string; nombre: string; widgets: WidgetDashboardBI[] };

const TEMPORAL = "__temporal__";

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
};

export function BiDashboardEditor({ vistas, puedeEditar }: { vistas: VistaDashboard[]; puedeEditar: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const primeraVista = vistas[0] ?? null;
  const [vistaActivaId, setVistaActivaId] = useState<string>(primeraVista?.id ?? TEMPORAL);
  const [nombreVista, setNombreVista] = useState(primeraVista?.nombre ?? "Vista sugerida");
  const [widgets, setWidgets] = useState<WidgetDashboardBI[]>(primeraVista?.widgets ?? WIDGETS_BI_DEFAULT);
  const [editMode, setEditMode] = useState(false);
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  function cambiarVista(id: string) {
    setVistaActivaId(id);
    setEditMode(false);
    setMensaje(null);
    if (id === TEMPORAL) {
      setNombreVista("Vista sugerida");
      setWidgets(WIDGETS_BI_DEFAULT);
      return;
    }
    const v = vistas.find((v) => v.id === id);
    if (v) {
      setNombreVista(v.nombre);
      setWidgets(v.widgets);
    }
  }

  function handleGuardar(comoNueva: boolean) {
    setMensaje(null);
    startTransition(async () => {
      const res = await guardarVistaDashboard({
        id: comoNueva ? undefined : vistaActivaId !== TEMPORAL ? vistaActivaId : undefined,
        nombre: nombreVista,
        widgets,
      });
      if (res.ok) {
        setMensaje({ tipo: "ok", texto: "Vista guardada." });
        if (res.id) setVistaActivaId(res.id);
        router.refresh();
      } else {
        setMensaje({ tipo: "error", texto: res.error ?? "No se pudo guardar." });
      }
    });
  }

  function handleEliminar() {
    if (vistaActivaId === TEMPORAL) return;
    setMensaje(null);
    startTransition(async () => {
      const res = await eliminarVistaDashboard(vistaActivaId);
      if (res.ok) {
        router.refresh();
        cambiarVista(TEMPORAL);
      } else {
        setMensaje({ tipo: "error", texto: res.error ?? "No se pudo eliminar." });
      }
    });
  }

  function cambiarTamano(id: string, tamano: TamanoWidget) {
    setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, tamano } : w)));
  }

  function eliminarWidget(id: string) {
    setWidgets((ws) => ws.filter((w) => w.id !== id));
  }

  function agregarWidget(nuevo: Omit<WidgetDashboardBI, "id">) {
    setWidgets((ws) => [...ws, { ...nuevo, id: crypto.randomUUID() }]);
    setMostrarAgregar(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2" data-no-print>
        <select value={vistaActivaId} onChange={(e) => cambiarVista(e.target.value)} style={{ ...fieldStyle, minWidth: 220 }}>
          {vistas.length === 0 && <option value={TEMPORAL}>Vista sugerida (sin guardar)</option>}
          {vistas.map((v) => (
            <option key={v.id} value={v.id}>{v.nombre}</option>
          ))}
          {vistas.length > 0 && <option value={TEMPORAL}>+ Vista sugerida (sin guardar)</option>}
        </select>

        {editMode && (
          <input
            value={nombreVista}
            onChange={(e) => setNombreVista(e.target.value)}
            placeholder="Nombre de la vista"
            style={{ ...fieldStyle, minWidth: 200 }}
          />
        )}

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {puedeEditar && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 rounded-md px-3 h-9"
              style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
            >
              <Pencil size={13} /> Editar dashboard
            </button>
          )}

          {editMode && (
            <>
              <button
                onClick={() => setMostrarAgregar((v) => !v)}
                className="flex items-center gap-1.5 rounded-md px-3 h-9"
                style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
              >
                <Plus size={13} /> Agregar combinación
              </button>
              <button
                onClick={() => handleGuardar(false)}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-md px-3 h-9 disabled:opacity-60"
                style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
              >
                <Save size={13} /> {vistaActivaId === TEMPORAL ? "Guardar" : "Guardar cambios"}
              </button>
              {vistaActivaId === TEMPORAL ? null : (
                <button
                  onClick={() => handleGuardar(true)}
                  disabled={pending}
                  className="flex items-center gap-1.5 rounded-md px-3 h-9 disabled:opacity-60"
                  style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
                >
                  Guardar como nueva
                </button>
              )}
              {vistaActivaId !== TEMPORAL && (
                <button
                  onClick={handleEliminar}
                  disabled={pending}
                  className="flex items-center gap-1.5 rounded-md px-3 h-9 disabled:opacity-60"
                  style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
                >
                  <Trash2 size={13} /> Eliminar vista
                </button>
              )}
              <button
                onClick={() => {
                  setEditMode(false);
                  setMostrarAgregar(false);
                  cambiarVista(vistaActivaId);
                }}
                className="flex items-center gap-1.5 rounded-md px-3 h-9"
                style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}
              >
                <X size={13} /> Salir de edición
              </button>
            </>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md px-3 h-9"
            style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
          >
            <Printer size={13} /> Imprimir
          </button>
        </div>
      </div>

      {mensaje && (
        <div
          className="flex items-center gap-2 rounded-md px-3 py-2.5"
          style={{ background: mensaje.tipo === "ok" ? "var(--status-cerrado-bg)" : "var(--status-escena-bg)" }}
          data-no-print
        >
          {mensaje.tipo === "ok" ? <CheckCircle2 size={15} color="var(--color-status-cerrado)" /> : <TriangleAlert size={15} color="var(--color-status-escena)" />}
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: mensaje.tipo === "ok" ? "var(--color-status-cerrado)" : "var(--color-status-escena)" }}>
            {mensaje.texto}
          </span>
        </div>
      )}

      {mostrarAgregar && editMode && (
        <div data-no-print>
          <BiAgregarWidget onAgregar={agregarWidget} onCancelar={() => setMostrarAgregar(false)} />
        </div>
      )}

      <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
        {nombreVista}
      </h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {widgets.map((w) => (
          <div key={w.id} className={TAMANO_COLSPAN[w.tamano]}>
            <BiCard
              label={w.label}
              dataset={w.dataset}
              ejeX={w.ejeX}
              ejeY={w.ejeY}
              tipoGrafica={w.tipoGrafica}
              tamano={w.tamano}
              editMode={editMode}
              onCambiarTamano={(t) => cambiarTamano(w.id, t)}
              onEliminar={() => eliminarWidget(w.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
