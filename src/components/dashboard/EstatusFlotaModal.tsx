"use client";

import { useState } from "react";
import { X, FileDown, Mail, Loader2, CheckCircle2, Plus } from "lucide-react";
import {
  obtenerDatosEstatusFlota,
  enviarEstatusFlotaAhora,
  guardarProgramacionEstatusFlota,
  type ConfigEstatusFlotaProgramado,
} from "@/app/(app)/dashboards/actions";
import { BI_DATASETS } from "@/lib/bi/metadata";
import { VISUALIZACION_SUGERIDA, VISUALIZACION_SUGERIDA_LABEL, type CampoExtraSeleccionado } from "@/lib/reportes/campos-extra-tipos";

type ProyectoDisponible = { id: string; nombre: string };

function hoyISO(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

/**
 * `obtenerDatosEstatusFlota` viaja por JSON (server action), así que aquí
 * `desde`/`hasta`/`proximosServicios[].fecha` llegan como strings ISO aunque
 * el tipo diga `Date` — hay que reconstruirlos antes de pasarlos al PDF
 * (EstatusFlotaDocument llama `.toLocaleDateString()` sobre esos campos).
 */
function rehidratarFechasAlcance<T extends { desde: Date; hasta: Date; proximosServicios: { fecha: Date }[] }>(alcance: T): T {
  return {
    ...alcance,
    desde: new Date(alcance.desde),
    hasta: new Date(alcance.hasta),
    proximosServicios: alcance.proximosServicios.map((s) => ({ ...s, fecha: new Date(s.fecha) })),
  };
}

const DIAS_SEMANA = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

const MAX_CAMPOS_EXTRA = 18;

const PERIODOS_DIAS = [
  { value: 7, label: "Últimos 7 días" },
  { value: 15, label: "Últimos 15 días" },
  { value: 30, label: "Últimos 30 días" },
  { value: 60, label: "Últimos 60 días" },
  { value: 90, label: "Últimos 90 días" },
];

const fieldStyle: React.CSSProperties = {
  border: "1px solid var(--field-border)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-sm)",
  color: "var(--field-text)",
  borderRadius: 8,
  padding: "8px 12px",
  width: "100%",
  outline: "none",
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

export function EstatusFlotaModal({
  onClose,
  proyectosDisponibles,
  configInicial,
  puedeEditar,
}: {
  onClose: () => void;
  proyectosDisponibles: ProyectoDisponible[];
  configInicial: ConfigEstatusFlotaProgramado;
  puedeEditar: boolean;
}) {
  const [seleccionados, setSeleccionados] = useState<string[]>(configInicial.proyectoIds ?? []);
  const [desde, setDesde] = useState(hoyISO(-7));
  const [hasta, setHasta] = useState(hoyISO());
  const [destinatarios, setDestinatarios] = useState(configInicial.destinatarios.join(", "));
  const [horaAutomatica, setHoraAutomatica] = useState(configInicial.hora);
  const [diaSemanaAutomatico, setDiaSemanaAutomatico] = useState(configInicial.diaSemana);
  const [periodoDiasAutomatico, setPeriodoDiasAutomatico] = useState(configInicial.periodoDias);
  const [envioAutomaticoActivo, setEnvioAutomaticoActivo] = useState(configInicial.activo);
  const [camposExtra, setCamposExtra] = useState<CampoExtraSeleccionado[]>(configInicial.camposExtra ?? []);
  const [mostrarSelectorCampos, setMostrarSelectorCampos] = useState(false);

  const [descargando, setDescargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  function alternarProyecto(id: string) {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function alternarCampoExtra(datasetId: string, campoId: string) {
    setCamposExtra((prev) => {
      const yaEsta = prev.some((c) => c.datasetId === datasetId && c.campoId === campoId);
      if (yaEsta) return prev.filter((c) => !(c.datasetId === datasetId && c.campoId === campoId));
      if (prev.length >= MAX_CAMPOS_EXTRA) return prev;
      return [...prev, { datasetId, campoId }];
    });
  }

  function quitarCampoExtra(datasetId: string, campoId: string) {
    setCamposExtra((prev) => prev.filter((c) => !(c.datasetId === datasetId && c.campoId === campoId)));
  }

  const todosSeleccionados = proyectosDisponibles.length > 0 && seleccionados.length === proyectosDisponibles.length;

  async function descargar() {
    setDescargando(true);
    setMensaje(null);
    try {
      const res = await obtenerDatosEstatusFlota({ proyectoIds: seleccionados, desde, hasta, camposExtra });
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: res.error });
        return;
      }
      const [{ pdf }, { EstatusFlotaDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./EstatusFlotaDocument"),
      ]);
      const datos = {
        ...res.datos,
        desde: new Date(res.datos.desde),
        hasta: new Date(res.datos.hasta),
        seleccion: res.datos.seleccion ? rehidratarFechasAlcance(res.datos.seleccion) : null,
        porProyecto: res.datos.porProyecto.map(rehidratarFechasAlcance),
        general: rehidratarFechasAlcance(res.datos.general),
      };
      const blob = await pdf(<EstatusFlotaDocument datos={datos} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estatus-flota-${hasta}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "No se pudo generar el PDF. Intenta de nuevo." });
    } finally {
      setDescargando(false);
    }
  }

  async function enviarAhora() {
    const listaDestinatarios = destinatarios.split(",").map((d) => d.trim()).filter(Boolean);
    if (listaDestinatarios.length === 0) {
      setMensaje({ tipo: "error", texto: "Indica al menos un destinatario para enviar por correo." });
      return;
    }
    setEnviando(true);
    setMensaje(null);
    const res = await enviarEstatusFlotaAhora({ proyectoIds: seleccionados, desde, hasta, destinatarios: listaDestinatarios, camposExtra });
    setEnviando(false);
    setMensaje(res.ok ? { tipo: "ok", texto: "Correo enviado." } : { tipo: "error", texto: res.error ?? "No se pudo enviar." });
  }

  async function guardarAutomatico() {
    const listaDestinatarios = destinatarios.split(",").map((d) => d.trim()).filter(Boolean);
    setGuardando(true);
    setMensaje(null);
    const res = await guardarProgramacionEstatusFlota({
      id: configInicial.id,
      proyectoIds: seleccionados,
      hora: horaAutomatica,
      diaSemana: diaSemanaAutomatico,
      periodoDias: periodoDiasAutomatico,
      destinatarios: listaDestinatarios,
      activo: envioAutomaticoActivo,
      camposExtra,
    });
    setGuardando(false);
    setMensaje(res.ok ? { tipo: "ok", texto: "Envío automático guardado." } : { tipo: "error", texto: res.error ?? "No se pudo guardar." });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl shadow-xl" style={{ background: "var(--panel-bg)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--field-border)" }}>
          <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Generar reporte
          </h2>
          <button onClick={onClose} style={{ color: "var(--sidebar-text)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label style={{ ...labelStyle, marginBottom: 0 }}>Proyectos a desglosar (opcional)</label>
              <button
                type="button"
                onClick={() => setSeleccionados(todosSeleccionados ? [] : proyectosDisponibles.map((p) => p.id))}
                style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer" }}
              >
                {todosSeleccionados ? "Quitar selección" : "Seleccionar todos"}
              </button>
            </div>
            <div className="flex flex-col gap-1 pl-1 max-h-32 overflow-y-auto">
              {proyectosDisponibles.map((p) => (
                <label key={p.id} className="flex items-center gap-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>
                  <input type="checkbox" checked={seleccionados.includes(p.id)} onChange={() => alternarProyecto(p.id)} />
                  {p.nombre}
                </label>
              ))}
            </div>
            <p className="mt-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
              El reporte siempre incluye el resumen general. Si eliges proyectos aquí, también incluye el resumen combinado de la selección y el desglose de cada uno.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label style={{ ...labelStyle, marginBottom: 0 }}>Datos adicionales (opcional)</label>
              <button
                type="button"
                onClick={() => setMostrarSelectorCampos((v) => !v)}
                className="flex items-center gap-1"
                style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer" }}
              >
                <Plus size={12} /> {mostrarSelectorCampos ? "Cerrar catálogo" : "Agregar dato"}
              </button>
            </div>

            {camposExtra.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {camposExtra.map((c) => {
                  const dataset = BI_DATASETS.find((d) => d.id === c.datasetId);
                  const campo = dataset?.campos.find((cm) => cm.id === c.campoId);
                  if (!dataset || !campo) return null;
                  return (
                    <span
                      key={`${c.datasetId}.${c.campoId}`}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1"
                      style={{ background: "var(--chip)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text-active)" }}
                    >
                      {campo.label}
                      <span style={{ color: "var(--sidebar-text)" }}>· {VISUALIZACION_SUGERIDA_LABEL[VISUALIZACION_SUGERIDA[campo.tipo]]}</span>
                      <button type="button" onClick={() => quitarCampoExtra(c.datasetId, c.campoId)} style={{ color: "var(--sidebar-text)", cursor: "pointer" }}>
                        <X size={11} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {mostrarSelectorCampos && (
              <div className="flex flex-col gap-2 rounded-lg p-3 max-h-56 overflow-y-auto" style={{ background: "var(--field-bg)" }}>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                  Elige cualquier dato del catálogo — el sistema decide solo cómo mostrarlo según su tipo (número → dato KPI, categoría/fecha → gráfica de barras). Máximo {MAX_CAMPOS_EXTRA}.
                </p>
                {BI_DATASETS.map((dataset) => (
                  <details key={dataset.id}>
                    <summary className="cursor-pointer" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                      {dataset.label}
                    </summary>
                    <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2 pl-2">
                      {dataset.campos.map((campo) => {
                        const activo = camposExtra.some((c) => c.datasetId === dataset.id && c.campoId === campo.id);
                        return (
                          <button
                            key={campo.id}
                            type="button"
                            onClick={() => alternarCampoExtra(dataset.id, campo.id)}
                            className="rounded-full px-2.5 py-1"
                            style={{
                              background: activo ? "var(--color-primary)" : "var(--panel-bg)",
                              color: activo ? "#fff" : "var(--sidebar-text-active)",
                              fontFamily: "var(--font-ui)",
                              fontSize: "var(--text-xs)",
                              cursor: "pointer",
                            }}
                            title={`Se mostrará como: ${VISUALIZACION_SUGERIDA_LABEL[VISUALIZACION_SUGERIDA[campo.tipo]]}`}
                          >
                            {campo.label}
                          </button>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label style={labelStyle}>Desde</label>
              <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} style={fieldStyle} />
            </div>
            <div className="flex-1">
              <label style={labelStyle}>Hasta</label>
              <input type="date" value={hasta} min={desde} max={hoyISO()} onChange={(e) => setHasta(e.target.value)} style={fieldStyle} />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={descargar}
              disabled={descargando}
              className="flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg disabled:opacity-50"
              style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
            >
              {descargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Descargar PDF
            </button>
          </div>

          <div>
            <label style={labelStyle}>Destinatarios (separados por coma)</label>
            <input value={destinatarios} onChange={(e) => setDestinatarios(e.target.value)} placeholder="nombre@grupokabat.com" style={fieldStyle} />
          </div>

          <button
            onClick={enviarAhora}
            disabled={enviando}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg disabled:opacity-50 w-fit"
            style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Enviar por correo ahora
          </button>

          {puedeEditar && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--chip)" }}>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                Envío automático semanal
              </p>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                Se envía el día y hora que elijas, cada semana, a los proyectos y destinatarios de arriba, con los datos del periodo y los datos adicionales seleccionados.
              </p>
              <label className="flex items-center gap-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>
                <input type="checkbox" checked={envioAutomaticoActivo} onChange={(e) => setEnvioAutomaticoActivo(e.target.checked)} />
                Activar envío automático
              </label>
              <div className="flex flex-wrap gap-3">
                <div className="max-w-[180px]">
                  <label style={labelStyle}>Día de la semana</label>
                  <select
                    value={diaSemanaAutomatico}
                    onChange={(e) => setDiaSemanaAutomatico(Number(e.target.value))}
                    style={fieldStyle}
                  >
                    {DIAS_SEMANA.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div className="max-w-[160px]">
                  <label style={labelStyle}>Hora (México)</label>
                  <input
                    type="time"
                    value={`${horaAutomatica.padStart(2, "0")}:00`}
                    onChange={(e) => setHoraAutomatica(e.target.value.split(":")[0])}
                    style={fieldStyle}
                  />
                </div>
                <div className="max-w-[200px]">
                  <label style={labelStyle}>Periodo de datos</label>
                  <select
                    value={periodoDiasAutomatico}
                    onChange={(e) => setPeriodoDiasAutomatico(Number(e.target.value))}
                    style={fieldStyle}
                  >
                    {PERIODOS_DIAS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={guardarAutomatico}
                disabled={guardando}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg disabled:opacity-50 w-fit"
                style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
              >
                {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Guardar envío automático
              </button>
            </div>
          )}

          {mensaje && (
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-sm)",
                color: mensaje.tipo === "ok" ? "var(--color-status-cerrado)" : "var(--color-error)",
              }}
            >
              {mensaje.texto}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
