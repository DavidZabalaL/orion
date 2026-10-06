"use client";

import { useMemo, useState } from "react";
import { BI_DATASETS, obtenerDataset, type WidgetDashboardBI } from "@/lib/bi/metadata";
import { SelectoresCombinacion, AlcanceProyecto, type CombinacionBI, type ProyectoDisponible, fieldStyle, labelStyle } from "@/components/bi/selectores-combinacion";
import { SelectorTablaFilas } from "@/components/bi/selector-tabla-filas";
import { BiCardTablaFilas } from "@/components/bi/bi-card-tabla-filas";
import { BiChart } from "@/components/bi/bi-chart";
import { useBiQuery } from "@/components/bi/use-bi-query";

type TipoWidget = "grafica" | "tabla_filas";

export function BiAgregarWidget({
  valorInicial,
  onGuardar,
  onCancelar,
  proyectosDisponibles,
  compacto = false,
}: {
  /** Si se pasa, el formulario edita ese widget en vez de crear uno nuevo. */
  valorInicial?: { label: string; combinacion: CombinacionBI; tipoWidget?: TipoWidget; columnas?: string[]; emiteFiltro?: boolean; escuchaFiltro?: boolean };
  onGuardar: (widget: Omit<WidgetDashboardBI, "id" | "layout">) => void;
  onCancelar: () => void;
  proyectosDisponibles: ProyectoDisponible[];
  compacto?: boolean;
}) {
  const [tipoWidget, setTipoWidget] = useState<TipoWidget>(valorInicial?.tipoWidget ?? "grafica");
  const [combinacion, setCombinacion] = useState<CombinacionBI>(
    valorInicial?.combinacion ?? {
      datasetId: BI_DATASETS[0].id,
      ejeX: BI_DATASETS[0].campos[0].id,
      ejeY: BI_DATASETS[0].campos[0].id,
      agregacion: "conteo",
      tipoGrafica: "barras",
    }
  );
  const [columnasTabla, setColumnasTabla] = useState<string[]>(valorInicial?.columnas ?? [BI_DATASETS[0].campos[0].id]);
  const [label, setLabel] = useState(valorInicial?.label ?? "");
  const [emiteFiltro, setEmiteFiltro] = useState(valorInicial?.emiteFiltro ?? false);
  const [escuchaFiltro, setEscuchaFiltro] = useState(valorInicial?.escuchaFiltro ?? false);

  const dataset = obtenerDataset(combinacion.datasetId)!;
  const etiquetaPreview =
    label.trim() || (tipoWidget === "tabla_filas" ? `${dataset.label} — tabla` : `${dataset.label} — ${dataset.campos.find((c) => c.id === combinacion.ejeX)?.label}`);

  const params = useMemo(
    () => ({
      dataset: combinacion.datasetId,
      ejeX: combinacion.ejeX,
      ejeY: combinacion.ejeY,
      agregacion: combinacion.agregacion,
      tipoGrafica: combinacion.tipoGrafica,
      ejeSplit: combinacion.ejeSplit,
      ejeMeta: combinacion.ejeMeta,
      orden: combinacion.orden,
      filtros: combinacion.filtros,
      proyectoIds: combinacion.proyectoIds,
    }),
    [combinacion]
  );
  const { datos, cajas, pares, splitLabels, cruzado, ejeYLabel, ejeYSufijo, ejeMetaLabel, ejeMetaSufijo, cargando, error } = useBiQuery(params);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tipoWidget === "tabla_filas") {
      onGuardar({
        label: etiquetaPreview,
        dataset: combinacion.datasetId,
        tipoWidget: "tabla_filas",
        columnas: columnasTabla,
        // Relleno: este widget no usa estos 4 campos (ver tipoWidget).
        ejeX: columnasTabla[0],
        ejeY: columnasTabla[0],
        agregacion: "conteo",
        tipoGrafica: "barras",
        proyectoIds: combinacion.proyectoIds,
      });
      return;
    }
    onGuardar({
      label: etiquetaPreview,
      dataset: combinacion.datasetId,
      ejeX: combinacion.ejeX,
      ejeY: combinacion.ejeY,
      agregacion: combinacion.agregacion,
      tipoGrafica: combinacion.tipoGrafica,
      ejeSplit: combinacion.ejeSplit,
      ejeMeta: combinacion.ejeMeta,
      orden: combinacion.orden,
      orientacion: combinacion.orientacion,
      colorimetria: combinacion.colorimetria,
      vistaPreferida: combinacion.vistaPreferida,
      filtros: combinacion.filtros,
      proyectoIds: combinacion.proyectoIds,
      reglasColor: combinacion.reglasColor,
      emiteFiltro: emiteFiltro || undefined,
      escuchaFiltro: escuchaFiltro || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className={compacto ? "flex flex-col gap-4" : "rounded-xl p-5 flex flex-col gap-4"} style={compacto ? undefined : { background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div>
        <label style={labelStyle}>Nombre del widget</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej. Unidades por marca" style={fieldStyle} />
      </div>

      <div>
        <label style={labelStyle}>Tipo de widget</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipoWidget("grafica")}
            className="flex-1 rounded-md px-3 h-9 font-semibold"
            style={{ background: tipoWidget === "grafica" ? "var(--color-primary)" : "var(--chip)", color: tipoWidget === "grafica" ? "#fff" : "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
          >
            Gráfica
          </button>
          <button
            type="button"
            onClick={() => setTipoWidget("tabla_filas")}
            className="flex-1 rounded-md px-3 h-9 font-semibold"
            style={{ background: tipoWidget === "tabla_filas" ? "var(--color-primary)" : "var(--chip)", color: tipoWidget === "tabla_filas" ? "#fff" : "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
          >
            Tabla de registros
          </button>
        </div>
      </div>

      {tipoWidget === "grafica" ? (
        <SelectoresCombinacion combinacion={combinacion} onChange={setCombinacion} proyectosDisponibles={proyectosDisponibles} compacto={compacto} />
      ) : (
        <>
          <SelectorTablaFilas
            datasetId={combinacion.datasetId}
            columnas={columnasTabla}
            onChangeDataset={(datasetId) => setCombinacion({ ...combinacion, datasetId })}
            onChangeColumnas={setColumnasTabla}
          />
          <AlcanceProyecto combinacion={combinacion} onChange={setCombinacion} proyectosDisponibles={proyectosDisponibles} />
        </>
      )}

      {tipoWidget === "grafica" && (
        <div className="flex flex-col gap-2">
          <label style={labelStyle}>Interactividad (cross-filter)</label>
          <label className="flex items-center gap-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>
            <input type="checkbox" checked={emiteFiltro} onChange={(e) => setEmiteFiltro(e.target.checked)} />
            Al hacer clic en una categoría, filtra los demás widgets marcados &quot;escucha&quot;
          </label>
          <label className="flex items-center gap-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>
            <input type="checkbox" checked={escuchaFiltro} onChange={(e) => setEscuchaFiltro(e.target.checked)} />
            Escucha el filtro de otros widgets marcados &quot;emite&quot;
          </label>
        </div>
      )}

      <div>
        <label style={labelStyle}>Vista previa</label>
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--field-bg)", height: 280 }}>
          {tipoWidget === "tabla_filas" ? (
            <BiCardTablaFilas label={etiquetaPreview} dataset={combinacion.datasetId} columnas={columnasTabla} proyectoIds={combinacion.proyectoIds} />
          ) : (
            <div className="p-4 h-full" style={{ overflow: "hidden" }}>
              <div className="mb-2 truncate" style={{ fontFamily: "var(--font)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                {etiquetaPreview}
              </div>
              <div style={{ height: "calc(100% - 24px)" }}>
                {cargando ? (
                  <div className="flex h-full items-center justify-center" style={{ color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
                    Cargando…
                  </div>
                ) : error ? (
                  <div className="flex h-full items-center justify-center text-center" style={{ color: "var(--color-error)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
                    {error}
                  </div>
                ) : (
                  <BiChart datos={datos} cajas={cajas} pares={pares} splitLabels={splitLabels} cruzado={cruzado} tipoGrafica={combinacion.tipoGrafica} ejeYLabel={ejeYLabel} ejeYSufijo={ejeYSufijo} ejeMetaLabel={ejeMetaLabel} ejeMetaSufijo={ejeMetaSufijo} orientacion={combinacion.orientacion} colorimetria={combinacion.colorimetria} agregacion={combinacion.agregacion} reglasColor={combinacion.reglasColor} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={compacto ? "flex flex-col gap-2" : "flex items-center gap-2"}>
        <button type="submit" className="rounded-md px-4 h-9 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
          {valorInicial ? "Guardar cambios del widget" : "Agregar al dashboard"}
        </button>
        <button type="button" onClick={onCancelar} className="rounded-md px-4 h-9" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
