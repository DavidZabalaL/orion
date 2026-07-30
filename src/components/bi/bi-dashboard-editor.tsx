"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Responsive, useContainerWidth, type Layout, type ResponsiveLayouts } from "react-grid-layout";
import { Pencil, Plus, Printer, Save, Trash2, X, TriangleAlert, CheckCircle2 } from "lucide-react";
import { WIDGETS_BI_DEFAULT, type WidgetDashboardBI } from "@/lib/bi/metadata";
import { BiCard } from "@/components/bi/bi-card";
import { BiAgregarWidget } from "@/components/bi/bi-agregar-widget";
import { guardarVistaDashboard, eliminarVistaDashboard } from "@/app/(app)/dashboards/actions";

export type VistaDashboard = { id: string; nombre: string; widgets: WidgetDashboardBI[] };

const TEMPORAL = "__temporal__";
const BREAKPOINTS = { lg: 1024, md: 640, sm: 0 };
const COLS = { lg: 12, md: 6, sm: 1 };

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

const panelStyle: React.CSSProperties = { background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" };

function nuevoIdWidget(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `w-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function BiDashboardEditor({ vistas, puedeEditar }: { vistas: VistaDashboard[]; puedeEditar: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { width, containerRef, mounted } = useContainerWidth();

  const primeraVista = vistas[0] ?? null;
  const [vistaActivaId, setVistaActivaId] = useState<string>(primeraVista?.id ?? TEMPORAL);
  const [nombreVista, setNombreVista] = useState(primeraVista?.nombre ?? "Vista sugerida");
  const [widgets, setWidgets] = useState<WidgetDashboardBI[]>(primeraVista?.widgets ?? WIDGETS_BI_DEFAULT);
  const [editMode, setEditMode] = useState(false);
  const [formulario, setFormulario] = useState<"agregar" | { editarId: string } | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [breakpoint, setBreakpoint] = useState<keyof typeof BREAKPOINTS>("lg");

  function cambiarVista(id: string) {
    setVistaActivaId(id);
    setEditMode(false);
    setFormulario(null);
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

  function eliminarWidget(id: string) {
    setWidgets((ws) => ws.filter((w) => w.id !== id));
  }

  function guardarWidgetDesdeFormulario(datos: Omit<WidgetDashboardBI, "id" | "layout">) {
    if (formulario && formulario !== "agregar") {
      const { editarId } = formulario;
      setWidgets((ws) => ws.map((w) => (w.id === editarId ? { ...w, ...datos } : w)));
    } else {
      setWidgets((ws) => [
        ...ws,
        { ...datos, id: nuevoIdWidget(), layout: { x: 0, y: Number.MAX_SAFE_INTEGER, w: 4, h: 9 } },
      ]);
    }
    setFormulario(null);
  }

  function handleLayoutChange(actual: Layout, todos: ResponsiveLayouts) {
    if (!editMode) return;
    const referencia = todos.lg ?? actual;
    setWidgets((ws) =>
      ws.map((w) => {
        const item = referencia.find((l) => l.i === w.id);
        return item ? { ...w, layout: { x: item.x, y: item.y, w: item.w, h: item.h } } : w;
      })
    );
  }

  const widgetEditando = formulario && formulario !== "agregar" ? widgets.find((w) => w.id === formulario.editarId) : undefined;
  const interactivo = editMode && breakpoint !== "sm";
  const layouts: ResponsiveLayouts = {
    lg: widgets.map((w) => ({ i: w.id, x: w.layout.x, y: w.layout.y, w: w.layout.w, h: w.layout.h, minW: 2, minH: 4 })),
  };

  const mensajeEl = mensaje && (
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
  );

  // Nota: el centro (con el div medido por useContainerWidth) se mantiene SIEMPRE en
  // la misma posición del árbol — nunca dentro de un return condicional distinto —
  // para que React no lo desmonte/remonte al entrar o salir de modo edición (eso
  // rompía la medición de ancho y colapsaba la cuadrícula).
  return (
    <div className={`flex flex-col gap-5 ${editMode ? "lg:flex-row lg:items-start" : ""}`}>
      <div className={editMode ? "order-2 min-w-0 flex-1 lg:order-1" : "min-w-0"}>
        {!editMode && (
          <div className="mb-5 flex flex-wrap items-center gap-2" data-no-print>
            <select value={vistaActivaId} onChange={(e) => cambiarVista(e.target.value)} style={{ ...fieldStyle, minWidth: 220 }}>
              {vistas.length === 0 && <option value={TEMPORAL}>Vista sugerida (sin guardar)</option>}
              {vistas.map((v) => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
              {vistas.length > 0 && <option value={TEMPORAL}>+ Vista sugerida (sin guardar)</option>}
            </select>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {puedeEditar && (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 rounded-md px-3 h-9"
                  style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
                >
                  <Pencil size={13} /> Editar dashboard
                </button>
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
        )}

        {!editMode && mensajeEl && <div className="mb-5">{mensajeEl}</div>}

        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            {nombreVista}
          </h2>
          {editMode && (
            <span className="shrink-0 rounded-full px-2.5 py-1" style={{ background: "var(--status-revision-bg)", color: "var(--color-status-revision)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }} data-no-print>
              Editando
            </span>
          )}
        </div>

        {editMode && (
          <p className="mb-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }} data-no-print>
            Arrastra un widget desde su título para moverlo, o desde la esquina inferior derecha para cambiar su tamaño. Los cambios se ven aquí al instante.
          </p>
        )}

        <div ref={containerRef}>
          {mounted && (
            <Responsive
              layouts={layouts}
              breakpoints={BREAKPOINTS}
              cols={COLS}
              width={width}
              rowHeight={32}
              margin={[16, 16]}
              containerPadding={[0, 0]}
              dragConfig={{ enabled: interactivo, handle: ".bi-drag-handle" }}
              resizeConfig={{ enabled: interactivo }}
              onBreakpointChange={(bp) => setBreakpoint(bp as keyof typeof BREAKPOINTS)}
              onLayoutChange={handleLayoutChange}
            >
              {widgets.map((w) => (
                <div key={w.id}>
                  <BiCard
                    label={w.label}
                    dataset={w.dataset}
                    ejeX={w.ejeX}
                    ejeY={w.ejeY}
                    agregacion={w.agregacion}
                    tipoGrafica={w.tipoGrafica}
                    ejeSplit={w.ejeSplit}
                    orden={w.orden}
                    editMode={editMode}
                    onEditar={() => setFormulario({ editarId: w.id })}
                    onEliminar={() => eliminarWidget(w.id)}
                  />
                </div>
              ))}
            </Responsive>
          )}
        </div>
      </div>

      {editMode && (
        <aside className="order-1 w-full shrink-0 lg:order-2 lg:w-96 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto" data-no-print>
          <div className="flex flex-col gap-4 rounded-xl p-5" style={panelStyle}>
            <div>
              <label style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em", display: "block", marginBottom: 6 }}>
                Nombre de la vista
              </label>
              <input value={nombreVista} onChange={(e) => setNombreVista(e.target.value)} placeholder="Nombre de la vista" style={{ ...fieldStyle, width: "100%" }} />
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleGuardar(false)}
                disabled={pending}
                className="flex items-center justify-center gap-1.5 rounded-md px-3 h-9 disabled:opacity-60"
                style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
              >
                <Save size={13} /> {vistaActivaId === TEMPORAL ? "Guardar" : "Guardar cambios"}
              </button>
              {vistaActivaId !== TEMPORAL && (
                <button
                  onClick={() => handleGuardar(true)}
                  disabled={pending}
                  className="flex items-center justify-center gap-1.5 rounded-md px-3 h-9 disabled:opacity-60"
                  style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
                >
                  Guardar como nueva
                </button>
              )}
              {vistaActivaId !== TEMPORAL && (
                <button
                  onClick={handleEliminar}
                  disabled={pending}
                  className="flex items-center justify-center gap-1.5 rounded-md px-3 h-9 disabled:opacity-60"
                  style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
                >
                  <Trash2 size={13} /> Eliminar vista
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 rounded-md px-3 h-9"
                style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
              >
                <Printer size={13} /> Imprimir
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  setFormulario(null);
                  cambiarVista(vistaActivaId);
                }}
                className="flex items-center justify-center gap-1.5 rounded-md px-3 h-9"
                style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}
              >
                <X size={13} /> Salir de edición
              </button>
            </div>

            {mensajeEl}

            <hr style={{ border: "none", borderTop: "1px solid var(--field-border)" }} />

            {formulario ? (
              <BiAgregarWidget
                compacto
                valorInicial={
                  widgetEditando
                    ? {
                        label: widgetEditando.label,
                        combinacion: {
                          datasetId: widgetEditando.dataset,
                          ejeX: widgetEditando.ejeX,
                          ejeY: widgetEditando.ejeY,
                          agregacion: widgetEditando.agregacion,
                          tipoGrafica: widgetEditando.tipoGrafica,
                          ejeSplit: widgetEditando.ejeSplit,
                          orden: widgetEditando.orden,
                        },
                      }
                    : undefined
                }
                onGuardar={guardarWidgetDesdeFormulario}
                onCancelar={() => setFormulario(null)}
              />
            ) : (
              <button
                onClick={() => setFormulario("agregar")}
                className="flex items-center justify-center gap-1.5 rounded-md px-3 h-9"
                style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
              >
                <Plus size={13} /> Agregar combinación
              </button>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
