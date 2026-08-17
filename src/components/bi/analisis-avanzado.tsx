"use client";

import { useState, useTransition } from "react";
import { TrendingUp, Filter, Layers } from "lucide-react";
import { obtenerDataset, agregacionesDisponibles, AGREGACION_LABEL, type TipoAgregacion, type FiltroGuardable } from "@/lib/bi/metadata";
import { fieldStyle, labelStyle } from "@/components/bi/selectores-combinacion";

const fmtPct = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 1 });
const fmtNum = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });

type Tab = "variacion" | "funnel" | "cohorte";

type FilaVariacion = { dimension: string; valor: number; valorComparacion: number | null; variacionPct: number | null };
type EtapaFunnel = { campoId: string; label: string; total: number };
type FilaCohorte = { cohorte: string; tamano: number; retencion: (number | null)[] };

/**
 * Panel compacto para los análisis nuevos del motor de BI (variación %/YoY,
 * funnel, cohorte) — deliberadamente en tablas simples en vez de gráficas
 * SVG dedicadas, para mantener el alcance acotado; el motor de consultas ya
 * soporta estos 3 modos vía /api/bi/query (tipoAnalisis), reutilizando el
 * mismo whitelist/RLS que el resto del explorador.
 */
export function AnalisisAvanzado({
  datasetId,
  proyectoIds,
  filtros,
}: {
  datasetId: string;
  proyectoIds?: string[];
  filtros?: FiltroGuardable[];
}) {
  const [tab, setTab] = useState<Tab>("variacion");
  const dataset = obtenerDataset(datasetId)!;
  const camposFecha = dataset.campos.filter((c) => c.tipo === "fecha_mes" || c.tipo === "fecha_dia");
  const camposConOpciones = dataset.campos.filter((c) => c.opciones && c.opciones.length >= 2);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Variación
  const [campoXVar, setCampoXVar] = useState(camposFecha[0]?.id ?? "");
  const [campoYVar, setCampoYVar] = useState(dataset.campos[0]?.id ?? "");
  const [agregacionVar, setAgregacionVar] = useState<TipoAgregacion>("conteo");
  const [comparacion, setComparacion] = useState<"periodo_anterior" | "mismo_periodo_anio_anterior">("periodo_anterior");
  const [filasVariacion, setFilasVariacion] = useState<FilaVariacion[] | null>(null);

  // Funnel
  const [campoFunnel, setCampoFunnel] = useState(camposConOpciones[0]?.id ?? "");
  const [etapasFunnel, setEtapasFunnel] = useState<EtapaFunnel[] | null>(null);

  // Cohorte
  const [filasCohorte, setFilasCohorte] = useState<FilaCohorte[] | null>(null);

  function ejecutarVariacion() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/bi/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset: datasetId,
          ejeX: campoXVar,
          ejeY: campoYVar,
          agregacion: agregacionVar,
          tipoGrafica: "lineas",
          tipoAnalisis: "variacion",
          comparacion,
          filtros,
          proyectoIds,
        }),
      });
      const body = await res.json();
      if (!res.ok) return setError(body.error ?? "Error al consultar.");
      setFilasVariacion(body.datos ?? []);
    });
  }

  function ejecutarFunnel() {
    setError(null);
    const campo = dataset.campos.find((c) => c.id === campoFunnel);
    if (!campo?.opciones) return;
    const etapas = campo.opciones.map((o, i) => ({ campoId: campo.id, valores: campo.opciones!.slice(i).map((x) => x.valor), label: o.label }));
    startTransition(async () => {
      const res = await fetch("/api/bi/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset: datasetId,
          ejeX: campo.id,
          ejeY: campo.id,
          agregacion: "conteo",
          tipoGrafica: "barras",
          tipoAnalisis: "funnel",
          etapas: etapas.map((e) => ({ campoId: e.campoId, valores: e.valores })),
          filtros,
          proyectoIds,
        }),
      });
      const body = await res.json();
      if (!res.ok) return setError(body.error ?? "Error al consultar.");
      const resultado: EtapaFunnel[] = (body.etapas ?? []).map((e: { total: number }, i: number) => ({ campoId: campo.id, label: etapas[i].label, total: e.total }));
      setEtapasFunnel(resultado);
    });
  }

  function ejecutarCohorte() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/bi/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset: datasetId, ejeX: "", ejeY: "", agregacion: "conteo", tipoGrafica: "barras", tipoAnalisis: "cohorte", filtros, proyectoIds }),
      });
      const body = await res.json();
      if (!res.ok) return setError(body.error ?? "Error al consultar.");
      setFilasCohorte(body.cohortes ?? []);
    });
  }

  const tabs: { id: Tab; label: string; icon: typeof TrendingUp; disponible: boolean }[] = [
    { id: "variacion", label: "Variación %", icon: TrendingUp, disponible: camposFecha.length > 0 },
    { id: "funnel", label: "Funnel", icon: Filter, disponible: camposConOpciones.length > 0 },
    { id: "cohorte", label: "Cohorte", icon: Layers, disponible: Boolean(dataset.cohorteConfig) },
  ];

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!t.disponible}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{
              background: tab === t.id ? "var(--color-primary)" : "var(--chip)",
              color: tab === t.id ? "white" : "var(--sidebar-text-active)",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--text-xs)",
              opacity: t.disponible ? 1 : 0.4,
            }}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-3" style={{ color: "var(--color-error)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>{error}</p>}

      {tab === "variacion" && camposFecha.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label style={labelStyle}>Periodo (eje fecha)</label>
              <select value={campoXVar} onChange={(e) => setCampoXVar(e.target.value)} style={fieldStyle}>
                {camposFecha.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Métrica</label>
              <select value={campoYVar} onChange={(e) => { setCampoYVar(e.target.value); setAgregacionVar("conteo"); }} style={fieldStyle}>
                {dataset.campos.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Agregación</label>
              <select value={agregacionVar} onChange={(e) => setAgregacionVar(e.target.value as TipoAgregacion)} style={fieldStyle}>
                {agregacionesDisponibles(dataset.campos.find((c) => c.id === campoYVar)!).map((a) => (
                  <option key={a} value={a}>{AGREGACION_LABEL[a]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Comparar contra</label>
              <select value={comparacion} onChange={(e) => setComparacion(e.target.value as typeof comparacion)} style={fieldStyle}>
                <option value="periodo_anterior">Periodo anterior</option>
                <option value="mismo_periodo_anio_anterior">Mismo periodo, año anterior</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={ejecutarVariacion}
            className="w-fit rounded-md px-4 py-2"
            style={{ background: "var(--color-primary)", color: "white", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
          >
            {pending ? "Calculando…" : "Calcular variación"}
          </button>
          {filasVariacion && (
            <table className="w-full" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr style={{ color: "var(--sidebar-text)", textAlign: "left" }}>
                  <th className="py-2">Periodo</th>
                  <th className="py-2">Valor</th>
                  <th className="py-2">Comparación</th>
                  <th className="py-2">% Variación</th>
                </tr>
              </thead>
              <tbody>
                {filasVariacion.map((f) => (
                  <tr key={f.dimension} style={{ borderTop: "1px solid var(--field-border)", color: "var(--sidebar-text-active)" }}>
                    <td className="py-2">{f.dimension}</td>
                    <td className="py-2">{fmtNum.format(f.valor)}</td>
                    <td className="py-2">{f.valorComparacion === null ? "—" : fmtNum.format(f.valorComparacion)}</td>
                    <td className="py-2" style={{ color: f.variacionPct === null ? undefined : f.variacionPct >= 0 ? "var(--color-success)" : "var(--color-error)" }}>
                      {f.variacionPct === null ? "—" : fmtPct.format(f.variacionPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "funnel" && camposConOpciones.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="max-w-xs">
            <label style={labelStyle}>Campo de progresión (ordenado)</label>
            <select value={campoFunnel} onChange={(e) => setCampoFunnel(e.target.value)} style={fieldStyle}>
              {camposConOpciones.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={ejecutarFunnel}
            className="w-fit rounded-md px-4 py-2"
            style={{ background: "var(--color-primary)", color: "white", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
          >
            {pending ? "Calculando…" : "Calcular funnel"}
          </button>
          {etapasFunnel && (
            <div className="flex flex-col gap-1.5">
              {etapasFunnel.map((e, i) => {
                const pctDelTotal = etapasFunnel[0].total > 0 ? e.total / etapasFunnel[0].total : 0;
                return (
                  <div key={e.label} className="flex items-center gap-3">
                    <span style={{ width: 160, fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>{e.label}</span>
                    <div className="flex-1 rounded" style={{ background: "var(--chip)", height: 20 }}>
                      <div className="h-full rounded" style={{ width: `${Math.max(pctDelTotal * 100, 2)}%`, background: "var(--color-primary)" }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", width: 90, textAlign: "right" }}>
                      {e.total} ({fmtPct.format(pctDelTotal)})
                    </span>
                    {i === 0 && <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}></span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "cohorte" && dataset.cohorteConfig && (
        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={ejecutarCohorte}
            className="w-fit rounded-md px-4 py-2"
            style={{ background: "var(--color-primary)", color: "white", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
          >
            {pending ? "Calculando…" : "Calcular cohortes"}
          </button>
          {filasCohorte && (
            <div className="overflow-x-auto">
              <table style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "var(--sidebar-text)", textAlign: "left" }}>
                    <th className="py-1 pr-3">Cohorte</th>
                    <th className="py-1 pr-3">Tamaño</th>
                    {Array.from({ length: 12 }, (_, i) => (
                      <th key={i} className="py-1 px-2 text-center">M{i}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filasCohorte.map((f) => (
                    <tr key={f.cohorte} style={{ borderTop: "1px solid var(--field-border)" }}>
                      <td className="py-1 pr-3" style={{ color: "var(--sidebar-text-active)" }}>{f.cohorte}</td>
                      <td className="py-1 pr-3" style={{ color: "var(--sidebar-text)" }}>{f.tamano}</td>
                      {f.retencion.map((v, i) => (
                        <td
                          key={i}
                          className="py-1 px-2 text-center"
                          style={{ background: v === null ? "transparent" : `color-mix(in srgb, var(--color-primary) ${Math.round(v * 100)}%, transparent)`, color: v !== null && v > 0.5 ? "white" : "var(--sidebar-text-active)" }}
                        >
                          {v === null ? "" : fmtPct.format(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
