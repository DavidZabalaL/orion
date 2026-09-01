"use client";

import { useState } from "react";
import { X, FileDown, Loader2 } from "lucide-react";
import { useExportRegistry } from "./ExportRegistryContext";

/**
 * Modal "Exportar resumen ejecutivo" del dashboard unificado — deja elegir
 * qué KPIs/gráficas de la pestaña activa incluir, genera un resumen breve
 * con IA a partir de los KPIs elegidos, y arma un PDF con formato propio (no
 * una captura de pantalla): @react-pdf/renderer para el documento,
 * html-to-image para rasterizar las gráficas elegidas.
 */
export function ExportSummaryModal({ onClose }: { onClose: () => void }) {
  const { items } = useExportRegistry();
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map((i) => i.id)));
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [summaryWarning, setSummaryWarning] = useState("");

  const kpis = items.filter((i) => i.type === "kpi");
  const charts = items.filter((i) => i.type === "chart");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generar() {
    setGenerating(true);
    setError("");
    setSummaryWarning("");
    let resumenFallo = false;
    try {
      const seleccionados = items.filter((i) => selected.has(i.id));
      const kpisSeleccionados = seleccionados.filter((i) => i.type === "kpi");
      const chartsSeleccionados = seleccionados.filter((i) => i.type === "chart");

      let summary = "";
      if (kpisSeleccionados.length > 0 || customPrompt.trim()) {
        const res = await fetch("/api/dashboards/resumen-ejecutivo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: kpisSeleccionados.map((i) => ({ title: i.title, value: i.value ?? "" })),
            customPrompt: customPrompt.trim(),
          }),
        });
        const data = await res.json();
        summary = data.summary || "";
        if (!summary) {
          resumenFallo = true;
          setSummaryWarning(
            data.error
              ? `No se pudo generar el resumen con IA (${data.error}). El PDF se descargó sin él.`
              : "No se pudo generar el resumen con IA. El PDF se descargó sin él."
          );
        }
      }

      const { toPng } = await import("html-to-image");
      const chartImages: { title: string; dataUrl: string }[] = [];
      for (const c of chartsSeleccionados) {
        if (!c.domRef?.current) continue;
        const dataUrl = await toPng(c.domRef.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
        chartImages.push({ title: c.title, dataUrl });
      }

      const [{ pdf }, { ExecutiveSummaryDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./ExecutiveSummaryDocument"),
      ]);

      const doc = (
        <ExecutiveSummaryDocument
          title="Resumen ejecutivo"
          date={new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
          summary={summary}
          kpis={kpisSeleccionados.map((i) => ({ title: i.title, value: String(i.value ?? "") }))}
          charts={chartImages}
        />
      );
      const blob = await pdf(doc).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resumen-ejecutivo-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      if (!resumenFallo) onClose();
    } catch (err) {
      console.error(err);
      setError("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl shadow-xl" style={{ background: "var(--panel-bg)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--field-border)" }}>
          <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Exportar resumen ejecutivo
          </h2>
          <button onClick={onClose} style={{ color: "var(--sidebar-text)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block mb-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Instrucciones para el resumen con IA (opcional)
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              placeholder="Ej: enfócate en la disponibilidad del proyecto X este mes y compárala con el mes anterior…"
              className="w-full rounded-lg px-3 py-2 resize-none outline-none"
              style={{ border: "1px solid var(--field-border)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)", background: "var(--field-bg, transparent)" }}
            />
            <p className="mt-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
              Puedes guiar aquí lo que la IA debe destacar en el resumen.
            </p>
          </div>

          {items.length === 0 ? (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              No hay KPIs ni gráficas para exportar en esta pestaña — igual puedes generar el PDF solo con las instrucciones de arriba.
            </p>
          ) : (
            <>
              {kpis.length > 0 && (
                <div>
                  <p className="mb-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    KPIs
                  </p>
                  <div className="space-y-1.5">
                    {kpis.map((k) => (
                      <label key={k.id} className="flex items-center gap-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>
                        <input type="checkbox" checked={selected.has(k.id)} onChange={() => toggle(k.id)} />
                        {k.title}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {charts.length > 0 && (
                <div>
                  <p className="mb-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Gráficas
                  </p>
                  <div className="space-y-1.5">
                    {charts.map((c) => (
                      <label key={c.id} className="flex items-center gap-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                        {c.title}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {summaryWarning && (
            <p className="rounded-lg px-3 py-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a" }}>
              {summaryWarning}
            </p>
          )}
          {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-error)" }}>{error}</p>}
        </div>

        <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "var(--field-border)" }}>
          <button onClick={onClose} className="px-3 py-2 rounded-lg" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
            Cancelar
          </button>
          <button
            onClick={generar}
            disabled={generating || (selected.size === 0 && !customPrompt.trim())}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg disabled:opacity-50"
            style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            Generar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
