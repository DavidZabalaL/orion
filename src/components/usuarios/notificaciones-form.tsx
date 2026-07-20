"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { actualizarConfiguracionNotificaciones } from "@/app/(app)/usuarios/notificaciones/actions";

type Config = {
  id: string;
  alertaGpsSinSenalHoras: number;
  alertaGpsSinSenalActiva: boolean;
  alertaMantenimientoDiasPrevios: number[];
  alertaMantenimientoActiva: boolean;
  alertaRendimientoUmbralPct: number;
  alertaRendimientoActiva: boolean;
  alertaSeguroDiasPrevios: number[];
  alertaSeguroActiva: boolean;
  alertaSenalPerdidaMinutos: number;
  alertaSenalPerdidaActiva: boolean;
  alertaChecklistFaltanteActiva: boolean;
  alertaChecklistHoraLimite: string;
  alertaDocumentoOperadorDiasPrevios: number[];
  alertaDocumentoOperadorActiva: boolean;
  destinatariosCorreo: string[];
};

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

function Toggle({ name, defaultChecked, label }: { name: string; defaultChecked: boolean; label: string }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 cursor-pointer" style={{ background: "var(--field-bg)" }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{label}</span>
      <input type="checkbox" name={name} checked={checked} onChange={(e) => setChecked(e.target.checked)} className="hidden" />
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0"
        style={{ background: checked ? "var(--color-primary)" : "var(--chip)" }}
        onClick={() => setChecked((c) => !c)}
      >
        <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform" style={{ transform: checked ? "translateX(18px)" : "translateX(3px)" }} />
      </span>
    </label>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{titulo}</h3>
      {children}
    </div>
  );
}

export function NotificacionesForm({ config }: { config: Config }) {
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);

  return (
    <form
      className="flex flex-col gap-5"
      action={(formData) => {
        startTransition(async () => {
          await actualizarConfiguracionNotificaciones(formData);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        });
      }}
    >
      <input type="hidden" name="id" value={config.id} />

      <Bloque titulo="Geolocalización (Módulo A / G.1)">
        <Toggle name="alertaGpsSinSenalActiva" defaultChecked={config.alertaGpsSinSenalActiva} label="Alertar si una unidad disponible no reporta GPS" />
        <div>
          <label style={labelStyle}>Horas sin reporte antes de alertar</label>
          <input name="alertaGpsSinSenalHoras" type="number" defaultValue={config.alertaGpsSinSenalHoras} style={{ ...fieldStyle, maxWidth: 160, fontFamily: "var(--font-mono)" }} />
        </div>
        <Toggle name="alertaSenalPerdidaActiva" defaultChecked={config.alertaSenalPerdidaActiva} label="Alertar por señal GPS perdida (huecos)" />
        <div>
          <label style={labelStyle}>Minutos sin señal antes de registrar hueco</label>
          <input name="alertaSenalPerdidaMinutos" type="number" defaultValue={config.alertaSenalPerdidaMinutos} style={{ ...fieldStyle, maxWidth: 160, fontFamily: "var(--font-mono)" }} />
        </div>
      </Bloque>

      <Bloque titulo="Mantenimiento, tenencia y verificación (Módulo C)">
        <Toggle name="alertaMantenimientoActiva" defaultChecked={config.alertaMantenimientoActiva} label="Alertar antes del vencimiento" />
        <div>
          <label style={labelStyle}>Días de anticipación (separados por coma)</label>
          <input name="alertaMantenimientoDiasPrevios" defaultValue={config.alertaMantenimientoDiasPrevios.join(", ")} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
      </Bloque>

      <Bloque titulo="Combustible (Módulo D)">
        <Toggle name="alertaRendimientoActiva" defaultChecked={config.alertaRendimientoActiva} label="Alertar cuando el rendimiento cae del umbral" />
        <div>
          <label style={labelStyle}>Umbral de caída (%)</label>
          <input name="alertaRendimientoUmbralPct" type="number" defaultValue={config.alertaRendimientoUmbralPct} style={{ ...fieldStyle, maxWidth: 160, fontFamily: "var(--font-mono)" }} />
        </div>
      </Bloque>

      <Bloque titulo="Seguros (Módulo F)">
        <Toggle name="alertaSeguroActiva" defaultChecked={config.alertaSeguroActiva} label="Alertar antes del vencimiento de la póliza" />
        <div>
          <label style={labelStyle}>Días de anticipación (separados por coma)</label>
          <input name="alertaSeguroDiasPrevios" defaultValue={config.alertaSeguroDiasPrevios.join(", ")} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
      </Bloque>

      <Bloque titulo="Checklist diario (Módulo I)">
        <Toggle name="alertaChecklistFaltanteActiva" defaultChecked={config.alertaChecklistFaltanteActiva} label="Recordatorio si una unidad activa no capturó checklist" />
        <div>
          <label style={labelStyle}>Hora límite de captura</label>
          <input name="alertaChecklistHoraLimite" type="time" defaultValue={config.alertaChecklistHoraLimite} style={{ ...fieldStyle, maxWidth: 160 }} />
        </div>
      </Bloque>

      <Bloque titulo="Documentación de operadores (Módulo L)">
        <Toggle name="alertaDocumentoOperadorActiva" defaultChecked={config.alertaDocumentoOperadorActiva} label="Alertar antes del vencimiento de documentos" />
        <div>
          <label style={labelStyle}>Días de anticipación (separados por coma)</label>
          <input name="alertaDocumentoOperadorDiasPrevios" defaultValue={config.alertaDocumentoOperadorDiasPrevios.join(", ")} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
      </Bloque>

      <Bloque titulo="Destinatarios">
        <div>
          <label style={labelStyle}>Correos que reciben las alertas (separados por coma)</label>
          <input name="destinatariosCorreo" defaultValue={config.destinatariosCorreo.join(", ")} placeholder="control.vehicular@grupokabat.com" style={fieldStyle} />
        </div>
      </Bloque>

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-md px-5 h-11 font-semibold disabled:opacity-60 w-fit"
        style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      >
        {ok ? <><CheckCircle2 size={16} /> Guardado</> : pending ? "Guardando…" : "Guardar configuración"}
      </button>
    </form>
  );
}
