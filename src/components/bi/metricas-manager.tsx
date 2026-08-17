"use client";

import { useState, useTransition } from "react";
import { Trash2, CheckCircle2 } from "lucide-react";
import { BI_DATASETS, obtenerDataset, agregacionesDisponibles, AGREGACION_LABEL, type TipoAgregacion } from "@/lib/bi/metadata";
import { guardarMetrica, alternarMetrica, eliminarMetrica } from "@/app/(app)/reportes/metricas/actions";
import { fieldStyle, labelStyle } from "@/components/bi/selectores-combinacion";

export type MetricaFila = {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string | null;
  datasetId: string;
  campoId: string;
  agregacion: string;
  activo: boolean;
  creadoPor: { nombre: string } | null;
};

export function MetricasManager({ metricas }: { metricas: MetricaFila[] }) {
  const [datasetId, setDatasetId] = useState(BI_DATASETS[0].id);
  const [campoId, setCampoId] = useState(BI_DATASETS[0].campos[0].id);
  const [agregacion, setAgregacion] = useState<TipoAgregacion>("conteo");
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataset = obtenerDataset(datasetId)!;
  const campo = dataset.campos.find((c) => c.id === campoId) ?? dataset.campos[0];
  const agregacionesValidas = agregacionesDisponibles(campo);

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-4 rounded-xl p-5"
        style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const resultado = await guardarMetrica({
              nombre: String(formData.get("nombre") ?? ""),
              descripcion: String(formData.get("descripcion") ?? ""),
              datasetId,
              campoId: campo.id,
              agregacion,
            });
            if (!resultado.ok) {
              setError(resultado.error ?? "No se pudo guardar la métrica.");
              return;
            }
            setOk(true);
            (document.getElementById("form-metrica") as HTMLFormElement | null)?.reset();
            setTimeout(() => setOk(false), 2500);
          });
        }}
        id="form-metrica"
      >
        <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Nueva métrica
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input name="nombre" required placeholder="Ej. Costo por km" style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Descripción</label>
            <input name="descripcion" placeholder="Qué significa esta métrica" style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Dataset *</label>
            <select
              value={datasetId}
              onChange={(e) => {
                const ds = obtenerDataset(e.target.value)!;
                setDatasetId(ds.id);
                setCampoId(ds.campos[0].id);
                setAgregacion("conteo");
              }}
              style={fieldStyle}
            >
              {BI_DATASETS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Campo *</label>
            <select
              value={campoId}
              onChange={(e) => {
                setCampoId(e.target.value);
                setAgregacion("conteo");
              }}
              style={fieldStyle}
            >
              {dataset.campos.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Agregación *</label>
            <select value={agregacion} onChange={(e) => setAgregacion(e.target.value as TipoAgregacion)} style={fieldStyle}>
              {agregacionesValidas.map((a) => (
                <option key={a} value={a}>{AGREGACION_LABEL[a]}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <p style={{ color: "var(--color-error)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md px-4 py-2"
            style={{ background: "var(--color-primary)", color: "white", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
          >
            {pending ? "Guardando…" : "Guardar métrica"}
          </button>
          {ok && (
            <span className="flex items-center gap-1" style={{ color: "var(--color-success)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
              <CheckCircle2 size={15} /> Guardada
            </span>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-2">
        {metricas.length === 0 && (
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
            Todavía no hay métricas guardadas.
          </p>
        )}
        {metricas.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-lg p-3"
            style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)", opacity: m.activo ? 1 : 0.55 }}
          >
            <div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{m.nombre}</p>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                {obtenerDataset(m.datasetId)?.label ?? m.datasetId} · {AGREGACION_LABEL[m.agregacion as TipoAgregacion] ?? m.agregacion}
                {m.descripcion ? ` — ${m.descripcion}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                <input type="checkbox" checked={m.activo} onChange={(e) => startTransition(() => { void alternarMetrica(m.id, e.target.checked); })} />
                Activa
              </label>
              <button
                type="button"
                onClick={() => startTransition(() => { void eliminarMetrica(m.id); })}
                className="rounded-md p-1.5"
                style={{ color: "var(--color-error)" }}
                aria-label="Eliminar métrica"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
