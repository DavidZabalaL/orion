"use client";

import { useState, useTransition } from "react";
import { Camera, CheckCircle2 } from "lucide-react";
import { crearChecklist } from "@/app/(app)/checklist/actions";
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
  unidades: { numeroEconomico: string; marca: string; unidadModelo: string }[];
  puntos: readonly { key: string; label: string }[];
}) {
  const [estados, setEstados] = useState<Record<string, "ok" | "revisar">>(
    Object.fromEntries(puntos.map((p) => [p.key, "ok"]))
  );
  const [foto, setFoto] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-5 rounded-xl p-5"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      action={(formData) => {
        startTransition(async () => {
          await crearChecklist(formData);
          setEnviado(true);
          setTimeout(() => setEnviado(false), 3000);
        });
      }}
    >
      <div>
        <label style={labelStyle}>Número económico *</label>
        <select name="numeroEconomico" required style={fieldStyle}>
          {unidades.map((u) => (
            <option key={u.numeroEconomico} value={u.numeroEconomico}>
              {u.numeroEconomico} — {u.marca} {u.unidadModelo}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Lectura de odómetro (km) *</label>
        <input name="odometro" type="number" required min={0} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
      </div>

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

      <button
        type="button"
        onClick={() => setFoto((f) => !f)}
        className="flex items-center justify-center gap-2 rounded-md px-3 py-3"
        style={{ background: foto ? "var(--status-cerrado-bg)" : "var(--field-bg)", color: foto ? "var(--color-status-cerrado)" : "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      >
        <Camera size={16} /> {foto ? "Foto adjuntada" : "Adjuntar evidencia fotográfica"}
      </button>

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-md px-5 h-12 font-semibold disabled:opacity-60"
        style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-md)" }}
      >
        {enviado ? <><CheckCircle2 size={18} /> Guardado</> : pending ? "Guardando…" : "Guardar checklist"}
      </button>
    </form>
  );
}
