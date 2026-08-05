"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { crearChecklistSemanal } from "@/app/(app)/checklist/actions";
import { CampoAyuda } from "@/components/ui/campo-ayuda";
import { ComboboxUnidad } from "@/components/ui/combobox-unidad";
import { CampoFotoSemanal } from "@/components/checklist/campo-foto-semanal";
import { SECCIONES_CHECKLIST_SEMANAL, type CampoSemanal } from "@/lib/checklist-semanal";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";

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

type Unidad = { numeroEconomico: string; marca: string; unidadModelo: string; tipoVehiculo: string };

function Pills({
  valor,
  opciones,
  onChange,
}: {
  valor: string;
  opciones: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((op) => (
        <button
          key={op}
          type="button"
          onClick={() => onChange(op)}
          className="rounded-full px-3 py-1"
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            background: valor === op ? "var(--status-cerrado-bg)" : "var(--chip)",
            color: valor === op ? "var(--color-status-cerrado)" : "var(--sidebar-text)",
          }}
        >
          {op}
        </button>
      ))}
    </div>
  );
}

function valoresIniciales(): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const seccion of SECCIONES_CHECKLIST_SEMANAL) {
    for (const campo of seccion.campos) {
      if (campo.tipo === "radio" || campo.tipo === "toggle") valores[campo.key] = campo.opciones[0];
    }
  }
  return valores;
}

function Campo({
  campo,
  valor,
  onChange,
  esGrua,
}: {
  campo: CampoSemanal;
  valor: string;
  onChange: (key: string, v: string) => void;
  esGrua: boolean;
}) {
  if (campo.tipo === "radio" && campo.soloTipoVehiculo === "GRUA" && !esGrua) return null;

  if (campo.tipo === "radio") {
    return (
      <div className="flex flex-col gap-2 rounded-md px-3 py-2.5" style={{ background: "var(--field-bg)" }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
            {campo.label}
            {campo.requerido && <span style={{ color: "var(--color-status-escena)" }}> *</span>}
          </span>
          <input type="hidden" name={campo.key} value={valor} />
          <Pills valor={valor} opciones={campo.opciones} onChange={(v) => onChange(campo.key, v)} />
        </div>
        {campo.fotoKey && (
          <CampoFotoSemanal name={campo.fotoKey} label={campo.fotoLabel ?? "Evidencia fotográfica"} requerido={!!campo.fotoRequerido} />
        )}
      </div>
    );
  }

  if (campo.tipo === "toggle") {
    return (
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-md px-3 py-2.5" style={{ background: "var(--field-bg)" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
          {campo.label}
          {campo.requerido && <span style={{ color: "var(--color-status-escena)" }}> *</span>}
        </span>
        <input type="hidden" name={campo.key} value={valor} />
        <Pills valor={valor} opciones={campo.opciones} onChange={(v) => onChange(campo.key, v)} />
      </div>
    );
  }

  if (campo.tipo === "foto") {
    return <CampoFotoSemanal name={campo.key} label={campo.label} requerido={campo.requerido} />;
  }

  if (campo.tipo === "numero") {
    return (
      <div>
        <CampoAyuda style={labelStyle} texto={`Captura un valor entre ${campo.min ?? 0} y ${campo.max ?? 100}.`}>
          {campo.label}
          {campo.requerido ? " *" : ""}
        </CampoAyuda>
        <input
          name={campo.key}
          type="number"
          min={campo.min}
          max={campo.max}
          required={campo.requerido}
          style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }}
        />
      </div>
    );
  }

  // textarea
  return (
    <div>
      <label style={labelStyle}>{campo.label}</label>
      <textarea
        name={campo.key}
        rows={3}
        className="w-full rounded-md px-3 py-2"
        style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      />
    </div>
  );
}

