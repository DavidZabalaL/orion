"use client";

import { useState } from "react";
import { BI_DATASETS, obtenerDataset, type TipoGrafica, type TamanoWidget, type WidgetDashboardBI } from "@/lib/bi/metadata";

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
  width: "100%",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  display: "block",
  marginBottom: 6,
};

export function BiAgregarWidget({ onAgregar, onCancelar }: { onAgregar: (widget: Omit<WidgetDashboardBI, "id">) => void; onCancelar: () => void }) {
  const [datasetId, setDatasetId] = useState(BI_DATASETS[0].id);
  const dataset = obtenerDataset(datasetId)!;
  const [ejeX, setEjeX] = useState(dataset.dimensiones[0].id);
  const [ejeY, setEjeY] = useState(dataset.metricas[0].id);
  const [tipoGrafica, setTipoGrafica] = useState<TipoGrafica>("barras");
  const [tamano, setTamano] = useState<TamanoWidget>("sm");
  const [label, setLabel] = useState("");

  function cambiarDataset(id: string) {
    const ds = obtenerDataset(id)!;
    setDatasetId(id);
    setEjeX(ds.dimensiones[0].id);
    setEjeY(ds.metricas[0].id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const etiqueta = label.trim() || `${dataset.label} — ${dataset.dimensiones.find((d) => d.id === ejeX)?.label}`;
    onAgregar({ label: etiqueta, dataset: datasetId, ejeX, ejeY, tipoGrafica, tamano });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label style={labelStyle}>Nombre del widget</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej. Unidades por marca" style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Dataset</label>
          <select value={datasetId} onChange={(e) => cambiarDataset(e.target.value)} style={fieldStyle}>
            {BI_DATASETS.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Eje X (dimensión)</label>
          <select value={ejeX} onChange={(e) => setEjeX(e.target.value)} style={fieldStyle}>
            {dataset.dimensiones.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Eje Y (métrica)</label>
          <select value={ejeY} onChange={(e) => setEjeY(e.target.value)} style={fieldStyle}>
            {dataset.metricas.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Tipo de gráfica</label>
          <select value={tipoGrafica} onChange={(e) => setTipoGrafica(e.target.value as TipoGrafica)} style={fieldStyle}>
            <option value="barras">Barras</option>
            <option value="lineas">Líneas</option>
            <option value="pie">Pie</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Tamaño</label>
          <select value={tamano} onChange={(e) => setTamano(e.target.value as TamanoWidget)} style={fieldStyle}>
            <option value="sm">Pequeño</option>
            <option value="md">Mediano</option>
            <option value="lg">Grande (ancho completo)</option>
          </select>
        </div>
      </div>
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
