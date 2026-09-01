"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Camera, CheckCircle2, ChevronLeft, Loader2, X } from "lucide-react";
import { crearChecklist, subirFotoChecklist } from "@/app/(app)/checklist/actions";
import { ComboboxUnidad } from "@/components/ui/combobox-unidad";
import { PUNTOS_INSPECCION } from "@/lib/checklist";
import { ESTADOS_CARGA, MUNICIPIOS_POR_ESTADO, AREAS_CARGA, PERSONAL_POR_AREA } from "@/lib/checklist-carga-combustible";
import { FirmaPad } from "@/components/checklist/firma-pad";

// ─── tipos ───────────────────────────────────────────────────────────────────

type UnidadWizard = {
  numeroEconomico: string;
  marca: string;
  unidadModelo: string;
  tipoVehiculo: string;
  proyectoId: string | null;
  proyectoNombre: string | null;
};

type Props = {
  unidades: UnidadWizard[];
  proyectos: { id: string; nombre: string }[];
  esAdmin: boolean;
  fechaHoraActual: string;
  onTerminar: () => void;
  onCancelar: () => void;
};

type Fase =
  | "identificacion"
  | "generales"
  | "guia"
  | "niveles_extra"
  | "exterior"
  | "interior"
  | "lecturas"
  | "seguridad"
  | "exito";

const ITEMS_INSPECCION = PUNTOS_INSPECCION.map((p) => ({ tipo: "punto" as const, key: p.key, label: p.label }));

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

const navBtnStyle: React.CSSProperties = {
  background: "var(--chip)",
  color: "var(--sidebar-text-active)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-sm)",
};

const btnPrimaryStyle: React.CSSProperties = {
  background: "var(--color-primary)",
  color: "#fff",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
};

const errorStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-sm)",
  color: "var(--color-status-escena)",
};

// ─── sub-componentes ─────────────────────────────────────────────────────────

