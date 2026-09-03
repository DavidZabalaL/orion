"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { crearChecklistReporteFalla } from "@/app/(app)/checklist/actions";
import { CampoFotoSemanal } from "@/components/checklist/campo-foto-semanal";
import { DEPARTAMENTOS_FALLA, TIPOS_FALLA, MAX_FOTOS_REPORTE_FALLA } from "@/lib/checklist-reporte-falla";

type UnidadWizard = {
  numeroEconomico: string;
  marca: string;
  unidadModelo: string;
};

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
  height: "var(--h-lg)",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  display: "block",
  marginBottom: 4,
};

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function horaActual() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function WizardReporteFalla({
  unidades,
  onTerminar,
  onCancelar,
}: {
  unidades: UnidadWizard[];
  onTerminar: () => void;
  onCancelar: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const [numeroEconomico, setNumeroEconomico] = useState("");
  const [kilometraje, setKilometraje] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [hora, setHora] = useState(horaActual());
  const [nombreConductor, setNombreConductor] = useState("");
  const [departamento, setDepartamento] = useState<string>(DEPARTAMENTOS_FALLA[0]);
  const [tipoFalla, setTipoFalla] = useState<string>(TIPOS_FALLA[0]);
  const [descripcionFalla, setDescripcionFalla] = useState("");
  const [observaciones, setObservaciones] = useState("");

  function enviar(formData: FormData) {
    setError(null);
    formData.set("numeroEconomico", numeroEconomico);
    formData.set("kilometraje", kilometraje);
    formData.set("fecha", fecha);
    formData.set("hora", hora);
    formData.set("nombreConductor", nombreConductor);
    formData.set("departamento", departamento);
    formData.set("tipoFalla", tipoFalla);
    formData.set("descripcionFalla", descripcionFalla);
    formData.set("observaciones", observaciones);

    if (!numeroEconomico) { setError("Selecciona el número económico."); return; }
    if (!kilometraje) { setError("El kilometraje actual es obligatorio."); return; }

    startTransition(async () => {
      const res = await crearChecklistReporteFalla(formData);
      if (!res.ok) { setError(res.error); return; }
      setExito(true);
    });
  }

  if (exito) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-xl p-8 text-center" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <CheckCircle2 size={48} color="var(--color-status-cerrado)" />
        <div>
          <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Reporte de falla registrado
          </h2>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", marginTop: 8 }}>
            Se notificó al Gerente administrativo del proyecto de la unidad.
          </p>
        </div>
        <button
          type="button"
          onClick={onTerminar}
          className="rounded-md px-6 h-10 font-semibold"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          Registrar otro reporte
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5 rounded-xl p-5"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      action={(formData) => enviar(formData)}
    >
      <div className="flex items-center justify-between">
        <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Reporte de falla de vehículo
        </h2>
        <button type="button" onClick={onCancelar} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Cancelar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label style={labelStyle}>Número económico *</label>
          <select value={numeroEconomico} onChange={(e) => setNumeroEconomico(e.target.value)} style={fieldStyle}>
            <option value="">Selecciona una unidad…</option>
            {unidades.map((u) => (
              <option key={u.numeroEconomico} value={u.numeroEconomico}>
                {u.numeroEconomico} — {u.marca} {u.unidadModelo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Kilometraje actual *</label>
          <input
            type="number"
            min={0}
            value={kilometraje}
            onChange={(e) => setKilometraje(e.target.value)}
            placeholder="Km"
            style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }}
          />
        </div>

        <div>
          <label style={labelStyle}>Fecha de reporte *</label>
          <input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} style={fieldStyle} />
        </div>

        <div>
          <label style={labelStyle}>Hora *</label>
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={fieldStyle} />
        </div>

        <div>
          <label style={labelStyle}>Nombre de conductor</label>
          <input
            type="text"
            value={nombreConductor}
            onChange={(e) => setNombreConductor(e.target.value)}
            placeholder="Opcional"
            style={fieldStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Departamento *</label>
          <select value={departamento} onChange={(e) => setDepartamento(e.target.value)} style={fieldStyle}>
            {DEPARTAMENTOS_FALLA.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label style={labelStyle}>Tipo de falla *</label>
          <div className="flex gap-2 flex-wrap">
            {TIPOS_FALLA.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipoFalla(t)}
                className="rounded-full px-4 py-2 font-semibold"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-sm)",
                  background: tipoFalla === t ? "var(--color-primary)" : "var(--chip)",
                  color: tipoFalla === t ? "#fff" : "var(--sidebar-text-active)",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Descripción de falla</label>
        <textarea
          value={descripcionFalla}
          onChange={(e) => setDescripcionFalla(e.target.value)}
          rows={3}
          placeholder="Describe la falla (opcional)…"
          className="w-full rounded-md px-3 py-2"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        />
      </div>

      <div>
        <label style={labelStyle}>Observaciones adicionales</label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          placeholder="Notas adicionales (opcional)…"
          className="w-full rounded-md px-3 py-2"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        />
      </div>

      <div>
        <label style={labelStyle}>Fotos (opcional, hasta {MAX_FOTOS_REPORTE_FALLA})</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: MAX_FOTOS_REPORTE_FALLA }, (_, i) => i + 1).map((n) => (
            <CampoFotoSemanal key={n} name={`foto_${n}`} label={`Foto ${n}`} requerido={false} />
          ))}
        </div>
      </div>

      {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-md px-6 h-10 font-semibold disabled:opacity-60"
        style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      >
        {pending ? <><Loader2 size={16} className="animate-spin" /> Guardando…</> : "Registrar reporte de falla"}
      </button>
    </form>
  );
}
