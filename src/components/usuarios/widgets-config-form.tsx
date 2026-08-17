"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useState, useTransition } from "react";
import { CheckCircle2, GripVertical } from "lucide-react";
import { Responsive, useContainerWidth, type Layout, type ResponsiveLayouts } from "react-grid-layout";
import { actualizarConfiguracionWidgets } from "@/app/(app)/usuarios/widgets/actions";
import { COLS_WIDGETS, type DefinicionWidget, type WidgetConfigItem } from "@/lib/widgets";

// Mismo esquema de breakpoints que el dashboard de BI: un solo corte, muy por
// debajo de cualquier ancho de escritorio real, para que el colapso del
// sidebar no dispare un reacomodo accidental de la cuadrícula.
const BREAKPOINTS = { lg: 600, sm: 0 };
const COLS = { lg: COLS_WIDGETS, sm: 1 };

type WidgetEditable = WidgetConfigItem & { label: string; tipo: DefinicionWidget["tipo"] };

export function WidgetsConfigForm({
  moduloId,
  catalogo,
  widgetsActuales,
}: {
  moduloId: string;
  catalogo: DefinicionWidget[];
  widgetsActuales: WidgetConfigItem[];
}) {
  const { width, containerRef, mounted } = useContainerWidth();
  const [widgets, setWidgets] = useState<WidgetEditable[]>(() =>
    catalogo.map((w) => {
      const actual = widgetsActuales.find((a) => a.id === w.id);
      return { id: w.id, label: w.labelDefault, tipo: w.tipo, activo: actual?.activo ?? false, layout: actual?.layout ?? { x: 0, y: 0, w: 3, h: 4 } };
    })
  );
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function alternarActivo(id: string) {
    setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, activo: !w.activo } : w)));
  }

  function handleLayoutChange(actual: Layout, todos: ResponsiveLayouts) {
    const referencia = todos.lg ?? actual;
    setWidgets((ws) =>
      ws.map((w) => {
        const item = referencia.find((l) => l.i === w.id);
        return item ? { ...w, layout: { x: item.x, y: item.y, w: item.w, h: item.h } } : w;
      })
    );
  }

  function guardar() {
    setError(null);
    startTransition(async () => {
      const res = await actualizarConfiguracionWidgets(moduloId, widgets);
      if (!res.ok) {
        setError(res.error ?? "No se pudo guardar.");
        return;
      }
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    });
  }

  const layouts: ResponsiveLayouts = {
    lg: widgets.map((w) => ({ i: w.id, x: w.layout.x, y: w.layout.y, w: w.layout.w, h: w.layout.h, minW: 2, minH: 3 })),
  };

  return (
    <div className="flex flex-col gap-4">
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
        Arrastra un widget desde su título para moverlo, o desde la esquina inferior derecha para cambiar su tamaño. Los apagados no se muestran en Inventario de Unidades, pero puedes seguir acomodándolos.
      </p>

      <div className="flex items-center gap-3" data-no-print>
        <button
          type="button"
          onClick={guardar}
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-md px-5 h-10 font-semibold disabled:opacity-60 w-fit"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {ok ? <><CheckCircle2 size={16} /> Guardado</> : pending ? "Guardando…" : "Guardar cambios"}
        </button>
        {error && <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-error)" }}>{error}</span>}
      </div>

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
            dragConfig={{ enabled: true, handle: ".widget-drag-handle" }}
            resizeConfig={{ enabled: true }}
            onLayoutChange={handleLayoutChange}
          >
            {widgets.map((w) => (
              <div key={w.id}>
                <div
                  className="flex h-full flex-col rounded-xl p-3"
                  style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)", opacity: w.activo ? 1 : 0.45 }}
                >
                  <div className="widget-drag-handle flex cursor-move items-center gap-2" style={{ cursor: "move" }}>
                    <GripVertical size={14} color="var(--sidebar-text)" className="shrink-0" />
                    <span className="flex-1 truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                      {w.label}
                    </span>
                    <label className="flex shrink-0 items-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={w.activo} onChange={() => alternarActivo(w.id)} />
                    </label>
                  </div>
                  <span
                    className="mt-1"
                    style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textTransform: "uppercase" }}
                  >
                    {w.tipo === "contador" ? "Contador" : "Desglose"}
                  </span>
                </div>
              </div>
            ))}
          </Responsive>
        )}
      </div>
    </div>
  );
}
