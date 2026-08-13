"use client";

import { useMemo, useState } from "react";
import { Car, CheckCircle2, XCircle, Ban, ArrowLeftRight } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { UnidadesTable, type UnidadRow } from "@/components/unidades/unidades-table";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import { valorWidgetUnidades, type WidgetConfigItem } from "@/lib/widgets";

const ICONO_WIDGET: Record<string, typeof Car> = {
  bajas: Ban,
  consignacionODireccion: ArrowLeftRight,
  activas: CheckCircle2,
  disponibles: CheckCircle2,
  noDisponibles: XCircle,
};

export function InventarioUnidades({
  rows,
  widgetsActivos,
  gastoHoy,
}: {
  rows: UnidadRow[];
  widgetsActivos: WidgetConfigItem[];
  gastoHoy: number;
}) {
  const [proyectosSeleccionados, setProyectosSeleccionados] = useState<string[]>([]);

  function alternarProyecto(proyecto: string) {
    setProyectosSeleccionados((prev) =>
      prev.includes(proyecto) ? prev.filter((p) => p !== proyecto) : [...prev, proyecto]
    );
  }

  const rowsFiltradas = useMemo(() => {
    if (proyectosSeleccionados.length === 0) return rows;
    return rows.filter((r) => proyectosSeleccionados.includes(r.proyecto ?? "Sin proyecto"));
  }, [rows, proyectosSeleccionados]);

  const datosWidgets = useMemo(() => {
    const total = rowsFiltradas.length;
    const activas = rowsFiltradas.filter((r) => r.estatus === "ACTIVO").length;
    const disponibles = rowsFiltradas.filter((r) => r.disponibilidad).length;
    const noDisponibles = total - disponibles;
    const bajas = rowsFiltradas.filter((r) => r.estatus === "BAJA").length;
    const consignacionODireccion = rowsFiltradas.filter((r) => r.estatus === "CONSIGNACION" || r.estatus === "DIRECCION").length;

    const porTipoMap = new Map<string, number>();
    for (const r of rowsFiltradas) {
      const tipoLabel = TIPO_VEHICULO_LABEL[r.tipoVehiculo] ?? r.tipoVehiculo;
      porTipoMap.set(tipoLabel, (porTipoMap.get(tipoLabel) ?? 0) + 1);
    }

    // Los conteos por proyecto siempre reflejan el total sin filtrar, para
    // que los chips sigan mostrando todas las opciones disponibles.
    const porProyectoMap = new Map<string, number>();
    for (const r of rows) {
      const proyectoLabel = r.proyecto ?? "Sin proyecto";
      porProyectoMap.set(proyectoLabel, (porProyectoMap.get(proyectoLabel) ?? 0) + 1);
    }

    return {
      total,
      activas,
      disponibles,
      noDisponibles,
      bajas,
      consignacionODireccion,
      gastoHoy,
      porTipo: Array.from(porTipoMap, ([label, value]) => ({ label, value })),
      porProyecto: Array.from(porProyectoMap, ([label, value]) => ({ label, value })),
    };
  }, [rowsFiltradas, rows, gastoHoy]);

  return (
    <div className="flex flex-col gap-6">
      {widgetsActivos.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {widgetsActivos.map((w) => {
            const valor = valorWidgetUnidades(w.id, datosWidgets);
            if (Array.isArray(valor)) {
              const esProyecto = w.id === "porProyecto";
              return (
                <div key={w.id} className="rounded-xl p-4 col-span-2" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
                  <div className="mb-2 flex items-center justify-between">
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>
                      {w.label}
                      {esProyecto && " — clic para filtrar"}
                    </span>
                    {esProyecto && proyectosSeleccionados.length > 0 && (
                      <button
                        onClick={() => setProyectosSeleccionados([])}
                        style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text-active)", fontWeight: 600 }}
                      >
                        Quitar filtro ({proyectosSeleccionados.length})
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {valor.map((v) => {
                      const seleccionado = esProyecto && proyectosSeleccionados.includes(v.label);
                      const Tag = esProyecto ? "button" : "span";
                      return (
                        <Tag
                          key={v.label}
                          onClick={esProyecto ? () => alternarProyecto(v.label) : undefined}
                          className="rounded-full px-3 py-1"
                          style={{
                            background: seleccionado ? "var(--color-primary)" : "var(--chip)",
                            color: seleccionado ? "#fff" : "var(--field-text)",
                            fontFamily: "var(--font-ui)",
                            fontSize: "var(--text-sm)",
                            fontWeight: seleccionado ? 600 : 400,
                            cursor: esProyecto ? "pointer" : "default",
                          }}
                        >
                          {v.label}: <strong>{v.value}</strong>
                        </Tag>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return (
              <StatCard
                key={w.id}
                label={w.label}
                value={w.id === "gastoHoy" ? `$${valor.toLocaleString("es-MX")}` : valor}
                icon={ICONO_WIDGET[w.id] ?? Car}
                accent="var(--color-primary)"
              />
            );
          })}
        </div>
      )}

      <UnidadesTable rows={rowsFiltradas} />
    </div>
  );
}
