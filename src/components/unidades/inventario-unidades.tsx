"use client";

import "react-grid-layout/css/styles.css";

import { useMemo, useState } from "react";
import { Car, CheckCircle2, XCircle, Ban, PauseCircle, Layers } from "lucide-react";
import { Responsive, useContainerWidth, type ResponsiveLayouts } from "react-grid-layout";
import { StatCard } from "@/components/ui/stat-card";
import { UnidadesTable, type UnidadRow } from "@/components/unidades/unidades-table";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import { valorWidgetUnidades, COLS_WIDGETS, type WidgetActivo } from "@/lib/widgets";

const BREAKPOINTS = { lg: 600, sm: 0 };
const COLS = { lg: COLS_WIDGETS, sm: 1 };

const ICONO_WIDGET: Record<string, typeof Car> = {
  total: Layers,
  bajas: Ban,
  inactivas: PauseCircle,
  activas: CheckCircle2,
  disponibles: CheckCircle2,
  noDisponibles: XCircle,
};

type CategoriaEstatus = "activas" | "bajas" | "inactivas";
type Disponibilidad = "disponible" | "no_disponible";

function tipoLabelDe(r: UnidadRow): string {
  return TIPO_VEHICULO_LABEL[r.tipoVehiculo] ?? r.tipoVehiculo;
}

