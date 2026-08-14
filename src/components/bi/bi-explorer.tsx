"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Table2 } from "lucide-react";
import { BI_DATASETS, BI_COMBINACIONES_SUGERIDAS, obtenerDataset } from "@/lib/bi/metadata";
import { BiChart } from "@/components/bi/bi-chart";
import { BiTablaCruzada } from "@/components/bi/bi-tabla-cruzada";
import { ExportarMenu } from "@/components/bi/exportar-menu";
import { useBiQuery } from "@/components/bi/use-bi-query";
import { SelectoresCombinacion, type CombinacionBI, type ProyectoDisponible } from "@/components/bi/selectores-combinacion";
import { AnalisisAvanzado } from "@/components/bi/analisis-avanzado";
import { registrarAccesoBI } from "@/app/(app)/reportes/bi/actions";

export type MetricaDisponible = {
  id: string;
  nombre: string;
  datasetId: string;
  campoId: string;
  agregacion: "conteo" | "suma" | "promedio";
  filtrosBase: { campoId: string; valores: string[] }[];
};

export function BiExplorer({ proyectosDisponibles, metricasDisponibles = [] }: { proyectosDisponibles: ProyectoDisponible[]; metricasDisponibles?: MetricaDisponible[] }) {
  const [combinacion, setCombinacion] = useState<CombinacionBI>({
    datasetId: BI_DATASETS[0].id,
    ejeX: BI_DATASETS[0].campos[0].id,
    ejeY: BI_DATASETS[0].campos[0].id,
    agregacion: "conteo",
    tipoGrafica: "barras",
  });
  const [verTabla, setVerTabla] = useState(false);

  useEffect(() => {
    const clave = "bi-vio:explorador:general";
    if (sessionStorage.getItem(clave)) return;
    sessionStorage.setItem(clave, "1");
    void registrarAccesoBI({ tipoRecurso: "explorador", accion: "vio" });
  }, []);

  const dataset = obtenerDataset(combinacion.datasetId)!;
  const soportaTabla = combinacion.tipoGrafica !== "caja" && combinacion.tipoGrafica !== "piramide";

  function aplicarSugerencia(s: (typeof BI_COMBINACIONES_SUGERIDAS)[number]) {
    setCombinacion({ datasetId: s.dataset, ejeX: s.ejeX, ejeY: s.ejeY, agregacion: s.agregacion, tipoGrafica: s.tipoGrafica, ejeSplit: s.ejeSplit, orden: s.orden });
  }

  // Aplicar una métrica guardada solo pre-llena dataset/ejeY/agregación/filtros
  // base — el resto de los controles (ejeX, tipo de gráfica, filtros
  // adicionales) queda libre. La métrica nunca ejecuta nada por su cuenta: el
  // backend re-valida dataset/campoId contra el whitelist igual que cualquier
  // otra combinación.
  function aplicarMetrica(m: MetricaDisponible) {
    const ds = obtenerDataset(m.datasetId)!;
    const ejeXValido = ds.campos.some((c) => c.id === combinacion.ejeX && combinacion.datasetId === m.datasetId);
    setCombinacion({
      datasetId: m.datasetId,
      ejeX: ejeXValido ? combinacion.ejeX : ds.campos[0].id,
      ejeY: m.campoId,
      agregacion: m.agregacion,
      tipoGrafica: "barras",
      filtros: m.filtrosBase.length > 0 ? m.filtrosBase : undefined,
    });
  }

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
  const { datos, cajas, pares, splitLabels, cruzado, ejeYLabel, truncado, cargando, error } = useBiQuery(params);
  const ejeXLabel = dataset.campos.find((c) => c.id === combinacion.ejeX)?.label ?? combinacion.ejeX;
  const graficaRef = useRef<HTMLDivElement>(null);

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

      {metricasDisponibles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            Métricas guardadas
          </span>
          {metricasDisponibles.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => aplicarMetrica(m)}
              className="rounded-full px-3 py-1.5"
              style={{ background: "var(--color-primary-subtle, var(--chip))", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", border: "1px solid var(--field-border)" }}
            >
              {m.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <SelectoresCombinacion combinacion={combinacion} onChange={setCombinacion} proyectosDisponibles={proyectosDisponibles} />

        <div className="mt-5 flex items-center justify-between">
          <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            {dataset.label}
          </h3>
          {(soportaTabla || cruzado) && (
            <button
              type="button"
              onClick={() => setVerTabla((v) => !v)}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5"
              style={{ background: "var(--chip)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}
            >
              <Table2 size={13} /> {verTabla ? "Ver gráfica" : "Ver tabla"}
            </button>
          )}
          {!cargando && !error && (
            <ExportarMenu dataset={combinacion.datasetId} ejeXLabel={ejeXLabel} ejeYLabel={ejeYLabel} datos={datos} proyectoIds={combinacion.proyectoIds} contenedorRef={graficaRef} tipoRecurso="explorador" />
          )}
        </div>

        <div ref={graficaRef} className="mt-3" style={{ minHeight: 320 }}>
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
          ) : verTabla && soportaTabla ? (
            <TablaDatos datos={datos} ejeXLabel={ejeXLabel} ejeYLabel={ejeYLabel} />
          ) : (
            <BiChart datos={datos} cajas={cajas} pares={pares} splitLabels={splitLabels} cruzado={cruzado} tipoGrafica={combinacion.tipoGrafica} ejeYLabel={ejeYLabel} agregacion={combinacion.agregacion} truncado={truncado} />
          )}
        </div>
      </div>

      <AnalisisAvanzado datasetId={combinacion.datasetId} proyectoIds={combinacion.proyectoIds} filtros={combinacion.filtros} />
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
