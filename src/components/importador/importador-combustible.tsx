"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Upload, CheckCircle2, TriangleAlert, ArrowRight } from "lucide-react";
import { parsearExcelCombustible, importarCombustible } from "@/app/(app)/combustible/importar/actions";
import type { HojaParseada, ResultadoImportacion } from "@/lib/excel-parse";
import { CAMPOS_COMBUSTIBLE, type CampoCombustibleKey } from "@/lib/import-combustible";
import { FileInput } from "@/components/ui/file-input";

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

const panelStyle: React.CSSProperties = { background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" };

type Paso = "subir" | "mapear" | "confirmar" | "resultado";

export function ImportadorCombustible() {
  const [paso, setPaso] = useState<Paso>("subir");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [hojas, setHojas] = useState<HojaParseada[]>([]);
  const [hojaIdx, setHojaIdx] = useState(0);
  const [mapeo, setMapeo] = useState<Record<CampoCombustibleKey, number | null>>(
    Object.fromEntries(CAMPOS_COMBUSTIBLE.map((c) => [c.key, null])) as Record<CampoCombustibleKey, number | null>
  );
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);

  const hoja = hojas[hojaIdx];

  const filasMapeadas = useMemo(() => {
    if (!hoja) return [];
    return hoja.filas
      .filter((f) => f.some((v) => v && v.trim()))
      .map((f) => {
        const obj: Record<string, string> = {};
        for (const campo of CAMPOS_COMBUSTIBLE) {
          const idx = mapeo[campo.key];
          obj[campo.key] = idx !== null && idx !== undefined ? (f[idx] ?? "") : "";
        }
        return obj;
      });
  }, [hoja, mapeo]);

  const camposFaltantes = CAMPOS_COMBUSTIBLE.filter((c) => c.requerido && mapeo[c.key] === null);

  function handleSubir(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const { hojas } = await parsearExcelCombustible(formData);
        setHojas(hojas);
        setHojaIdx(0);

        const headers = hojas[0].headers.map((h) => h.trim().toUpperCase());
        const auto: Record<CampoCombustibleKey, number | null> = Object.fromEntries(CAMPOS_COMBUSTIBLE.map((c) => [c.key, null])) as never;
        for (const campo of CAMPOS_COMBUSTIBLE) {
          const idx = headers.findIndex((h) => h.includes(campo.label.split(" ")[0].toUpperCase()) || h.replace(/[^A-Z]/g, "") === campo.key.toUpperCase());
          if (idx >= 0) auto[campo.key] = idx;
        }
        setMapeo(auto);
        setPaso("mapear");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
      }
    });
  }

  function handleImportar() {
    startTransition(async () => {
      const res = await importarCombustible(filasMapeadas);
      setResultado(res);
      setPaso("resultado");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {paso === "subir" && (
        <form action={handleSubir} className="rounded-xl p-8 flex flex-col items-center gap-4" style={panelStyle}>
          <Upload size={32} color="var(--color-primary)" />
          <div className="text-center">
            <div style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
              Sube el reporte de combustible (.xlsx o .csv)
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              Reporte de Efectivale o cualquier otro proveedor — mapea las columnas en el siguiente paso.
            </p>
          </div>
          <FileInput name="archivo" accept=".xlsx,.xls,.csv" required helpText="Ningún archivo seleccionado" />
          {error && (
            <div className="flex items-center gap-2" style={{ color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
              <TriangleAlert size={15} /> {error}
            </div>
          )}
          <button type="submit" disabled={pending} className="rounded-md px-5 h-10 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            {pending ? "Leyendo…" : "Analizar archivo"}
          </button>
        </form>
      )}

      {paso === "mapear" && hoja && (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl p-5 flex flex-wrap items-end gap-4" style={panelStyle}>
            <div>
              <label className="block mb-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Hoja del libro</label>
              <select value={hojaIdx} onChange={(e) => setHojaIdx(Number(e.target.value))} style={fieldStyle}>
                {hojas.map((h, i) => (
                  <option key={h.nombre} value={i}>{h.nombre} ({h.filas.length} filas)</option>
                ))}
              </select>
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              {hoja.filas.filter((f) => f.some((v) => v?.trim())).length} filas con datos detectadas
            </div>
          </div>

          <div className="rounded-xl p-5" style={panelStyle}>
            <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
              Mapeo de columnas
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {CAMPOS_COMBUSTIBLE.map((campo) => (
                <div key={campo.key} className="flex items-center gap-3">
                  <div className="flex-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                    {campo.label} {campo.requerido && <span style={{ color: "var(--color-status-escena)" }}>*</span>}
                  </div>
                  <ArrowRight size={13} color="var(--sidebar-text)" className="shrink-0" />
                  <select
                    value={mapeo[campo.key] ?? ""}
                    onChange={(e) => setMapeo((m) => ({ ...m, [campo.key]: e.target.value === "" ? null : Number(e.target.value) }))}
                    style={{ ...fieldStyle, flex: 1 }}
                  >
                    <option value="">— Ignorar —</option>
                    {hoja.headers.map((h, i) => (
                      <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {camposFaltantes.length > 0 && (
            <div className="flex items-center gap-2 rounded-md px-4 py-3" style={{ background: "var(--status-revision-bg)", color: "var(--color-status-revision)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
              <TriangleAlert size={15} /> Faltan mapear campos obligatorios: {camposFaltantes.map((c) => c.label).join(", ")}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl" style={panelStyle}>
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                  {CAMPOS_COMBUSTIBLE.filter((c) => mapeo[c.key] !== null).map((c) => (
                    <th key={c.key} className="text-left px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)" }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filasMapeadas.slice(0, 5).map((fila, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--field-border)" }}>
                    {CAMPOS_COMBUSTIBLE.filter((c) => mapeo[c.key] !== null).map((c) => (
                      <td key={c.key} className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{fila[c.key] || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-3 py-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
              Vista previa (primeras 5 filas de {filasMapeadas.length})
            </div>
          </div>

          <div className="flex gap-3">
            <button
              disabled={camposFaltantes.length > 0}
              onClick={() => setPaso("confirmar")}
              className="rounded-md px-5 h-10 font-semibold disabled:opacity-40"
              style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
            >
              Continuar
            </button>
            <button onClick={() => setPaso("subir")} className="rounded-md px-5 h-10" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}>
              Elegir otro archivo
            </button>
          </div>
        </div>
      )}

      {paso === "confirmar" && (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl p-5" style={panelStyle}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--field-text)" }}>
              Estás por importar <strong>{filasMapeadas.length}</strong> transacciones de combustible desde la hoja <strong>{hoja?.nombre}</strong>.
              Las filas con número económico no reconocido o duplicadas (misma unidad, fecha, litros y costo) se omiten automáticamente.
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleImportar}
              disabled={pending}
              className="flex items-center gap-2 rounded-md px-5 h-10 font-semibold disabled:opacity-60"
              style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
            >
              {pending ? "Importando…" : "Confirmar importación"}
            </button>
            <button onClick={() => setPaso("mapear")} className="rounded-md px-5 h-10" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}>
              Volver al mapeo
            </button>
          </div>
        </div>
      )}

      {paso === "resultado" && resultado && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <ResumenCard label="Importadas" value={resultado.creadas.length} color="var(--color-status-cerrado)" bg="var(--status-cerrado-bg)" />
            <ResumenCard label="Omitidas / duplicadas" value={resultado.omitidas.length} color="var(--color-status-escena)" bg="var(--status-escena-bg)" />
            <ResumenCard label="Advertencias" value={resultado.advertencias.length} color="var(--color-status-revision)" bg="var(--status-revision-bg)" />
          </div>

          {resultado.omitidas.length > 0 && (
            <div className="rounded-xl p-5" style={panelStyle}>
              <h4 className="mb-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-status-escena)" }}>Filas omitidas</h4>
              <ul className="flex flex-col gap-1">
                {resultado.omitidas.map((o, i) => (
                  <li key={i} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>Fila {o.fila}: {o.motivo}</li>
                ))}
              </ul>
            </div>
          )}

          {resultado.advertencias.length > 0 && (
            <div className="rounded-xl p-5" style={panelStyle}>
              <h4 className="mb-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-status-revision)" }}>Advertencias</h4>
              <ul className="flex flex-col gap-1">
                {resultado.advertencias.map((a, i) => (
                  <li key={i} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>Fila {a.fila}: {a.mensaje}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2" style={{ color: "var(--color-status-cerrado)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
            <CheckCircle2 size={16} /> Importación completada. Revisa <Link href="/combustible" style={{ color: "var(--color-primary)" }}>Combustible</Link>.
          </div>
        </div>
      )}
    </div>
  );
}

function ResumenCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: bg }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color }}>{label}</div>
    </div>
  );
}
