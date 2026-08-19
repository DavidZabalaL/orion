"use client";

import { useState } from "react";
import { CampoAyuda } from "@/components/ui/campo-ayuda";

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

export function LicenciaVigenciaCampo() {
  const [permanente, setPermanente] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <CampoAyuda style={labelStyle} texto="Fecha en que vence la licencia de conducir. En México algunas licencias se expiden con vigencia permanente.">
        Fecha de vencimiento
      </CampoAyuda>
      <input
        name="fechaVencimientoLicencia"
        type="date"
        disabled={permanente}
        style={{ ...fieldStyle, opacity: permanente ? 0.5 : 1 }}
      />
      <label className="flex items-center gap-2" style={{ cursor: "pointer" }}>
        <input
          type="checkbox"
          name="licenciaPermanente"
          value="1"
          checked={permanente}
          onChange={(e) => setPermanente(e.target.checked)}
        />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
          Licencia permanente (sin vencimiento)
        </span>
      </label>
    </div>
  );
}
