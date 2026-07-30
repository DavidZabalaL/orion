"use client";

import { useState } from "react";
import { Table2 } from "lucide-react";
import { BI_DATASETS, BI_COMBINACIONES_SUGERIDAS, obtenerDataset } from "@/lib/bi/metadata";
import { BiChart } from "@/components/bi/bi-chart";
import { useBiQuery } from "@/components/bi/use-bi-query";
import { SelectoresCombinacion, type CombinacionBI } from "@/components/bi/selectores-combinacion";

export function BiExplorer() {
  const [combinacion, setCombinacion] = useState<CombinacionBI>({
    datasetId: BI_DATASETS[0].id,
    ejeX: BI_DATASETS[0].campos[0].id,
    ejeY: BI_DATASETS[0].campos[0].id,
    agregacion: "conteo",
    tipoGrafica: "barras",
  });
  const [verTabla, setVerTabla] = useState(false);

  const dataset = obtenerDataset(combinacion.datasetId)!;

  function aplicarSugerencia(s: (typeof BI_COMBINACIONES_SUGERIDAS)[number]) {
    setCombinacion({ datasetId: s.dataset, ejeX: s.ejeX, ejeY: s.ejeY, agregacion: s.agregacion, tipoGrafica: s.tipoGrafica });
  }

  const { datos, ejeYLabel, cargando, error } = useBiQuery(combinacion.datasetId, combinacion.ejeX, combinacion.ejeY, combinacion.agregacion);

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
        <SelectoresCombinacion combinacion={combinacion} onChange={setCombinacion} />

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
            <TablaDatos datos={datos} ejeXLabel={dataset.campos.find((c) => c.id === combinacion.ejeX)?.label ?? combinacion.ejeX} ejeYLabel={ejeYLabel} />
          ) : (
            <BiChart datos={datos} tipoGrafica={combinacion.tipoGrafica} ejeYLabel={ejeYLabel} agregacion={combinacion.agregacion} />
          )}
        </div>
      </div>
    </div>
  );
}

function TablaDatos({ datos, ejeXLabel, ejeYLabel }: { datos: { dimension: string; valor: number }[]; ejeXLabel: string; ejeYLabel: string }) {
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
