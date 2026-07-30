"use client";

import { useState } from "react";
import { BI_DATASETS, obtenerDataset, type WidgetDashboardBI } from "@/lib/bi/metadata";
import { SelectoresCombinacion, type CombinacionBI, fieldStyle, labelStyle } from "@/components/bi/selectores-combinacion";

export function BiAgregarWidget({ onAgregar, onCancelar }: { onAgregar: (widget: Omit<WidgetDashboardBI, "id" | "layout">) => void; onCancelar: () => void }) {
  const [combinacion, setCombinacion] = useState<CombinacionBI>({
    datasetId: BI_DATASETS[0].id,
    ejeX: BI_DATASETS[0].campos[0].id,
    ejeY: BI_DATASETS[0].campos[0].id,
    agregacion: "conteo",
    tipoGrafica: "barras",
  });
  const [label, setLabel] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dataset = obtenerDataset(combinacion.datasetId)!;
    const etiqueta = label.trim() || `${dataset.label} — ${dataset.campos.find((c) => c.id === combinacion.ejeX)?.label}`;
    onAgregar({
      label: etiqueta,
      dataset: combinacion.datasetId,
      ejeX: combinacion.ejeX,
      ejeY: combinacion.ejeY,
      agregacion: combinacion.agregacion,
      tipoGrafica: combinacion.tipoGrafica,
      ejeSplit: combinacion.ejeSplit,
      orden: combinacion.orden,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div>
        <label style={labelStyle}>Nombre del widget</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej. Unidades por marca" style={fieldStyle} />
      </div>

      <SelectoresCombinacion combinacion={combinacion} onChange={setCombinacion} />

      <div className="flex items-center gap-2">
        <button type="submit" className="rounded-md px-4 h-9 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
          Agregar al dashboard
        </button>
        <button type="button" onClick={onCancelar} className="rounded-md px-4 h-9" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
