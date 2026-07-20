"use client";

import { useState, useTransition } from "react";
import { registrarPosicion } from "@/app/mapa/actions";
import { CheckCircle2 } from "lucide-react";

const fieldStyle: React.CSSProperties = {
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

export function PosicionForm({ unidades }: { unidades: { numeroEconomico: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [guardado, setGuardado] = useState(false);

  return (
    <details className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <summary
        className="cursor-pointer"
        style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}
      >
        Registrar posición manual (simulación mientras se conecta IntelliHub)
      </summary>
      <form
        className="grid grid-cols-2 gap-4 md:grid-cols-6 items-end mt-4"
        action={(formData) => {
          startTransition(async () => {
            await registrarPosicion(formData);
            setGuardado(true);
            setTimeout(() => setGuardado(false), 2500);
          });
        }}
      >
        <div>
          <label style={labelStyle}>Unidad *</label>
          <select name="numeroEconomico" required style={fieldStyle}>
            {unidades.map((u) => (
              <option key={u.numeroEconomico} value={u.numeroEconomico}>{u.numeroEconomico}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Fecha/hora *</label>
          <input name="timestamp" type="datetime-local" required style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Latitud *</label>
          <input name="lat" type="number" step="0.0001" required placeholder="25.5428" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <label style={labelStyle}>Longitud *</label>
          <input name="lng" type="number" step="0.0001" required placeholder="-99.2166" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <label style={labelStyle}>Velocidad (km/h)</label>
          <input name="velocidad" type="number" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <label style={labelStyle}>Km reportado</label>
          <input name="kmReportado" type="number" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="col-span-2 md:col-span-6 flex items-center justify-center gap-2 rounded-md h-10 font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {guardado ? <><CheckCircle2 size={16} /> Registrada — filtro G.1 aplicado</> : pending ? "Evaluando…" : "Registrar posición"}
        </button>
      </form>
    </details>
  );
}
