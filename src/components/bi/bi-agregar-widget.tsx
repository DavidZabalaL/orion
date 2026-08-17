"use client";

import { useMemo, useState } from "react";
import { BI_DATASETS, obtenerDataset, type WidgetDashboardBI } from "@/lib/bi/metadata";
import { SelectoresCombinacion, type CombinacionBI, type ProyectoDisponible, fieldStyle, labelStyle } from "@/components/bi/selectores-combinacion";
import { BiChart } from "@/components/bi/bi-chart";
import { useBiQuery } from "@/components/bi/use-bi-query";

export function BiAgregarWidget({
  valorInicial,
  onGuardar,
  onCancelar,
  proyectosDisponibles,
  compacto = false,
}: {
  /** Si se pasa, el formulario edita ese widget en vez de crear uno nuevo. */
  valorInicial?: { label: string; combinacion: CombinacionBI; emiteFiltro?: boolean; escuchaFiltro?: boolean };
  onGuardar: (widget: Omit<WidgetDashboardBI, "id" | "layout">) => void;
  onCancelar: () => void;
  proyectosDisponibles: ProyectoDisponible[];
  compacto?: boolean;
}) {
  const [combinacion, setCombinacion] = useState<CombinacionBI>(
    valorInicial?.combinacion ?? {
      datasetId: BI_DATASETS[0].id,
      ejeX: BI_DATASETS[0].campos[0].id,
      ejeY: BI_DATASETS[0].campos[0].id,
      agregacion: "conteo",
      tipoGrafica: "barras",
    }
  );
  const [label, setLabel] = useState(valorInicial?.label ?? "");
  const [emiteFiltro, setEmiteFiltro] = useState(valorInicial?.emiteFiltro ?? false);
  const [escuchaFiltro, setEscuchaFiltro] = useState(valorInicial?.escuchaFiltro ?? false);

  const dataset = obtenerDataset(combinacion.datasetId)!;
  const etiquetaPreview = label.trim() || `${dataset.label} — ${dataset.campos.find((c) => c.id === combinacion.ejeX)?.label}`;

  const params = useMemo(
    () => ({
      dataset: combinacion.datasetId,
      ejeX: combinacion.ejeX,
      ejeY: combinacion.ejeY,
      agregacion: combinacion.agregacion,
      tipoGrafica: combinacion.tipoGrafica,
      ejeSplit: combinacion.ejeSplit,
      orden: combinacion.orden,
      filtros: combinacion.filtros,
      proyectoIds: combinacion.proyectoIds,
    }),
    [combinacion]
  );
  const { datos, cajas, pares, splitLabels, cruzado, ejeYLabel, cargando, error } = useBiQuery(params);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onGuardar({
      label: etiquetaPreview,
      dataset: combinacion.datasetId,
      ejeX: combinacion.ejeX,
      ejeY: combinacion.ejeY,
      agregacion: combinacion.agregacion,
      tipoGrafica: combinacion.tipoGrafica,
      ejeSplit: combinacion.ejeSplit,
      orden: combinacion.orden,
      filtros: combinacion.filtros,
      proyectoIds: combinacion.proyectoIds,
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

      <SelectoresCombinacion combinacion={combinacion} onChange={setCombinacion} proyectosDisponibles={proyectosDisponibles} compacto={compacto} />

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

      <div>
        <label style={labelStyle}>Vista previa</label>
        <div className="rounded-xl p-4" style={{ background: "var(--field-bg)", height: 240 }}>
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
              <BiChart datos={datos} cajas={cajas} pares={pares} splitLabels={splitLabels} cruzado={cruzado} tipoGrafica={combinacion.tipoGrafica} ejeYLabel={ejeYLabel} agregacion={combinacion.agregacion} />
            )}
          </div>
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
