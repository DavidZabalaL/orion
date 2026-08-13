"use client";

import { useState, useTransition } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { crearChecklist, subirFotoChecklist } from "@/app/(app)/checklist/actions";
import { CampoAyuda } from "@/components/ui/campo-ayuda";
import { ComboboxUnidad } from "@/components/ui/combobox-unidad";
// PUNTOS_INSPECCION moved to @/lib/checklist (server action files may only export async functions)

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-lg)",
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

export function ChecklistForm({
  unidades,
  puntos,
}: {
  unidades: { numeroEconomico: string; marca: string; unidadModelo: string; tipoVehiculo: string }[];
  puntos: readonly { key: string; label: string }[];
}) {
  const [estados, setEstados] = useState<Record<string, "ok" | "revisar">>(
    Object.fromEntries(puntos.map((p) => [p.key, "ok"]))
  );
  const [numeroEconomico, setNumeroEconomico] = useState(unidades[0]?.numeroEconomico ?? "");
  const [fotoNombre, setFotoNombre] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const esGrua = unidades.find((u) => u.numeroEconomico === numeroEconomico)?.tipoVehiculo === "GRUA";

  async function alSeleccionarFoto(file: File | undefined) {
    if (!file) {
      setFotoNombre(null);
      setFotoUrl(null);
      return;
    }
    setFotoNombre(file.name);
    setFotoUrl(null);
    setSubiendoFoto(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const result = await subirFotoChecklist(fd);
      if (!result.ok) throw new Error(result.error);
      setFotoUrl(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto. Intenta de nuevo.");
      setFotoNombre(null);
    } finally {
      setSubiendoFoto(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-5 rounded-xl p-5"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await crearChecklist(formData);
            setEnviado(true);
            setFotoNombre(null);
            setFotoUrl(null);
            setTimeout(() => setEnviado(false), 3000);
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo guardar el checklist. Intenta de nuevo.");
          }
        });
      }}
    >
      <div>
        <CampoAyuda style={labelStyle} texto="Unidad a la que corresponde esta inspección diaria.">Número económico *</CampoAyuda>
        <ComboboxUnidad
          name="numeroEconomico"
          unidades={unidades.map((u) => ({ numeroEconomico: u.numeroEconomico, etiqueta: `${u.numeroEconomico} — ${u.marca} ${u.unidadModelo}` }))}
          defaultValue={numeroEconomico}
          required
          onSeleccionar={setNumeroEconomico}
          style={fieldStyle}
        />
      </div>

      <div>
        <CampoAyuda style={labelStyle} texto="Kilometraje que marca el odómetro al momento de la inspección.">Lectura de odómetro (km) *</CampoAyuda>
        <input name="odometro" type="number" required min={0} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
      </div>

      {esGrua && (
        <div>
          <CampoAyuda style={labelStyle} texto="Horas de funcionamiento acumuladas del equipo de la grúa.">Horómetro (horas) *</CampoAyuda>
          <input name="horometro" type="number" required min={0} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
      )}

      <div>
        <label style={labelStyle} className="mb-3">Puntos de inspección</label>
        <div className="flex flex-col gap-2">
          {puntos.map((p) => (
            <div key={p.key} className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5" style={{ background: "var(--field-bg)" }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{p.label}</span>
              <input type="hidden" name={`punto_${p.key}`} value={estados[p.key]} />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEstados((s) => ({ ...s, [p.key]: "ok" }))}
                  className="rounded-full px-3 py-1"
                  style={{
                    fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600,
                    background: estados[p.key] === "ok" ? "var(--status-cerrado-bg)" : "var(--chip)",
                    color: estados[p.key] === "ok" ? "var(--color-status-cerrado)" : "var(--sidebar-text)",
                  }}
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setEstados((s) => ({ ...s, [p.key]: "revisar" }))}
                  className="rounded-full px-3 py-1"
                  style={{
                    fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600,
                    background: estados[p.key] === "revisar" ? "var(--status-revision-bg)" : "var(--chip)",
                    color: estados[p.key] === "revisar" ? "var(--color-status-revision)" : "var(--sidebar-text)",
                  }}
                >
                  Revisar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <input type="hidden" name="evidenciaUrl" value={fotoUrl ?? ""} />
      <label
        className="flex items-center justify-center gap-2 rounded-md px-3 py-3 cursor-pointer"
        style={{ background: fotoUrl ? "var(--status-cerrado-bg)" : "var(--field-bg)", color: fotoUrl ? "var(--color-status-cerrado)" : "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      >
        {subiendoFoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        {" "}
        {subiendoFoto ? `Subiendo ${fotoNombre}…` : fotoUrl ? `Foto adjuntada: ${fotoNombre}` : "Adjuntar evidencia fotográfica (o abrir cámara)"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => alSeleccionarFoto(e.target.files?.[0])}
        />
      </label>

      {error && (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={pending || subiendoFoto}
        className="flex items-center justify-center gap-2 rounded-md px-5 h-12 font-semibold disabled:opacity-60"
        style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-md)" }}
      >
        {enviado ? <><CheckCircle2 size={18} /> Guardado</> : subiendoFoto ? "Subiendo foto…" : pending ? "Guardando…" : "Guardar checklist"}
      </button>
    </form>
  );
}