export function InventarioUnidades({
  rows,
  widgetsActivos,
  gastoHoy,
  puedeVerSla = false,
  slaOcultoInicial = false,
}: {
  rows: UnidadRow[];
  widgetsActivos: WidgetActivo[];
  gastoHoy: number;
  puedeVerSla?: boolean;
  slaOcultoInicial?: boolean;
}) {
  const { width, containerRef, mounted } = useContainerWidth();
  const [proyectosSeleccionados, setProyectosSeleccionados] = useState<string[]>([]);
  const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const [categoriaEstatus, setCategoriaEstatus] = useState<CategoriaEstatus | null>(null);

  const hayFiltrosActivos =
    proyectosSeleccionados.length > 0 || tiposSeleccionados.length > 0 || disponibilidad !== null || categoriaEstatus !== null;

  function limpiarFiltros() {
    setProyectosSeleccionados([]);
    setTiposSeleccionados([]);
    setDisponibilidad(null);
    setCategoriaEstatus(null);
  }

  function alternarProyecto(proyecto: string) {
    setProyectosSeleccionados((prev) => (prev.includes(proyecto) ? prev.filter((p) => p !== proyecto) : [...prev, proyecto]));
  }

  function alternarTipo(tipo: string) {
    setTiposSeleccionados((prev) => (prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]));
  }

  // Clic en un chip de "no disponibles por tipo": además de filtrar por ese
  // tipo, fuerza la vista a solo no-disponibles (es un drill-down directo).
  function alternarTipoNoDisponible(tipo: string) {
    setTiposSeleccionados((prev) => (prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]));
    setDisponibilidad("no_disponible");
  }

  function alternarDisponibilidad(valor: Disponibilidad) {
    setDisponibilidad((prev) => (prev === valor ? null : valor));
  }

  function alternarCategoriaEstatus(valor: CategoriaEstatus) {
    setCategoriaEstatus((prev) => (prev === valor ? null : valor));
  }

  // La lista de abajo respeta TODOS los filtros (proyecto, tipo,
  // disponibilidad, estatus) — cada widget sigue sirviendo para ver el
  // detalle de lo que resume.
  const rowsFiltradas = useMemo(() => {
    return rows.filter((r) => {
      if (proyectosSeleccionados.length && !proyectosSeleccionados.includes(r.proyecto ?? "Sin proyecto")) return false;
      if (tiposSeleccionados.length && !tiposSeleccionados.includes(tipoLabelDe(r))) return false;
      if (disponibilidad === "disponible" && !r.disponibilidad) return false;
      if (disponibilidad === "no_disponible" && r.disponibilidad) return false;
      if (categoriaEstatus === "activas" && r.estatus !== "ACTIVO") return false;
      if (categoriaEstatus === "bajas" && r.estatus !== "BAJA") return false;
      if (categoriaEstatus === "inactivas" && r.estatus !== "INACTIVO") return false;
      return true;
    });
  }, [rows, proyectosSeleccionados, tiposSeleccionados, disponibilidad, categoriaEstatus]);

  // Los contadores y desgloses de los widgets solo se mueven con el proyecto
  // seleccionado — los demás clics (tipo, disponibilidad, estatus) no los
  // alteran, solo filtran la lista de arriba. Las unidades dadas de baja no
  // cuentan para nada aquí (ni total, ni activas, ni disponibles/no
  // disponibles, ni los desgloses); "Bajas" es la única excepción informativa.
  const rowsProyecto = useMemo(() => {
    if (proyectosSeleccionados.length === 0) return rows;
    return rows.filter((r) => proyectosSeleccionados.includes(r.proyecto ?? "Sin proyecto"));
  }, [rows, proyectosSeleccionados]);

  const rowsParaContar = useMemo(() => rowsProyecto.filter((r) => r.estatus !== "BAJA"), [rowsProyecto]);

  const datosWidgets = useMemo(() => {
    const total = rowsParaContar.length;
    const activas = rowsParaContar.filter((r) => r.estatus === "ACTIVO").length;
    const disponibles = rowsParaContar.filter((r) => r.disponibilidad).length;
    const noDisponibles = total - disponibles;
    const bajas = rowsProyecto.filter((r) => r.estatus === "BAJA").length;
    const inactivas = rowsParaContar.filter((r) => r.estatus === "INACTIVO").length;

    const contarPorTipo = (lista: UnidadRow[]) => {
      const mapa = new Map<string, number>();
      for (const r of lista) mapa.set(tipoLabelDe(r), (mapa.get(tipoLabelDe(r)) ?? 0) + 1);
      return Array.from(mapa, ([label, value]) => ({ label, value }));
    };
    const contarPorProyecto = (lista: UnidadRow[]) => {
      const mapa = new Map<string, number>();
      for (const r of lista) {
        const proyectoLabel = r.proyecto ?? "Sin proyecto";
        mapa.set(proyectoLabel, (mapa.get(proyectoLabel) ?? 0) + 1);
      }
      return Array.from(mapa, ([label, value]) => ({ label, value }));
    };
    // Promedio simple del % de SLA de cada unidad con datos, agrupado por
    // proyecto — unidades sin historial (slaPorcentaje null) no cuentan ni
    // a favor ni en contra del promedio.
    const promediarSlaPorProyecto = (lista: UnidadRow[]) => {
      const mapa = new Map<string, number[]>();
      for (const r of lista) {
        if (r.slaPorcentaje === null) continue;
        const proyectoLabel = r.proyecto ?? "Sin proyecto";
        const valores = mapa.get(proyectoLabel) ?? [];
        valores.push(r.slaPorcentaje);
        mapa.set(proyectoLabel, valores);
      }
      return Array.from(mapa, ([label, valores]) => ({
        label,
        value: Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10,
      }));
    };

    return {
      total,
      activas,
      disponibles,
      noDisponibles,
      bajas,
      inactivas,
      gastoHoy,
      porTipo: contarPorTipo(rowsParaContar),
      porTipoNoDisponible: contarPorTipo(rowsParaContar.filter((r) => !r.disponibilidad)),
      porProyecto: contarPorProyecto(rows.filter((r) => r.estatus !== "BAJA")),
      slaPorProyecto: promediarSlaPorProyecto(rows.filter((r) => r.estatus !== "BAJA")),
    };
  }, [rowsParaContar, rowsProyecto, rows, gastoHoy]);

  function alClicWidget(id: string) {
    switch (id) {
      case "total":
        limpiarFiltros();
        break;
      case "activas":
        alternarCategoriaEstatus("activas");
        break;
      case "bajas":
        alternarCategoriaEstatus("bajas");
        break;
      case "inactivas":
        alternarCategoriaEstatus("inactivas");
        break;
      case "disponibles":
        alternarDisponibilidad("disponible");
        break;
      case "noDisponibles":
        alternarDisponibilidad("no_disponible");
        break;
      default:
        break;
    }
  }

  function widgetSeleccionado(id: string): boolean {
    switch (id) {
      case "activas": return categoriaEstatus === "activas";
      case "bajas": return categoriaEstatus === "bajas";
      case "inactivas": return categoriaEstatus === "inactivas";
      case "disponibles": return disponibilidad === "disponible";
      case "noDisponibles": return disponibilidad === "no_disponible";
      default: return false;
    }
  }

  const layouts: ResponsiveLayouts = {
    lg: widgetsActivos.map((w) => ({ i: w.id, x: w.layout.x, y: w.layout.y, w: w.layout.w, h: w.layout.h })),
  };

  return (
    <div className="flex flex-col gap-6">
      {widgetsActivos.length > 0 && (
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
              dragConfig={{ enabled: false }}
              resizeConfig={{ enabled: false }}
            >
              {widgetsActivos.map((w) => {
                const valor = valorWidgetUnidades(w.id, datosWidgets);
                if (Array.isArray(valor)) {
                  const esProyecto = w.id === "porProyecto";
                  const esTipoNoDisponible = w.id === "porTipoNoDisponible";
                  const esTipo = w.id === "porTipo" || esTipoNoDisponible;
                  const alternar = esProyecto ? alternarProyecto : esTipoNoDisponible ? alternarTipoNoDisponible : esTipo ? alternarTipo : undefined;
                  const estaSeleccionado = (label: string) =>
                    esProyecto ? proyectosSeleccionados.includes(label) : esTipo ? tiposSeleccionados.includes(label) : false;
                  return (
                    <div key={w.id}>
                      <div className="flex h-full flex-col overflow-auto rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
                        <div className="mb-2 flex items-center justify-between">
                          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>
                            {w.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {valor.length === 0 && (
                            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Sin unidades.</span>
                          )}
                          {valor.map((v) => {
                            const seleccionado = estaSeleccionado(v.label);
                            return (
                              <button
                                key={v.label}
                                onClick={() => alternar?.(v.label)}
                                className="rounded-full px-3 py-1"
                                style={{
                                  background: seleccionado ? "var(--color-primary)" : "var(--chip)",
                                  color: seleccionado ? "#fff" : "var(--field-text)",
                                  fontFamily: "var(--font-ui)",
                                  fontSize: "var(--text-sm)",
                                  fontWeight: seleccionado ? 600 : 400,
                                  cursor: "pointer",
                                }}
                              >
                                {v.label}: <strong>{w.id === "slaPorProyecto" ? `${v.value}%` : v.value}</strong>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={w.id}>
                    <StatCard
                      label={w.label}
                      value={w.id === "gastoHoy" ? `$${valor.toLocaleString("es-MX")}` : valor}
                      icon={ICONO_WIDGET[w.id] ?? Car}
                      accent="var(--color-primary)"
                      onClick={w.id === "gastoHoy" ? undefined : () => alClicWidget(w.id)}
                      seleccionado={widgetSeleccionado(w.id)}
                    />
                  </div>
                );
              })}
            </Responsive>
          )}
        </div>
      )}

      {hayFiltrosActivos && (
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
            Mostrando {rowsFiltradas.length} de {rows.length} unidades según los widgets seleccionados.
          </span>
          <button
            onClick={limpiarFiltros}
            className="rounded-md px-3 py-1"
            style={{ background: "var(--chip)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}
          >
            Quitar todos los filtros
          </button>
        </div>
      )}

      <UnidadesTable rows={rowsFiltradas} puedeVerSla={puedeVerSla} slaOcultoInicial={slaOcultoInicial} />
    </div>
  );
}