export function ChecklistSemanalForm({ unidades, sedes }: { unidades: Unidad[]; sedes: { id: string; nombre: string }[] }) {
  const [numeroEconomico, setNumeroEconomico] = useState(unidades[0]?.numeroEconomico ?? "");
  const [respuestas, setRespuestas] = useState<Record<string, string>>(valoresIniciales);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unidadSeleccionada = useMemo(() => unidades.find((u) => u.numeroEconomico === numeroEconomico), [unidades, numeroEconomico]);
  const esGrua = unidadSeleccionada?.tipoVehiculo === "GRUA";

  function actualizar(key: string, v: string) {
    setRespuestas((r) => ({ ...r, [key]: v }));
  }

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form
      className="flex flex-col gap-6 rounded-xl p-5"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await crearChecklistSemanal(formData);
            setEnviado(true);
            setTimeout(() => setEnviado(false), 3000);
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo guardar el checklist semanal. Intenta de nuevo.");
          }
        });
      }}
    >
      {/* Generales */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <CampoAyuda style={labelStyle} texto="Fecha en que se realiza esta inspección semanal.">Fecha *</CampoAyuda>
          <input name="gen_fecha" type="date" required defaultValue={hoy} style={fieldStyle} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Oficina o sede desde donde se captura el checklist.">Oficina / Sede *</CampoAyuda>
          <select name="gen_oficina_sede" required style={fieldStyle}>
            <option value="">Seleccionar…</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.nombre}>{s.nombre}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <CampoAyuda style={labelStyle} texto="Unidad a la que corresponde esta inspección semanal.">Número económico *</CampoAyuda>
          <ComboboxUnidad
            name="gen_numero_economico"
            unidades={unidades.map((u) => ({ numeroEconomico: u.numeroEconomico, etiqueta: `${u.numeroEconomico} — ${u.marca} ${u.unidadModelo}` }))}
            defaultValue={numeroEconomico}
            required
            onSeleccionar={setNumeroEconomico}
            style={fieldStyle}
          />
        </div>
        {unidadSeleccionada && (
          <>
            <div>
              <label style={labelStyle}>Modelo</label>
              <input value={`${unidadSeleccionada.marca} ${unidadSeleccionada.unidadModelo}`} disabled style={{ ...fieldStyle, opacity: 0.7 }} />
            </div>
            <div>
              <label style={labelStyle}>Tipo de vehículo</label>
              <input value={TIPO_VEHICULO_LABEL[unidadSeleccionada.tipoVehiculo] ?? unidadSeleccionada.tipoVehiculo} disabled style={{ ...fieldStyle, opacity: 0.7 }} />
            </div>
          </>
        )}
        <div className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 md:col-span-2" style={{ background: "var(--field-bg)" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>¿La licencia es permanente? *</span>
          <input type="hidden" name="gen_licencia_permanente" value={respuestas.gen_licencia_permanente ?? "Y"} />
          <Pills valor={respuestas.gen_licencia_permanente ?? "Y"} opciones={["Y", "N"]} onChange={(v) => actualizar("gen_licencia_permanente", v)} />
        </div>
        <div className="md:col-span-2">
          <CampoFotoSemanal name="gen_foto_licencia" label="Foto de tu licencia" requerido />
        </div>
      </div>

      {SECCIONES_CHECKLIST_SEMANAL.map((seccion) => (
        <div key={seccion.key} className="flex flex-col gap-3">
          <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            {seccion.titulo}
          </h3>
          <div className="flex flex-col gap-2">
            {seccion.campos.map((campo) => (
              <Campo key={campo.key} campo={campo} valor={respuestas[campo.key] ?? ""} onChange={actualizar} esGrua={esGrua} />
            ))}
          </div>
        </div>
      ))}

      {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-md px-5 h-12 font-semibold disabled:opacity-60"
        style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-md)" }}
      >
        {enviado ? <><CheckCircle2 size={18} /> Guardado</> : pending ? "Guardando…" : "Guardar checklist semanal"}
      </button>
    </form>
  );
}