function BarraProgreso({ actual, total }: { actual: number; total: number }) {
  const pct = total > 0 ? Math.round((actual / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5 flex-1">
      <div className="flex justify-between items-center">
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
          Inspección diaria
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
          {actual} / {total}
        </span>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "var(--field-bg)" }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: "var(--color-primary)" }} />
      </div>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export function WizardDiario({ unidades, proyectos, esAdmin, fechaHoraActual, onTerminar, onCancelar }: Props) {
  const [fase, setFase] = useState<Fase>("identificacion");
  const [idx, setIdx] = useState(0);
  const [proyectoFiltro, setProyectoFiltro] = useState(proyectos[0]?.id ?? "");
  const [numeroEconomico, setNumeroEconomico] = useState("");

  // Guia phase
  const [estados, setEstados] = useState<Record<string, "ok" | "revisar">>({});
  const [fotosPorPunto, setFotosPorPunto] = useState<Record<string, string>>({});

  // Lecturas phase
  const [odometro, setOdometro] = useState("");
  const [horometro, setHorometro] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoHorometroUrl, setFotoHorometroUrl] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoFotoHorometro, setSubiendoFotoHorometro] = useState(false);
  const [subiendoFotoPunto, setSubiendoFotoPunto] = useState(false);

  // Extra sections
  const [respuestasExtra, setRespuestasExtra] = useState<Record<string, string>>({});
  const [fotosExtra, setFotosExtra] = useState<Record<string, string>>({});
  const [firmaBase64, setFirmaBase64] = useState("");
  const [subiendoExtra, setSubiendoExtra] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // File input refs
  const extraFotoInputRef = useRef<HTMLInputElement>(null);
  const fotoPuntoInputRef = useRef<HTMLInputElement>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const fotoHorometroInputRef = useRef<HTMLInputElement>(null);
  const extraFotoKeyRef = useRef("");
  const puntoFotoActualRef = useRef<string | null>(null);

  // Derived
  const unidadesFiltradas = useMemo(
    () => (proyectoFiltro ? unidades.filter((u) => u.proyectoId === proyectoFiltro) : unidades),
    [unidades, proyectoFiltro],
  );
  const unidadSel = unidades.find((u) => u.numeroEconomico === numeroEconomico);
  const esGrua = unidadSel?.tipoVehiculo === "GRUA";

  const fechaDisplay = (() => {
    try {
      return new Date(fechaHoraActual).toLocaleString("es-MX", {
        weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return fechaHoraActual;
    }
  })();

  const zona = respuestasExtra["gen_zona"] ?? "";
  const area = respuestasExtra["gen_area"] ?? "";
  const municipiosDisponibles = zona ? ((MUNICIPIOS_POR_ESTADO as Record<string, string[]>)[zona] ?? []) : [];
  const personalDisponible = area ? ((PERSONAL_POR_AREA as Record<string, string[]>)[area] ?? []) : [];

  const total = ITEMS_INSPECCION.length;
  const guiaItem = ITEMS_INSPECCION[idx];

  // ─── Upload helpers ───────────────────────────────────────────────────────

  function iniciarFotoExtra(key: string) {
    extraFotoKeyRef.current = key;
    if (extraFotoInputRef.current) extraFotoInputRef.current.value = "";
    extraFotoInputRef.current?.click();
  }

  async function handleExtraFoto(file: File | undefined) {
    const key = extraFotoKeyRef.current;
    if (!file || !key) return;
    setSubiendoExtra(key);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await subirFotoChecklist(fd);
      if (!r.ok) throw new Error(r.error);
      setFotosExtra((p) => ({ ...p, [key]: r.url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir foto.");
    } finally {
      setSubiendoExtra(null);
    }
  }

  function abrirFotoPunto(key: string) {
    puntoFotoActualRef.current = key;
    if (fotoPuntoInputRef.current) fotoPuntoInputRef.current.value = "";
    fotoPuntoInputRef.current?.click();
  }

  async function subirFotoPunto(file: File | undefined) {
    const key = puntoFotoActualRef.current;
    if (!file || !key) return;
    setSubiendoFotoPunto(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await subirFotoChecklist(fd);
      if (!r.ok) throw new Error(r.error);
      setFotosPorPunto((p) => ({ ...p, [key]: r.url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir foto.");
    } finally {
      setSubiendoFotoPunto(false);
    }
  }

  async function subirFoto(file: File | undefined) {
    if (!file) return;
    setSubiendoFoto(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await subirFotoChecklist(fd);
      if (!r.ok) throw new Error(r.error);
      setFotoUrl(r.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir foto.");
    } finally {
      setSubiendoFoto(false);
    }
  }

  async function subirFotoHorometro(file: File | undefined) {
    if (!file) return;
    setSubiendoFotoHorometro(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await subirFotoChecklist(fd);
      if (!r.ok) throw new Error(r.error);
      setFotoHorometroUrl(r.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir foto.");
    } finally {
      setSubiendoFotoHorometro(false);
    }
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  function avanzar() {
    if (idx < total - 1) setIdx(idx + 1);
    else setFase("niveles_extra");
  }

  function seleccionarPunto(key: string, valor: "ok" | "revisar") {
    setEstados((s) => ({ ...s, [key]: valor }));
    if (valor === "ok") setTimeout(avanzar, 160);
  }

  // ─── Validations ─────────────────────────────────────────────────────────

  function validarGenerales(): string | null {
    if (!zona) return "Selecciona un estado.";
    if (!respuestasExtra["gen_municipio"]) return "Selecciona un municipio.";
    if (!area) return "Selecciona un área.";
    if (!respuestasExtra["gen_responsable"]) return "Selecciona un responsable.";
    if (!respuestasExtra["gen_tipo_licencia"]) return "Indica el tipo de licencia.";
    if (!fotosExtra["gen_foto_licencia"]) return "La foto de licencia es obligatoria.";
    return null;
  }

  function validarNivelesExtra(): string | null {
    if (!respuestasExtra["niv_luz_check"]) return "Indica si hay luz de check encendida.";
    if (!fotosExtra["niv_evidencia_luz_check"]) return "La foto de la luz de check es obligatoria.";
    if (!respuestasExtra["niv_nivel_combustible"]) return "Indica el nivel de combustible.";
    if (!fotosExtra["niv_evidencia_combustible"]) return "La foto del nivel de combustible es obligatoria.";
    return null;
  }

  function validarExterior(): string | null {
    if (!respuestasExtra["ext_tiene_golpes"]) return "Indica si el vehículo tiene golpes.";
    if (!fotosExtra["ext_evidencia_frente"]) return "La foto del frente es obligatoria.";
    if (!respuestasExtra["ext_parabrisas_espejos"]) return "Indica el estado del parabrisas y espejos.";
    if (!fotosExtra["ext_evidencia_parabrisas_espejos"]) return "La foto de parabrisas/espejos es obligatoria.";
    if (!fotosExtra["ext_evidencia_lado_derecho"]) return "La foto del lado derecho es obligatoria.";
    if (!fotosExtra["ext_evidencia_parte_trasera"]) return "La foto de la parte trasera es obligatoria.";
    if (!fotosExtra["ext_evidencia_lado_izquierdo"]) return "La foto del lado izquierdo es obligatoria.";
    if (esGrua && !fotosExtra["ext_brazo_grua"]) return "La foto del brazo de grúa es obligatoria.";
    return null;
  }

  function validarInterior(): string | null {
    if (!fotosExtra["int_evidencia_tarjeta_circulacion"]) return "La foto de la tarjeta de circulación es obligatoria.";
    if (!fotosExtra["int_evidencia_tarjeta_combustible"]) return "La foto de la tarjeta de combustible es obligatoria.";
    return null;
  }

  function validarLecturas(): string | null {
    if (!odometro || Number(odometro) <= 0) return "Ingresa una lectura de odómetro válida.";
    if (!fotoUrl) return "La foto del odómetro es obligatoria.";
    if (esGrua && !fotoHorometroUrl) return "La foto del horómetro es obligatoria para grúas.";
    return null;
  }

  function validarSeguridad(): string | null {
    if (!respuestasExtra["seg_llanta_refaccion"]) return "Indica si cuenta con llanta de refacción.";
    if (!fotosExtra["seg_evidencia_llanta_refaccion"]) return "La foto de la llanta de refacción es obligatoria.";
    if (!respuestasExtra["seg_gato"]) return "Indica si cuenta con gato.";
    if (!fotosExtra["seg_evidencia_gato"]) return "La foto del gato es obligatoria.";
    if (!respuestasExtra["seg_cables_corriente"]) return "Indica si cuenta con cables de corriente.";
    if (!fotosExtra["seg_evidencia_cables_corriente"]) return "La foto de los cables es obligatoria.";
    if (!firmaBase64) return "La firma del responsable es obligatoria.";
    return null;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  function enviar() {
    const errSeg = validarSeguridad();
    if (errSeg) { setError(errSeg); return; }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("numeroEconomico", numeroEconomico);
      fd.set("odometro", odometro);
      if (esGrua && horometro) fd.set("horometro", horometro);
      fd.set("evidenciaUrl", fotoUrl ?? "");
      if (esGrua && fotoHorometroUrl) fd.set("foto_horometro", fotoHorometroUrl);
      for (const [k, v] of Object.entries(estados)) fd.set(`punto_${k}`, v);
      for (const [k, url] of Object.entries(fotosPorPunto)) fd.set(`foto_${k}`, url);
      for (const [k, v] of Object.entries(respuestasExtra)) fd.set(k, v);
      for (const [k, url] of Object.entries(fotosExtra)) fd.set(k, url);
      if (firmaBase64) fd.set("seg_firma_responsable", firmaBase64);
      const res = await crearChecklist(fd);
      if (!res.ok) { setError(res.error); return; }
      setFase("exito");
    });
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  function rFoto(clave: string, label: string, requerido = true) {
    const url = fotosExtra[clave];
    const sub = subiendoExtra === clave;
    if (url) {
      return (
        <div key={clave}>
          <label style={labelStyle}>{label}{requerido ? " *" : ""}</label>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.3)" }}>
            <Camera size={15} color="#16a34a" className="shrink-0" />
            <span className="flex-1 truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#16a34a" }}>Foto adjuntada</span>
            <button type="button" onClick={() => setFotosExtra((p) => { const c = { ...p }; delete c[clave]; return c; })} style={{ color: "#16a34a", opacity: 0.6, cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
        </div>
      );
    }
    return (
      <div key={clave}>
        <label style={labelStyle}>{label}{requerido ? " *" : ""}</label>
        <button type="button" onClick={() => iniciarFotoExtra(clave)} className="flex items-center justify-center gap-2 rounded-xl w-full"
          style={{ height: 52, background: "var(--field-bg)", border: "1px dashed var(--field-border)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", cursor: "pointer" }}>
          {sub ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {sub ? "Subiendo…" : "Tomar foto"}
        </button>
      </div>
    );
  }

  function rRadio(clave: string, label: string, opciones: string[]) {
    const val = respuestasExtra[clave] ?? "";
    return (
      <div key={clave}>
        <label style={labelStyle}>{label} *</label>
        <div className="flex flex-wrap gap-2">
          {opciones.map((op) => (
            <button key={op} type="button" onClick={() => setRespuestasExtra((p) => ({ ...p, [clave]: op }))}
              className="rounded-full px-4 h-9 font-semibold transition-colors"
              style={{ background: val === op ? "var(--color-primary)" : "var(--field-bg)", color: val === op ? "#fff" : "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", border: val === op ? "none" : "1px solid var(--field-border)", cursor: "pointer", whiteSpace: "nowrap" }}>
              {op}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function rToggle(clave: string, label: string) {
    const val = respuestasExtra[clave] ?? "";
    return (
      <div key={clave}>
        <label style={labelStyle}>{label} *</label>
        <div className="flex gap-2">
          {["SÍ", "NO"].map((op) => (
            <button key={op} type="button" onClick={() => setRespuestasExtra((p) => ({ ...p, [clave]: op }))}
              className="flex-1 rounded-xl font-semibold transition-colors"
              style={{ height: 48, background: val === op ? "var(--color-primary)" : "var(--field-bg)", color: val === op ? "#fff" : "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", border: val === op ? "none" : "1px solid var(--field-border)", cursor: "pointer" }}>
              {val === op ? "✓ " : ""}{op}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Éxito ───────────────────────────────────────────────────────────────

  if (fase === "exito") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl p-10 text-center" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <CheckCircle2 size={52} color="var(--color-status-cerrado)" />
        <div>
          <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Checklist diario guardado
          </h3>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", marginTop: 6 }}>
            La inspección de <strong>{numeroEconomico}</strong> fue registrada correctamente.
          </p>
        </div>
        <button type="button" onClick={onTerminar} className="flex items-center gap-2 rounded-md px-5 h-10 font-semibold"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          Capturar otro checklist
        </button>
      </div>
    );
  }

  // ─── Todas las demás fases comparten los inputs ocultos ───────────────────

  return (
    <>
      {/* Inputs ocultos — siempre montados para estabilidad de refs */}
      <input ref={extraFotoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => handleExtraFoto(e.target.files?.[0])} />
      <input ref={fotoPuntoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => subirFotoPunto(e.target.files?.[0])} />
      <input ref={fotoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => subirFoto(e.target.files?.[0])} />
      <input ref={fotoHorometroInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => subirFotoHorometro(e.target.files?.[0])} />

      {/* ── IDENTIFICACIÓN ── */}
      {fase === "identificacion" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancelar} className="flex items-center gap-1 rounded-md px-2 h-8" style={navBtnStyle}>
              <ChevronLeft size={14} /> Volver
            </button>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <div>
              <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
                Checklist diario
              </h3>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", marginTop: 4 }}>
                {fechaDisplay}
              </p>
            </div>

            {(esAdmin || proyectos.length > 1) && (
              <div>
                <label style={labelStyle}>Proyecto</label>
                <select value={proyectoFiltro} onChange={(e) => { setProyectoFiltro(e.target.value); setNumeroEconomico(""); }} style={fieldStyle} className="rounded-md">
                  <option value="">Todos los proyectos</option>
                  {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            )}

            <div>
              <label style={labelStyle}>Número económico *</label>
              <ComboboxUnidad
                name="numeroEconomico"
                unidades={unidadesFiltradas.map((u) => ({ numeroEconomico: u.numeroEconomico, etiqueta: `${u.numeroEconomico} — ${u.marca} ${u.unidadModelo}` }))}
                defaultValue={numeroEconomico}
                required
                onSeleccionar={setNumeroEconomico}
                style={fieldStyle}
              />
            </div>

            {unidadSel && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Vehículo</label>
                  <div className="flex items-center px-3 rounded-md" style={{ ...fieldStyle, opacity: 0.7, cursor: "default" }}>
                    {unidadSel.marca} {unidadSel.unidadModelo}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Proyecto</label>
                  <div className="flex items-center px-3 rounded-md" style={{ ...fieldStyle, opacity: 0.7, cursor: "default" }}>
                    {unidadSel.proyectoNombre ?? "—"}
                  </div>
                </div>
              </div>
            )}

            {error && <p style={errorStyle}>{error}</p>}

            <button type="button" onClick={() => {
              if (!numeroEconomico) { setError("Selecciona un número económico."); return; }
              setError(null);
              setFase("generales");
            }} className="w-full rounded-xl h-12 font-semibold transition-colors"
              style={{ ...(numeroEconomico ? btnPrimaryStyle : { background: "var(--chip)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }), cursor: numeroEconomico ? "pointer" : "default" }}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── GENERALES ── */}
      {fase === "generales" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); setFase("identificacion"); }} className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0" style={navBtnStyle}>
              <ChevronLeft size={14} /> Unidad
            </button>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Paso 1 de 7 — Datos generales</span>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>Datos generales</h3>

            <div>
              <label style={labelStyle}>Estado *</label>
              <select value={zona} onChange={(e) => setRespuestasExtra((p) => ({ ...p, gen_zona: e.target.value, gen_municipio: "" }))} style={fieldStyle} className="rounded-md">
                <option value="">Selecciona un estado</option>
                {(ESTADOS_CARGA as readonly string[]).map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Municipio *</label>
              <select value={respuestasExtra["gen_municipio"] ?? ""} onChange={(e) => setRespuestasExtra((p) => ({ ...p, gen_municipio: e.target.value }))}
                style={{ ...fieldStyle, opacity: !zona ? 0.5 : 1 }} className="rounded-md" disabled={!zona}>
                <option value="">Selecciona un municipio</option>
                {municipiosDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Área *</label>
              <select value={area} onChange={(e) => setRespuestasExtra((p) => ({ ...p, gen_area: e.target.value, gen_responsable: "" }))} style={fieldStyle} className="rounded-md">
                <option value="">Selecciona un área</option>
                {(AREAS_CARGA as readonly string[]).map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Responsable *</label>
              <select value={respuestasExtra["gen_responsable"] ?? ""} onChange={(e) => setRespuestasExtra((p) => ({ ...p, gen_responsable: e.target.value }))}
                style={{ ...fieldStyle, opacity: !area ? 0.5 : 1 }} className="rounded-md" disabled={!area}>
                <option value="">Selecciona un responsable</option>
                {personalDisponible.map((per) => <option key={per} value={per}>{per}</option>)}
              </select>
            </div>

            {rRadio("gen_tipo_licencia", "Tipo de licencia", ["CON VIGENCIA", "SIN VIGENCIA"])}
            {rFoto("gen_foto_licencia", "Foto de licencia")}

            {error && <p style={errorStyle}>{error}</p>}

            <button type="button" onClick={() => {
              const err = validarGenerales();
              if (err) { setError(err); return; }
              setError(null);
              setIdx(0);
              setFase("guia");
            }} className="w-full rounded-xl h-12 font-semibold" style={btnPrimaryStyle}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── GUÍA ── */}
      {fase === "guia" && guiaItem && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); if (idx > 0) setIdx(idx - 1); else setFase("generales"); }}
              className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0" style={navBtnStyle}>
              <ChevronLeft size={14} />
              {idx === 0 ? "Generales" : "Anterior"}
            </button>
            <BarraProgreso actual={idx + 1} total={total} />
          </div>

          <div className="rounded-2xl p-5 flex flex-col gap-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <div>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                Punto de inspección — Paso 2 de 7
              </span>
              <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)", marginTop: 4, lineHeight: 1.2 }}>
                {guiaItem.label}
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => seleccionarPunto(guiaItem.key, "ok")} className="rounded-xl w-full font-bold transition-all"
                style={{ height: 68, background: estados[guiaItem.key] === "ok" ? "#16a34a" : "var(--field-bg)", color: estados[guiaItem.key] === "ok" ? "#fff" : "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xl)", border: estados[guiaItem.key] === "ok" ? "none" : "1px solid var(--field-border)", cursor: "pointer", boxShadow: estados[guiaItem.key] === "ok" ? "0 2px 10px rgba(22,163,74,0.3)" : "none" }}>
                {estados[guiaItem.key] === "ok" ? "✓ " : ""}OK — Todo en orden
              </button>
              <button type="button" onClick={() => seleccionarPunto(guiaItem.key, "revisar")} className="rounded-xl w-full font-bold transition-all"
                style={{ height: 68, background: estados[guiaItem.key] === "revisar" ? "#d97706" : "var(--field-bg)", color: estados[guiaItem.key] === "revisar" ? "#fff" : "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xl)", border: estados[guiaItem.key] === "revisar" ? "none" : "1px solid var(--field-border)", cursor: "pointer", boxShadow: estados[guiaItem.key] === "revisar" ? "0 2px 10px rgba(217,119,6,0.3)" : "none" }}>
                {estados[guiaItem.key] === "revisar" ? "✓ " : ""}⚠ Revisar
              </button>
            </div>

            {estados[guiaItem.key] === "revisar" && (
              <div className="flex flex-col gap-3 pt-1 border-t" style={{ borderColor: "var(--field-border)" }}>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", fontWeight: 600 }}>
                  Foto del problema (opcional)
                </p>
                {fotosPorPunto[guiaItem.key] ? (
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.3)" }}>
                    <Camera size={15} color="#16a34a" className="shrink-0" />
                    <span className="flex-1 truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#16a34a" }}>Foto adjuntada</span>
                    <button type="button" onClick={() => setFotosPorPunto((p) => { const c = { ...p }; delete c[guiaItem.key]; return c; })} style={{ color: "#16a34a", opacity: 0.6, cursor: "pointer" }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => abrirFotoPunto(guiaItem.key)} className="flex items-center justify-center gap-2 rounded-xl w-full"
                    style={{ height: 48, background: "var(--field-bg)", border: "1px dashed var(--field-border)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", cursor: "pointer" }}>
                    {subiendoFotoPunto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    {subiendoFotoPunto ? "Subiendo…" : "Tomar foto del problema"}
                  </button>
                )}
                <button type="button" onClick={avanzar} disabled={subiendoFotoPunto} className="w-full rounded-xl h-11 font-semibold transition-colors disabled:opacity-60" style={btnPrimaryStyle}>
                  Continuar →
                </button>
              </div>
            )}

            {!estados[guiaItem.key] && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textAlign: "center" }}>
                Selecciona una opción para continuar automáticamente
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── NIVELES EXTRA ── */}
      {fase === "niveles_extra" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); setIdx(total - 1); setFase("guia"); }} className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0" style={navBtnStyle}>
              <ChevronLeft size={14} /> Anterior
            </button>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Paso 3 de 7 — Niveles</span>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>Niveles del vehículo</h3>
            {rToggle("niv_luz_check", "¿Luz de check encendida?")}
            {rFoto("niv_evidencia_luz_check", "Evidencia fotográfica (luz de check)")}
            {rRadio("niv_nivel_combustible", "Nivel de combustible", ["MÍNIMO", "MEDIO", "MÁXIMO"])}
            {rFoto("niv_evidencia_combustible", "Evidencia fotográfica (combustible)")}
            {error && <p style={errorStyle}>{error}</p>}
            <button type="button" onClick={() => {
              const err = validarNivelesExtra();
              if (err) { setError(err); return; }
              setError(null);
              setFase("exterior");
            }} className="w-full rounded-xl h-12 font-semibold" style={btnPrimaryStyle}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── EXTERIOR ── */}
      {fase === "exterior" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); setFase("niveles_extra"); }} className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0" style={navBtnStyle}>
              <ChevronLeft size={14} /> Anterior
            </button>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Paso 4 de 7 — Exterior</span>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>Exterior del vehículo</h3>
            {rToggle("ext_tiene_golpes", "¿El vehículo tiene golpes?")}
            {rFoto("ext_evidencia_frente", "Foto frente del vehículo")}
            {rRadio("ext_parabrisas_espejos", "Estado del parabrisas y espejos", ["BUEN ESTADO", "ESTRELLADO", "ROTO", "N/A"])}
            {rFoto("ext_evidencia_parabrisas_espejos", "Foto parabrisas y espejos")}
            {rFoto("ext_evidencia_lado_derecho", "Foto lado derecho")}
            {rFoto("ext_evidencia_parte_trasera", "Foto parte trasera")}
            {rFoto("ext_evidencia_lado_izquierdo", "Foto lado izquierdo")}
            {esGrua && rFoto("ext_brazo_grua", "Foto brazo de grúa")}
            {error && <p style={errorStyle}>{error}</p>}
            <button type="button" onClick={() => {
              const err = validarExterior();
              if (err) { setError(err); return; }
              setError(null);
              setFase("interior");
            }} className="w-full rounded-xl h-12 font-semibold" style={btnPrimaryStyle}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── INTERIOR ── */}
      {fase === "interior" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); setFase("exterior"); }} className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0" style={navBtnStyle}>
              <ChevronLeft size={14} /> Anterior
            </button>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Paso 5 de 7 — Interior</span>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>Documentos en cabina</h3>
            {rFoto("int_evidencia_tarjeta_circulacion", "Foto tarjeta de circulación")}
            {rFoto("int_evidencia_tarjeta_combustible", "Foto tarjeta de combustible")}
            {error && <p style={errorStyle}>{error}</p>}
            <button type="button" onClick={() => {
              const err = validarInterior();
              if (err) { setError(err); return; }
              setError(null);
              setFase("lecturas");
            }} className="w-full rounded-xl h-12 font-semibold" style={btnPrimaryStyle}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── LECTURAS ── */}
      {fase === "lecturas" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); setFase("interior"); }} className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0" style={navBtnStyle}>
              <ChevronLeft size={14} /> Anterior
            </button>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Paso 6 de 7 — Lecturas</span>
          </div>
          <div className="rounded-2xl p-5 flex flex-col gap-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <div>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                Lecturas finales
              </span>
              <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)", marginTop: 4 }}>
                Odómetro y evidencia
              </h2>
            </div>

            <div>
              <label style={labelStyle}>Lectura del odómetro (km) *</label>
              <input type="number" min={0} value={odometro} onChange={(e) => setOdometro(e.target.value)} placeholder="Kilómetros" className="rounded-md"
                style={{ ...fieldStyle, fontFamily: "var(--font-mono)", fontSize: "var(--text-xl)", height: 56 }} />
            </div>

            {esGrua && (
              <div>
                <label style={labelStyle}>Horómetro (horas)</label>
                <input type="number" min={0} value={horometro} onChange={(e) => setHorometro(e.target.value)} placeholder="Horas" className="rounded-md"
                  style={{ ...fieldStyle, fontFamily: "var(--font-mono)", fontSize: "var(--text-xl)", height: 56 }} />
              </div>
            )}

            <div>
              <label style={labelStyle}>Foto del odómetro *</label>
              {fotoUrl ? (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.3)" }}>
                  <Camera size={15} color="#16a34a" className="shrink-0" />
                  <span className="flex-1 truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#16a34a" }}>Foto adjuntada</span>
                  <button type="button" onClick={() => setFotoUrl(null)} style={{ color: "#16a34a", opacity: 0.6, cursor: "pointer" }}><X size={14} /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fotoInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl w-full"
                  style={{ height: 52, background: "var(--field-bg)", border: "1px dashed var(--field-border)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", cursor: "pointer" }}>
                  {subiendoFoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                  {subiendoFoto ? "Subiendo…" : "Tomar foto del odómetro"}
                </button>
              )}
            </div>

            {esGrua && (
              <div>
                <label style={labelStyle}>Foto del horómetro *</label>
                {fotoHorometroUrl ? (
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.3)" }}>
                    <Camera size={15} color="#16a34a" className="shrink-0" />
                    <span className="flex-1 truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#16a34a" }}>Foto adjuntada</span>
                    <button type="button" onClick={() => setFotoHorometroUrl(null)} style={{ color: "#16a34a", opacity: 0.6, cursor: "pointer" }}><X size={14} /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fotoHorometroInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl w-full"
                    style={{ height: 52, background: "var(--field-bg)", border: "1px dashed var(--field-border)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", cursor: "pointer" }}>
                    {subiendoFotoHorometro ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    {subiendoFotoHorometro ? "Subiendo…" : "Tomar foto del horómetro"}
                  </button>
                )}
              </div>
            )}

            {error && <p style={errorStyle}>{error}</p>}

            <button type="button" onClick={() => {
              const err = validarLecturas();
              if (err) { setError(err); return; }
              setError(null);
              setFase("seguridad");
            }} disabled={subiendoFoto || subiendoFotoHorometro} className="w-full rounded-xl h-12 font-semibold transition-colors disabled:opacity-60" style={btnPrimaryStyle}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── SEGURIDAD ── */}
      {fase === "seguridad" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); setFase("lecturas"); }} className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0" style={navBtnStyle}>
              <ChevronLeft size={14} /> Anterior
            </button>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Paso 7 de 7 — Seguridad y firma</span>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>Equipamiento y seguridad</h3>

            {rToggle("seg_llanta_refaccion", "¿Cuenta con llanta de refacción?")}
            {rFoto("seg_evidencia_llanta_refaccion", "Foto llanta de refacción")}
            {rToggle("seg_gato", "¿Cuenta con gato?")}
            {rFoto("seg_evidencia_gato", "Foto del gato")}
            {rToggle("seg_cables_corriente", "¿Cuenta con cables de corriente?")}
            {rFoto("seg_evidencia_cables_corriente", "Foto de cables de corriente")}

            <div>
              <label style={labelStyle}>Observaciones</label>
              <textarea
                value={respuestasExtra["seg_observaciones"] ?? ""}
                onChange={(e) => setRespuestasExtra((p) => ({ ...p, seg_observaciones: e.target.value }))}
                rows={3}
                placeholder="Anota cualquier observación o irregularidad…"
                style={{ ...fieldStyle, height: "auto", padding: "10px 12px", resize: "none" }}
                className="rounded-md"
              />
            </div>

            <FirmaPad name="sig_diario" label="Firma del responsable" required onFirma={setFirmaBase64} />

            {error && <p style={errorStyle}>{error}</p>}

            <button type="button" onClick={enviar} disabled={pending} className="w-full rounded-xl h-12 font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              style={pending ? { background: "var(--chip)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" } : btnPrimaryStyle}>
              {pending && <Loader2 size={16} className="animate-spin" />}
              {pending ? "Guardando…" : "Finalizar checklist"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
