"use client";

import { useState } from "react";
import Link from "next/link";
import { Sigma, LayoutGrid, Compass, Car, FileDown } from "lucide-react";
import { BiDashboardEditor, type VistaDashboard } from "@/components/bi/bi-dashboard-editor";
import { BiExplorer, type MetricaDisponible } from "@/components/bi/bi-explorer";
import type { ProyectoDisponible } from "@/components/bi/selectores-combinacion";
import { InventarioResumenTab } from "@/components/dashboard/InventarioResumenTab";
import { ExportRegistryProvider, useExportRegistry } from "@/components/dashboard/ExportRegistryContext";
import { ExportSummaryModal } from "@/components/dashboard/ExportSummaryModal";
import type { UnidadRow } from "@/components/unidades/unidades-table";
import type { WidgetActivo } from "@/lib/widgets";

const TABS = [
  { id: "propios", label: "Mis dashboards", icon: LayoutGrid },
  { id: "explorador", label: "Explorador libre", icon: Compass },
  { id: "inventario", label: "Inventario de Unidades", icon: Car },
] as const;
type TabId = (typeof TABS)[number]["id"];

export type DatosInventarioTab = {
  rows: UnidadRow[];
  widgetsActivos: WidgetActivo[];
  gastoHoy: number;
  puedeVerSla: boolean;
  slaOcultoInicial: boolean;
  puedeConfigurar: boolean;
};

/**
 * Antes eran dos pantallas separadas (/dashboards con la cuadrícula de
 * widgets guardados, /reportes/bi con el explorador ad-hoc) sobre el mismo
 * motor (/api/bi/query) — se unifican aquí como pestañas de una sola
 * pantalla, bajo el permiso "M". La pestaña "Inventario de Unidades" suma el
 * resumen de /unidades (permiso "A") como tercera pestaña, sin tocar ese
 * módulo — ver InventarioResumenTab.
 */
export function DashboardsUnificado({
  vistas,
  puedeEditar,
  proyectosDisponibles,
  metricasDisponibles,
  tabInicial,
  datosInventario,
}: {
  vistas: VistaDashboard[];
  puedeEditar: boolean;
  proyectosDisponibles: ProyectoDisponible[];
  metricasDisponibles: MetricaDisponible[];
  tabInicial: TabId;
  datosInventario?: DatosInventarioTab;
}) {
  const [tab, setTab] = useState<TabId>(datosInventario ? tabInicial : tabInicial === "inventario" ? "propios" : tabInicial);
  const tabsVisibles = datosInventario ? TABS : TABS.filter((t) => t.id !== "inventario");

  return (
    <ExportRegistryProvider>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4" data-no-print>
          <div>
            <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
              Dashboards
            </h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
              {tab === "propios"
                ? "Guarda tus propias vistas con las combinaciones que más uses."
                : tab === "explorador"
                ? "Combina cualquier dimensión con cualquier métrica, pregunta en lenguaje natural, o pide un resumen automático."
                : "Ficha única por número económico con vista consolidada de flota."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <BotonExportar />
            {tab === "explorador" && (
              <Link
                href="/reportes/metricas"
                className="flex items-center gap-1.5 rounded-md px-3 py-2"
                style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
              >
                <Sigma size={14} /> Métricas de negocio
              </Link>
            )}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b" style={{ borderColor: "var(--field-border)" }} data-no-print>
          {tabsVisibles.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 whitespace-nowrap border-b-2 -mb-px transition-colors"
              style={{
                borderColor: tab === t.id ? "var(--color-primary)" : "transparent",
                color: tab === t.id ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-base)",
                fontWeight: tab === t.id ? 600 : 400,
              }}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "propios" && <BiDashboardEditor vistas={vistas} puedeEditar={puedeEditar} proyectosDisponibles={proyectosDisponibles} />}
        {tab === "explorador" && <BiExplorer proyectosDisponibles={proyectosDisponibles} metricasDisponibles={metricasDisponibles} />}
        {tab === "inventario" && datosInventario && <InventarioResumenTab {...datosInventario} />}
      </div>
    </ExportRegistryProvider>
  );
}

function BotonExportar() {
  const { items } = useExportRegistry();
  const [mostrar, setMostrar] = useState(false);

  return (
    <>
      <button
        onClick={() => setMostrar(true)}
        disabled={items.length === 0}
        className="flex items-center gap-1.5 rounded-md px-3 py-2 disabled:opacity-40"
        style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
        data-no-print
      >
        <FileDown size={14} /> Exportar resumen ejecutivo
      </button>
      {mostrar && <ExportSummaryModal onClose={() => setMostrar(false)} />}
    </>
  );
}
