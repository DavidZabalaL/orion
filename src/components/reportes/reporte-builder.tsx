"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { crearReporteProgramado } from "@/app/(app)/reportes/actions";
import { TIPOS_REPORTE, CAMPOS_POR_TIPO } from "@/lib/reportes";

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

export function ReporteBuilder() {
  const [tipo, setTipo] = useState<string>(TIPOS_REPORTE[0].value);
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);
  const campos = CAMPOS_POR_TIPO[tipo] ?? [];

  return (
    <form
      className="flex flex-col gap-5 rounded-xl p-5"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      action={(formData) => {
        startTransition(async () => {
          await crearReporteProgramado(formData);
          setOk(true);
          setTimeout(() => setOk(false), 2500);
        });
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label style={labelStyle}>Nombre del reporte *</label>
          <input name="nombre" required style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Tipo *</label>
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} style={fieldStyle}>
            {TIPOS_REPORTE.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Campos a incluir *</label>
        <div className="flex flex-wrap gap-3">
          {campos.map((c) => (
            <label key={c.key} className="flex items-center gap-2 rounded-md px-3 py-2" style={{ background: "var(--field-bg)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
              <input type="checkbox" name="campos" value={c.key} defaultChecked />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label style={labelStyle}>Destinatarios (correos separados por coma) *</label>
          <input name="destinatarios" required placeholder="nombre@grupokabat.com, otro@grupokabat.com" style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Hora de envío</label>
          <input name="hora" type="time" defaultValue="08:00" style={fieldStyle} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Frecuencia</label>
        <select name="frecuencia" style={{ ...fieldStyle, maxWidth: 220 }} defaultValue="SEMANAL">
          <option value="DIARIO">Diario</option>
          <option value="SEMANAL">Semanal</option>
          <option value="MENSUAL">Mensual</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-md px-5 h-10 font-semibold disabled:opacity-60 w-fit"
        style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      >
        {ok ? <><CheckCircle2 size={16} /> Programado</> : pending ? "Guardando…" : "Crear y programar"}
      </button>
    </form>
  );
}
