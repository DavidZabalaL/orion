"use client";

import { useState, useTransition } from "react";
import { crearTag } from "@/app/tag/actions";
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

export function TagForm({ unidades }: { unidades: { numeroEconomico: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [guardado, setGuardado] = useState(false);

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
        Carga de estado de cuenta (captura manual)
      </h3>
      <form
        className="grid grid-cols-2 gap-4 md:grid-cols-6 items-end"
        action={(formData) => {
          startTransition(async () => {
            await crearTag(formData);
            setGuardado(true);
            setTimeout(() => setGuardado(false), 2500);
          });
        }}
      >
        <div>
          <label style={labelStyle}>Unidad (opcional)</label>
          <select name="numeroEconomico" style={fieldStyle}>
            <option value="">Sin asignar</option>
            {unidades.map((u) => (
              <option key={u.numeroEconomico} value={u.numeroEconomico}>{u.numeroEconomico}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Fecha *</label>
          <input name="fecha" type="date" required style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Monto *</label>
          <input name="monto" type="number" step="0.01" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <label style={labelStyle}>Caseta</label>
          <input name="caseta" style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Proveedor *</label>
          <select name="proveedorTag" required style={fieldStyle}>
            <option value="IAVE">IAVE</option>
            <option value="PASE">PASE</option>
            <option value="TELEVIA">Televía</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-md h-10 font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {guardado ? <><CheckCircle2 size={16} /> Guardado</> : pending ? "Guardando…" : "Registrar"}
        </button>
      </form>
    </div>
  );
}
