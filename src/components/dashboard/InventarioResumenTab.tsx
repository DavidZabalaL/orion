"use client";

import { useMemo } from "react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { InventarioUnidades } from "@/components/unidades/inventario-unidades";
import type { UnidadRow } from "@/components/unidades/unidades-table";
import type { WidgetActivo } from "@/lib/widgets";
import { useRegisterExportable } from "./ExportRegistryContext";

/**
 * Pestaña "Inventario de Unidades" del dashboard unificado — reutiliza tal
 * cual el componente de widgets/tabla de /unidades (no se toca ni una línea
 * de InventarioUnidades ni de lib/widgets.ts). Solo agrega el registro de
 * unos pocos KPIs base para el exportador de resumen ejecutivo: esos
 * números no salen del useMemo interno de InventarioUnidades, así que se
 * recalculan aquí a partir de las mismas `rows` ya recibidas por props.
 */
export function InventarioResumenTab({
  rows,
  widgetsActivos,
  gastoHoy,
  puedeVerSla = false,
  slaOcultoInicial = false,
  puedeConfigurar = false,
}: {
  rows: UnidadRow[];
  widgetsActivos: WidgetActivo[];
  gastoHoy: number;
  puedeVerSla?: boolean;
  slaOcultoInicial?: boolean;
  puedeConfigurar?: boolean;
}) {
  const kpis = useMemo(() => {
    const rowsParaContar = rows.filter((r) => r.estatus !== "BAJA");
    const total = rowsParaContar.length;
    const activas = rowsParaContar.filter((r) => r.estatus === "ACTIVO").length;
    const disponibles = rowsParaContar.filter((r) => r.disponibilidad).length;
    const noDisponibles = total - disponibles;
    const bajas = rows.filter((r) => r.estatus === "BAJA").length;
    return { total, activas, disponibles, noDisponibles, bajas };
  }, [rows]);

  useRegisterExportable({ id: "inventario-total", type: "kpi", title: "Unidades totales", value: kpis.total });
  useRegisterExportable({ id: "inventario-activas", type: "kpi", title: "Activas", value: kpis.activas });
  useRegisterExportable({ id: "inventario-disponibles", type: "kpi", title: "Disponibles hoy", value: kpis.disponibles });
  useRegisterExportable({ id: "inventario-no-disponibles", type: "kpi", title: "No disponibles hoy", value: kpis.noDisponibles });
  useRegisterExportable({ id: "inventario-bajas", type: "kpi", title: "Bajas", value: kpis.bajas });
  useRegisterExportable({ id: "inventario-gasto-hoy", type: "kpi", title: "Gasto al día (hoy)", value: `$${gastoHoy.toLocaleString("es-MX")}` });

  return (
    <div className="flex flex-col gap-6">
      {puedeConfigurar && (
        <div className="flex justify-end">
          <Link
            href="/usuarios/widgets"
            className="flex items-center gap-2 rounded-md px-4 h-10"
            style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            <LayoutGrid size={16} /> Configurar widgets
          </Link>
        </div>
      )}
      <InventarioUnidades rows={rows} widgetsActivos={widgetsActivos} gastoHoy={gastoHoy} puedeVerSla={puedeVerSla} slaOcultoInicial={slaOcultoInicial} />
    </div>
  );
}
