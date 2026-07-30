"use client";

import { useState } from "react";
import { Table2, BarChart3, LineChart, PieChart } from "lucide-react";
import { BI_DATASETS, BI_COMBINACIONES_SUGERIDAS, obtenerDataset, type TipoGrafica } from "@/lib/bi/metadata";
import { BiChart, type BiDato } from "@/components/bi/bi-chart";
import { useBiQuery } from "@/components/bi/use-bi-query";

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
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

const TIPOS: { value: TipoGrafica; label: string; icon: typeof BarChart3 }[] = [
  { value: "barras", label: "Barras", icon: BarChart3 },
  { value: "lineas", label: "Líneas", icon: LineChart },
  { value: "pie", label: "Pie", icon: PieChart },
];

export function BiExplorer() {
  const [datasetId, setDatasetId] = useState(BI_DATASETS[0].id);
  const dataset = obtenerDataset(datasetId)!;

  const [ejeX, setEjeX] = useState(dataset.dimensiones[0].id);
  const [ejeY, setEjeY] = useState(dataset.metricas[0].id);
  const [tipoGrafica, setTipoGrafica] = useState<TipoGrafica>("barras");
  const [verTabla, setVerTabla] = useState(false);

  function cambiarDataset(id: string) {
    const ds = obtenerDataset(id)!;
    setDatasetId(id);
    setEjeX(ds.dimensiones[0].id);
    setEjeY(ds.metricas[0].id);
  }

  function aplicarSugerencia(s: (typeof BI_COMBINACIONES_SUGERIDAS)[number]) {
    setDatasetId(s.dataset);
    setEjeX(s.ejeX);
    setEjeY(s.ejeY);
    setTipoGrafica(s.tipoGrafica);
  }

  const { datos, ejeYLabel, cargando, error } = useBiQuery(datasetId, ejeX, ejeY);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {BI_COMBINACIONES_SUGERIDAS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => aplicarSugerencia(s)}
            className="rounded-full px-3 py-1.5"
            style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label style={labelStyle}>Dataset</label>
            <select value={datasetId} onChange={(e) => cambiarDataset(e.target.value)} style={{ ...fieldStyle, width: "100%" }}>
              {BI_DATASETS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Eje X (dimensión)</label>
            <select value={ejeX} onChange={(e) => setEjeX(e.target.value)} style={{ ...fieldStyle, width: "100%" }}>
              {dataset.dimensiones.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Eje Y (métrica)</label>
            <select value={ejeY} onChange={(e) => setEjeY(e.target.value)} style={{ ...fieldStyle, width: "100%" }}>
              {dataset.metricas.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tipo de gráfica</label>
            <div className="flex gap-1.5">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipoGrafica(t.value)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md"
                  style={{
                    height: "var(--h-md)",
                    background: tipoGrafica === t.value ? "var(--color-primary)" : "var(--field-bg)",
                    color: tipoGrafica === t.value ? "#fff" : "var(--sidebar-text)",
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            {dataset.label}
          </h3>
          <button
            type="button"
            onClick={() => setVerTabla((v) => !v)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5"
            style={{ background: "var(--chip)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}
          >
            <Table2 size={13} /> {verTabla ? "Ver gráfica" : "Ver tabla"}
          </button>
        </div>

        <div className="mt-3">
          {cargando ? (
            <div className="flex items-center justify-center p-10" style={{ color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
              Cargando…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-10" style={{ color: "var(--color-error)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
              {error}
            </div>
          ) : verTabla ? (
            <TablaDatos datos={datos} ejeXLabel={dataset.dimensiones.find((d) => d.id === ejeX)?.label ?? ejeX} ejeYLabel={ejeYLabel} />
          ) : (
            <BiChart datos={datos} tipoGrafica={tipoGrafica} ejeYLabel={ejeYLabel} />
          )}
        </div>
      </div>
    </div>
  );
}

function TablaDatos({ datos, ejeXLabel, ejeYLabel }: { datos: BiDato[]; ejeXLabel: string; ejeYLabel: string }) {
  return (
    <table className="w-full" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
      <thead>
        <tr style={{ color: "var(--sidebar-text)", textAlign: "left" }}>
          <th className="py-2">{ejeXLabel}</th>
          <th className="py-2">{ejeYLabel}</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((d) => (
          <tr key={d.dimension} style={{ borderTop: "1px solid var(--field-border)", color: "var(--sidebar-text-active)" }}>
            <td className="py-2">{d.dimension}</td>
            <td className="py-2">{new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(d.valor)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
