"use client";

import { BarChart3, LineChart, PieChart, Hash } from "lucide-react";
import {
  BI_DATASETS,
  obtenerDataset,
  obtenerCampo,
  agregacionesDisponibles,
  AGREGACION_LABEL,
  type TipoGrafica,
  type TipoAgregacion,
} from "@/lib/bi/metadata";

export const fieldStyle: React.CSSProperties = {
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

export const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  display: "block",
  marginBottom: 6,
};

const TIPOS_GRAFICA: { value: TipoGrafica; label: string; icon: typeof BarChart3 }[] = [
  { value: "barras", label: "Barras", icon: BarChart3 },
  { value: "lineas", label: "Líneas", icon: LineChart },
  { value: "pie", label: "Pie", icon: PieChart },
  { value: "contador", label: "Contador", icon: Hash },
];

export type CombinacionBI = {
  datasetId: string;
  ejeX: string;
  ejeY: string;
  agregacion: TipoAgregacion;
  tipoGrafica: TipoGrafica;
};

/**
 * Selectores de dataset + eje X + eje Y + agregación + tipo de gráfica.
 * Eje X y eje Y comparten exactamente el mismo catálogo de campos por
 * dataset — solo cambia que el eje Y además elige cómo se agrega.
 */
export function SelectoresCombinacion({
  combinacion,
  onChange,
}: {
  combinacion: CombinacionBI;
  onChange: (siguiente: CombinacionBI) => void;
}) {
  const dataset = obtenerDataset(combinacion.datasetId)!;
  const campoY = obtenerCampo(dataset, combinacion.ejeY);
  const agregacionesValidas = campoY ? agregacionesDisponibles(campoY) : ["conteo"];

  function cambiarDataset(datasetId: string) {
    const ds = obtenerDataset(datasetId)!;
    onChange({ ...combinacion, datasetId, ejeX: ds.campos[0].id, ejeY: ds.campos[0].id, agregacion: "conteo" });
  }

  function cambiarEjeY(ejeY: string) {
    const campo = obtenerCampo(dataset, ejeY)!;
    const valida = agregacionesDisponibles(campo);
    onChange({ ...combinacion, ejeY, agregacion: valida.includes(combinacion.agregacion) ? combinacion.agregacion : valida[0] });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label style={labelStyle}>Dataset</label>
        <select value={combinacion.datasetId} onChange={(e) => cambiarDataset(e.target.value)} style={fieldStyle}>
          {BI_DATASETS.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Eje X</label>
        <select value={combinacion.ejeX} onChange={(e) => onChange({ ...combinacion, ejeX: e.target.value })} style={fieldStyle}>
          {dataset.campos.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Eje Y</label>
        <select value={combinacion.ejeY} onChange={(e) => cambiarEjeY(e.target.value)} style={fieldStyle}>
          {dataset.campos.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Agregación</label>
        <select value={combinacion.agregacion} onChange={(e) => onChange({ ...combinacion, agregacion: e.target.value as TipoAgregacion })} style={fieldStyle}>
          {(["conteo", "suma", "promedio"] as const).map((a) => (
            <option key={a} value={a} disabled={!agregacionesValidas.includes(a)}>{AGREGACION_LABEL[a]}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Tipo de gráfica</label>
        <div className="flex gap-1.5">
          {TIPOS_GRAFICA.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ ...combinacion, tipoGrafica: t.value })}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md"
              style={{
                height: "var(--h-md)",
                background: combinacion.tipoGrafica === t.value ? "var(--color-primary)" : "var(--field-bg)",
                color: combinacion.tipoGrafica === t.value ? "#fff" : "var(--sidebar-text)",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-sm)",
              }}
              title={t.label}
            >
              <t.icon size={14} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
