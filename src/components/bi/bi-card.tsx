"use client";

import { useMemo, useState } from "react";
import { X, Pencil, GripVertical, Table2 } from "lucide-react";
import { BiChart } from "@/components/bi/bi-chart";
import { BiTablaCruzada } from "@/components/bi/bi-tabla-cruzada";
import { useBiQuery } from "@/components/bi/use-bi-query";
import { obtenerDataset, obtenerCampo, type TipoGrafica, type TipoAgregacion, type TipoOrden, type FiltroGuardable } from "@/lib/bi/metadata";

export function BiCard({
  label,
  dataset,
  ejeX,
  ejeY,
  agregacion,
  tipoGrafica,
  ejeSplit,
  orden,
  filtros,
  proyectoIds,
  editMode = false,
  onEditar,
  onEliminar,
}: {
  label: string;
  dataset: string;
  ejeX: string;
  ejeY: string;
  agregacion: TipoAgregacion;
  tipoGrafica: TipoGrafica;
  ejeSplit?: string;
  orden?: TipoOrden;
  filtros?: FiltroGuardable[];
  proyectoIds?: string[];
  editMode?: boolean;
  onEditar?: () => void;
  onEliminar?: () => void;
}) {
  const [verTabla, setVerTabla] = useState(false);
  const params = useMemo(
    () => ({ dataset, ejeX, ejeY, agregacion, tipoGrafica, ejeSplit, orden, filtros, proyectoIds }),
    [dataset, ejeX, ejeY, agregacion, tipoGrafica, ejeSplit, orden, filtros, proyectoIds]
  );
  const { datos, cajas, pares, splitLabels, cruzado, ejeYLabel, truncado, cargando, error } = useBiQuery(params);
  const ejeXLabel = obtenerCampo(obtenerDataset(dataset)!, ejeX)?.label ?? ejeX;

  return (
    <div className="flex h-full flex-col rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div className={`mb-3 flex items-center justify-between gap-2 ${editMode ? "bi-drag-handle cursor-move" : ""}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          {editMode && <GripVertical size={14} color="var(--sidebar-text)" className="shrink-0" data-no-print />}
          <h3 className="truncate" style={{ fontFamily: "var(--font)", fontSize: "var(--text-md)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            {label}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1.5" data-no-print>
          {cruzado && (
            <button
              type="button"
              onClick={() => setVerTabla((v) => !v)}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-6 items-center gap-1 rounded-md px-2"
              style={{ background: "var(--chip)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}
              title={verTabla ? "Ver gráfica" : "Ver tabla"}
            >
              <Table2 size={12} /> {verTabla ? "Gráfica" : "Tabla"}
            </button>
          )}
          {editMode && (
            <>
              <button
                type="button"
                onClick={onEditar}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{ background: "var(--chip)", color: "var(--sidebar-text-active)" }}
                title="Editar este widget"
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={onEliminar}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)" }}
                title="Quitar de la vista"
              >
                <X size={13} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {cargando ? (
          <div className="flex items-center justify-center p-10" style={{ color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
            Cargando…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-10" style={{ color: "var(--color-error)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
            {error}
          </div>
        ) : verTabla && cruzado ? (
          <BiTablaCruzada cruzado={cruzado} ejeXLabel={ejeXLabel} />
        ) : (
          <BiChart datos={datos} cajas={cajas} pares={pares} splitLabels={splitLabels} cruzado={cruzado} tipoGrafica={tipoGrafica} ejeYLabel={ejeYLabel} agregacion={agregacion} truncado={truncado} />
        )}
      </div>
    </div>
  );
}
