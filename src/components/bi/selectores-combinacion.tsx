"use client";

import { BarChart3, LineChart, PieChart, Hash, Circle, SplitSquareHorizontal, BarChart2, ScatterChart, CalendarDays, Boxes, Users, MapPinned } from "lucide-react";
import {
  BI_DATASETS,
  obtenerDataset,
  obtenerCampo,
  agregacionesDisponibles,
  campoValidoParaEje,
  REQUISITOS_TIPO_GRAFICA,
  TIPO_GRAFICA_LABEL,
  AGREGACION_LABEL,
  type TipoGrafica,
  type TipoAgregacion,
  type TipoOrden,
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

const TIPOS_GRAFICA: { value: TipoGrafica; icon: typeof BarChart3 }[] = [
  { value: "barras", icon: BarChart3 },
  { value: "lineas", icon: LineChart },
  { value: "pie", icon: PieChart },
  { value: "contador", icon: Hash },
  { value: "puntos", icon: Circle },
  { value: "divergente", icon: SplitSquareHorizontal },
  { value: "histograma", icon: BarChart2 },
  { value: "dispersion", icon: ScatterChart },
  { value: "calendario", icon: CalendarDays },
  { value: "caja", icon: Boxes },
  { value: "piramide", icon: Users },
  { value: "mapa", icon: MapPinned },
];

const ORDEN_LABEL: Record<TipoOrden, string> = {
  dimension: "Natural (nombre / fecha)",
  valor_desc: "Mayor a menor",
  valor_asc: "Menor a mayor",
};

const TIPO_CAMPO_LABEL: Record<string, string> = {
  texto: "texto",
  numero: "numérico",
  fecha_mes: "mes",
  fecha_dia: "día",
  geografico: "estado",
};

function sufijoRequisito(requisito: string[] | "cualquiera" | "ninguno"): string {
  if (requisito === "cualquiera" || requisito === "ninguno") return "";
  return ` (${requisito.map((t) => TIPO_CAMPO_LABEL[t] ?? t).join("/")})`;
}

export type CombinacionBI = {
  datasetId: string;
  ejeX: string;
  ejeY: string;
  agregacion: TipoAgregacion;
  tipoGrafica: TipoGrafica;
  ejeSplit?: string;
  orden?: TipoOrden;
};

/**
 * Selectores de dataset + eje X + eje Y + agregación + tipo de gráfica.
 * Eje X y eje Y comparten exactamente el mismo catálogo de campos por
 * dataset; qué tipos de campo acepta cada eje (y si hace falta un segundo
 * campo de agrupación u orden) depende del tipo de gráfica elegido.
 */
export function SelectoresCombinacion({
  combinacion,
  onChange,
}: {
  combinacion: CombinacionBI;
  onChange: (siguiente: CombinacionBI) => void;
}) {
  const dataset = obtenerDataset(combinacion.datasetId)!;
  const requisitos = REQUISITOS_TIPO_GRAFICA[combinacion.tipoGrafica];
  const campoY = obtenerCampo(dataset, combinacion.ejeY);
  const agregacionesValidas = campoY ? agregacionesDisponibles(campoY) : ["conteo"];

  const camposEjeX = dataset.campos.filter((c) => campoValidoParaEje(c, requisitos.ejeX));
  const camposEjeY = dataset.campos.filter((c) => campoValidoParaEje(c, requisitos.ejeY));

  function cambiarDataset(datasetId: string) {
    const ds = obtenerDataset(datasetId)!;
    onChange({ ...combinacion, datasetId, ejeX: ds.campos[0].id, ejeY: ds.campos[0].id, agregacion: "conteo", ejeSplit: ds.campos[0].id });
  }

  function cambiarTipoGrafica(tipoGrafica: TipoGrafica) {
    const req = REQUISITOS_TIPO_GRAFICA[tipoGrafica];
    const nuevoEjeX = campoValidoParaEje(obtenerCampo(dataset, combinacion.ejeX)!, req.ejeX) ? combinacion.ejeX : dataset.campos.find((c) => campoValidoParaEje(c, req.ejeX))?.id ?? combinacion.ejeX;
    const nuevoEjeY = campoValidoParaEje(obtenerCampo(dataset, combinacion.ejeY)!, req.ejeY) ? combinacion.ejeY : dataset.campos.find((c) => campoValidoParaEje(c, req.ejeY))?.id ?? combinacion.ejeY;
    onChange({ ...combinacion, tipoGrafica, ejeX: nuevoEjeX, ejeY: nuevoEjeY, ejeSplit: combinacion.ejeSplit ?? dataset.campos[0].id });
  }

  function cambiarEjeY(ejeY: string) {
    const campo = obtenerCampo(dataset, ejeY)!;
    const valida = agregacionesDisponibles(campo);
    onChange({ ...combinacion, ejeY, agregacion: valida.includes(combinacion.agregacion) ? combinacion.agregacion : valida[0] });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label style={labelStyle}>Dataset</label>
          <select value={combinacion.datasetId} onChange={(e) => cambiarDataset(e.target.value)} style={fieldStyle}>
            {BI_DATASETS.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Eje X{sufijoRequisito(requisitos.ejeX)}</label>
          <select value={combinacion.ejeX} onChange={(e) => onChange({ ...combinacion, ejeX: e.target.value })} style={fieldStyle}>
            {camposEjeX.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        {requisitos.ejeY !== "ninguno" && (
          <div>
            <label style={labelStyle}>Eje Y{sufijoRequisito(requisitos.ejeY)}</label>
            <select value={combinacion.ejeY} onChange={(e) => cambiarEjeY(e.target.value)} style={fieldStyle}>
              {camposEjeY.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        )}
        {requisitos.ejeY !== "ninguno" && combinacion.tipoGrafica !== "dispersion" && combinacion.tipoGrafica !== "caja" && (
          <div>
            <label style={labelStyle}>Agregación</label>
            <select value={combinacion.agregacion} onChange={(e) => onChange({ ...combinacion, agregacion: e.target.value as TipoAgregacion })} style={fieldStyle}>
              {(["conteo", "suma", "promedio"] as const).map((a) => (
                <option key={a} value={a} disabled={!agregacionesValidas.includes(a)}>{AGREGACION_LABEL[a]}</option>
              ))}
            </select>
          </div>
        )}
        {requisitos.requiereSplit && (
          <div>
            <label style={labelStyle}>Segundo grupo (máx. 2 categorías)</label>
            <select value={combinacion.ejeSplit ?? dataset.campos[0].id} onChange={(e) => onChange({ ...combinacion, ejeSplit: e.target.value })} style={fieldStyle}>
              {dataset.campos.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        )}
        {(combinacion.tipoGrafica === "barras" || combinacion.tipoGrafica === "puntos" || combinacion.tipoGrafica === "divergente") && (
          <div>
            <label style={labelStyle}>Orden</label>
            <select value={combinacion.orden ?? "dimension"} onChange={(e) => onChange({ ...combinacion, orden: e.target.value as TipoOrden })} style={fieldStyle}>
              {(["dimension", "valor_desc", "valor_asc"] as const).map((o) => (
                <option key={o} value={o}>{ORDEN_LABEL[o]}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label style={labelStyle}>Tipo de gráfica</label>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_GRAFICA.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => cambiarTipoGrafica(t.value)}
              className="flex items-center gap-1.5 rounded-md px-3"
              style={{
                height: "var(--h-md)",
                background: combinacion.tipoGrafica === t.value ? "var(--color-primary)" : "var(--field-bg)",
                color: combinacion.tipoGrafica === t.value ? "#fff" : "var(--sidebar-text)",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-sm)",
              }}
              title={TIPO_GRAFICA_LABEL[t.value]}
            >
              <t.icon size={14} /> {TIPO_GRAFICA_LABEL[t.value]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
