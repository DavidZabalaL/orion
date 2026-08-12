"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { Camera, CheckCircle2, ChevronLeft, Loader2, X } from "lucide-react";
import { crearChecklistSemanal } from "@/app/(app)/checklist/actions";
import { ComboboxUnidad } from "@/components/ui/combobox-unidad";
import { SECCIONES_CHECKLIST_SEMANAL } from "@/lib/checklist-semanal";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";

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

type ItemGuia =
  | { tipo: "toggle_gen"; key: string; label: string; opciones: string[]; etiquetas: string[] }
  | { tipo: "foto_gen"; key: string; label: string }
  | { tipo: "lectura"; key: string; label: string; fotoKey: string; fotoLabel: string }
  | { tipo: "radio"; key: string; label: string; opciones: string[]; seccion: string; fotoKey?: string; fotoLabel?: string; fotoRequerido?: boolean; requerido: boolean }
  | { tipo: "foto"; key: string; label: string; seccion: string; requerido: boolean }
  | { tipo: "numero"; key: string; label: string; seccion: string; min?: number; max?: number; requerido: boolean }
  | { tipo: "toggle"; key: string; label: string; opciones: string[]; seccion: string }
  | { tipo: "textarea"; key: string; label: string; seccion: string };

// ─── helpers ─────────────────────────────────────────────────────────────────

function construirItems(esGrua: boolean): ItemGuia[] {
  const items: ItemGuia[] = [
    { tipo: "toggle_gen", key: "gen_licencia_permanente", label: "¿Tu licencia de conducir es permanente?", opciones: ["Y", "N"], etiquetas: ["Sí, es permanente", "No, tiene vencimiento"] },
    { tipo: "foto_gen", key: "gen_foto_licencia", label: "Foto de tu licencia de conducir" },
    { tipo: "lectura", key: "gen_odometro", fotoKey: "gen_foto_odometro", label: "Odómetro", fotoLabel: "Foto del odómetro" },
  ];
  if (esGrua) {
    items.push({ tipo: "lectura", key: "gen_horometro", fotoKey: "gen_foto_horometro", label: "Horómetro (grúa)", fotoLabel: "Foto del horómetro" });
  }
  for (const sec of SECCIONES_CHECKLIST_SEMANAL) {
    for (const c of sec.campos) {
      switch (c.tipo) {
        case "radio":
          if (c.soloTipoVehiculo && !esGrua) break;
          items.push({ tipo: "radio", key: c.key, label: c.label, opciones: c.opciones, seccion: sec.titulo, fotoKey: c.fotoKey, fotoLabel: c.fotoLabel, fotoRequerido: c.fotoRequerido, requerido: c.requerido });
          break;
        case "foto":
          items.push({ tipo: "foto", key: c.key, label: c.label, seccion: sec.titulo, requerido: c.requerido });
          break;
        case "numero":
          items.push({ tipo: "numero", key: c.key, label: c.label, seccion: sec.titulo, min: c.min, max: c.max, requerido: c.requerido });
          break;
        case "toggle":
          items.push({ tipo: "toggle", key: c.key, label: c.label, opciones: c.opciones, seccion: sec.titulo });
          break;
        case "textarea":
          items.push({ tipo: "textarea", key: c.key, label: c.label, seccion: sec.titulo });
          break;
      }
    }
  }
  return items;
}

const COLORES_OPCION: Record<string, { bg: string; color: string }> = {
  "BUEN ESTADO": { bg: "#16a34a", color: "#fff" },
  "MAL ESTADO": { bg: "#dc2626", color: "#fff" },
  "N/A": { bg: "#64748b", color: "#fff" },
  "NA": { bg: "#64748b", color: "#fff" },
  "MAXIMO": { bg: "#16a34a", color: "#fff" },
  "MEDIO": { bg: "#d97706", color: "#fff" },
  "MINIMO": { bg: "#dc2626", color: "#fff" },
  "NO APLICA": { bg: "#64748b", color: "#fff" },
  "Y": { bg: "#16a34a", color: "#fff" },
  "N": { bg: "#dc2626", color: "#fff" },
};

function estiloOpcion(opcion: string, seleccionada: boolean): React.CSSProperties {
  if (!seleccionada) {
    return {
      background: "var(--field-bg)",
      color: "var(--field-text)",
      border: "1px solid var(--field-border)",
    };
  }
  const c = COLORES_OPCION[opcion] ?? { bg: "var(--color-primary)", color: "#fff" };
  return { background: c.bg, color: c.color, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" };
}

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

const seccionChipStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

// ─── sub-componentes ─────────────────────────────────────────────────────────

function BarraProgreso({ actual, total, seccion }: { actual: number; total: number; seccion?: string }) {
  const pct = total > 0 ? Math.round((actual / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5 flex-1">
      <div className="flex justify-between items-center">
        <span style={seccionChipStyle}>{seccion ?? "Datos generales"}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
          {actual} / {total}
        </span>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "var(--field-bg)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: "var(--color-primary)" }}
        />
      </div>
    </div>
  );
}

function SubirFoto({
  clave, label, requerido, url, onUrl,
}: {
  clave: string; label: string; requerido: boolean;
  url: string | undefined;
  onUrl: (url: string | null) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [errFoto, setErrFoto] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  async function alSeleccionar(file: File | undefined) {
    if (!file) return;
    setSubiendo(true);
    setErrFoto(null);
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/checklist-upload" });
      onUrl(blob.url);
    } catch (e) {
      setErrFoto(e instanceof Error ? e.message : "No se pudo subir la foto.");
    } finally {
      setSubiendo(false);
    }
  }

  if (url) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.3)" }}
      >
        <Camera size={15} color="#16a34a" className="shrink-0" />
        <span className="flex-1 truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#16a34a" }}>
          {label} — adjuntada
        </span>
        <button type="button" onClick={() => onUrl(null)} style={{ color: "#16a34a", opacity: 0.6, cursor: "pointer" }}>
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => alSeleccionar(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex items-center justify-center gap-2 rounded-xl w-full"
        style={{
          height: 52,
          background: "var(--field-bg)",
          border: "1px dashed var(--field-border)",
          color: "var(--sidebar-text)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--text-sm)",
          cursor: "pointer",
        }}
      >
        {subiendo ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        {subiendo ? "Subiendo…" : `${label}${requerido ? " *" : " (opcional)"}`}
      </button>
      {errFoto && (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>
          {errFoto}
        </p>
      )}
    </div>
  );
}

function BtnSiguiente({
  label, onClick, disabled, pending,
}: {
  label: string; onClick: () => void; disabled: boolean; pending: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className="w-full rounded-xl h-12 font-semibold flex items-center justify-center gap-2 transition-colors"
      style={{
        background: disabled ? "var(--chip)" : "var(--color-primary)",
        color: disabled ? "var(--sidebar-text)" : "#fff",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-base)",
        cursor: disabled ? "default" : "pointer",
        opacity: pending ? 0.7 : 1,
      }}
    >
      {pending && <Loader2 size={16} className="animate-spin" />}
      {label}
    </button>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export function WizardSemanal({ unidades, proyectos, esAdmin, fechaHoraActual, onTerminar, onCancelar }: Props) {
  const [fase, setFase] = useState<"identificacion" | "guia" | "exito">("identificacion");
  const [idx, setIdx] = useState(0);
  const [proyectoFiltro, setProyectoFiltro] = useState(proyectos[0]?.id ?? "");
  const [numeroEconomico, setNumeroEconomico] = useState("");
  const [respuestas, setRespuestas] = useState<Record<string, string>>({ gen_licencia_permanente: "Y" });
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unidadesFiltradas = useMemo(
    () => (proyectoFiltro ? unidades.filter((u) => u.proyectoId === proyectoFiltro) : unidades),
    [unidades, proyectoFiltro],
  );

  const unidadSel = unidades.find((u) => u.numeroEconomico === numeroEconomico);
  const esGrua = unidadSel?.tipoVehiculo === "GRUA";
  const items = useMemo(() => construirItems(esGrua), [esGrua]);
  const item = items[idx];
  const total = items.length;

  const proyectoNombre = proyectos.find((p) => p.id === proyectoFiltro)?.nombre ?? proyectos[0]?.nombre ?? "";

  const fechaDisplay = (() => {
    try {
      return new Date(fechaHoraActual).toLocaleString("es-MX", {
        weekday: "long", year: "numeric", month: "long",
        day: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return fechaHoraActual;
    }
  })();

  function setFoto(clave: string, url: string | null) {
    setFotos((prev) => {
      if (url === null) {
        const next = { ...prev };
        delete next[clave];
        return next;
      }
      return { ...prev, [clave]: url };
    });
  }

  // ── puedeAvanzar ─────────────────────────────────────────────────────────
  function puedeAvanzar(): boolean {
    if (!item) return true;
    switch (item.tipo) {
      case "toggle_gen":
        return !!respuestas[item.key];
      case "foto_gen":
        return !!fotos[item.key];
      case "lectura":
        return !!(respuestas[item.key] && Number(respuestas[item.key]) >= 0) && !!fotos[item.fotoKey];
      case "radio": {
        const val = respuestas[item.key];
        if (!val) return false;
        if (item.fotoKey && item.fotoRequerido) return !!fotos[item.fotoKey];
        return true;
      }
      case "foto":
        return item.requerido ? !!fotos[item.key] : true;
      case "numero":
        return item.requerido
          ? !!(respuestas[item.key] && respuestas[item.key] !== "")
          : true;
      case "toggle":
        return !!respuestas[item.key];
      case "textarea":
        return true;
    }
  }

  // ── mostrarSiguiente: el btn "Siguiente" solo aparece en items no auto-advance ──
  function mostrarSiguiente(): boolean {
    if (!item) return false;
    if (item.tipo === "toggle_gen") return false;
    if (item.tipo === "toggle") return false;
    if (item.tipo === "radio" && !item.fotoKey) return false;
    // Radio con foto: solo muestra Siguiente si ya seleccionó una opción
    if (item.tipo === "radio" && item.fotoKey) return !!respuestas[item.key];
    return true;
  }

  // ── navegación ────────────────────────────────────────────────────────────
  function siguiente() {
    setError(null);
    if (!puedeAvanzar()) {
      setError("Completa este campo para continuar.");
      return;
    }
    if (idx < total - 1) {
      setIdx(idx + 1);
    } else {
      enviar();
    }
  }

  function anterior() {
    setError(null);
    if (idx > 0) setIdx(idx - 1);
    else setFase("identificacion");
  }

  function autoAvanzar(key: string, valor: string) {
    setRespuestas((prev) => ({ ...prev, [key]: valor }));
    setTimeout(() => {
      setIdx((i) => {
        if (i < total - 1) return i + 1;
        return i;
      });
    }, 160);
  }

  function responderRadio(key: string, valor: string, tieneFoto: boolean) {
    setRespuestas((prev) => ({ ...prev, [key]: valor }));
    if (!tieneFoto) {
      setTimeout(() => {
        setIdx((i) => (i < total - 1 ? i + 1 : i));
      }, 160);
    }
  }

  // ── envío ─────────────────────────────────────────────────────────────────
  function enviar() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("gen_numero_economico", numeroEconomico);
      fd.set("gen_fecha", fechaHoraActual);
      fd.set("gen_oficina_sede", proyectoNombre);
      for (const [k, v] of Object.entries(respuestas)) fd.set(k, v);
      for (const [k, v] of Object.entries(fotos)) fd.set(k, v);
      const res = await crearChecklistSemanal(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFase("exito");
    });
  }

  // ─── pantalla: éxito ─────────────────────────────────────────────────────
  if (fase === "exito") {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-2xl p-10 text-center"
        style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      >
        <CheckCircle2 size={52} color="var(--color-status-cerrado)" />
        <div>
          <h3
            style={{
              fontFamily: "var(--font)",
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: "var(--sidebar-text-active)",
            }}
          >
            ¡Checklist semanal guardado!
          </h3>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--text-sm)",
              color: "var(--sidebar-text)",
              marginTop: 6,
            }}
          >
            La inspección de <strong>{numeroEconomico}</strong> fue registrada correctamente.
          </p>
        </div>
        <button
          type="button"
          onClick={onTerminar}
          className="flex items-center gap-2 rounded-md px-5 h-10 font-semibold"
          style={{
            background: "var(--color-primary)",
            color: "#fff",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-base)",
          }}
        >
          Capturar otro checklist
        </button>
      </div>
    );
  }

  // ─── pantalla: identificación ─────────────────────────────────────────────
  if (fase === "identificacion") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="flex items-center gap-1 rounded-md px-2 h-8"
            style={{
              background: "var(--chip)",
              color: "var(--sidebar-text-active)",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--text-sm)",
            }}
          >
            <ChevronLeft size={14} /> Volver
          </button>
        </div>

        <div
          className="flex flex-col gap-4 rounded-2xl p-5"
          style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
        >
          <div>
            <h3
              style={{
                fontFamily: "var(--font)",
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "var(--sidebar-text-active)",
              }}
            >
              Checklist semanal
            </h3>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", marginTop: 4 }}>
              {fechaDisplay}
            </p>
          </div>

          {(esAdmin || proyectos.length > 1) && (
            <div>
              <label style={labelStyle}>Proyecto / Sede</label>
              <select
                value={proyectoFiltro}
                onChange={(e) => {
                  setProyectoFiltro(e.target.value);
                  setNumeroEconomico("");
                }}
                style={fieldStyle}
                className="rounded-md"
              >
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {!esAdmin && proyectos.length === 1 && (
            <div>
              <label style={labelStyle}>Proyecto / Sede</label>
              <div className="flex items-center px-3 rounded-md" style={{ ...fieldStyle, opacity: 0.7, cursor: "default" }}>
                {proyectos[0].nombre}
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Número económico *</label>
            <ComboboxUnidad
              name="gen_numero_economico"
              unidades={unidadesFiltradas.map((u) => ({
                numeroEconomico: u.numeroEconomico,
                etiqueta: `${u.numeroEconomico} — ${u.marca} ${u.unidadModelo}`,
              }))}
              defaultValue={numeroEconomico}
              required
              onSeleccionar={setNumeroEconomico}
              style={fieldStyle}
            />
          </div>

          {unidadSel && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Modelo</label>
                <div className="flex items-center px-3 rounded-md" style={{ ...fieldStyle, opacity: 0.7, cursor: "default" }}>
                  {unidadSel.marca} {unidadSel.unidadModelo}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Tipo de vehículo</label>
                <div className="flex items-center px-3 rounded-md" style={{ ...fieldStyle, opacity: 0.7, cursor: "default" }}>
                  {TIPO_VEHICULO_LABEL[unidadSel.tipoVehiculo] ?? unidadSel.tipoVehiculo}
                </div>
              </div>
            </div>
          )}

          {error && (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              if (!numeroEconomico) {
                setError("Selecciona un número económico.");
                return;
              }
              setError(null);
              setIdx(0);
              setFase("guia");
            }}
            className="w-full rounded-xl h-12 font-semibold transition-colors"
            style={{
              background: numeroEconomico ? "var(--color-primary)" : "var(--chip)",
              color: numeroEconomico ? "#fff" : "var(--sidebar-text)",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--text-base)",
              cursor: numeroEconomico ? "pointer" : "default",
            }}
          >
            Iniciar inspección →
          </button>
        </div>
      </div>
    );
  }

  // ─── pantalla: guía (un item a la vez) ───────────────────────────────────
  if (!item) return null;

  const seccionActual =
    "seccion" in item ? item.seccion :
    item.tipo === "lectura" ? "Lecturas" :
    "Datos generales";

  const esUltimoItem = idx === total - 1;

  return (
    <div className="flex flex-col gap-3">
      {/* Header: botón anterior + barra de progreso */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={anterior}
          className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0"
          style={{
            background: "var(--chip)",
            color: "var(--sidebar-text-active)",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-sm)",
          }}
        >
          <ChevronLeft size={14} />
          {idx === 0 ? "Unidad" : "Anterior"}
        </button>
        <BarraProgreso actual={idx + 1} total={total} seccion={seccionActual} />
      </div>

      {/* Tarjeta del item */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-5"
        style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      >
        {/* ── TOGGLE GENERAL (licencia permanente) ── */}
        {item.tipo === "toggle_gen" && (
          <>
            <h2
              style={{
                fontFamily: "var(--font)",
                fontSize: "var(--text-2xl)",
                fontWeight: 700,
                color: "var(--sidebar-text-active)",
                lineHeight: 1.25,
              }}
            >
              {item.label}
            </h2>
            <div className="flex flex-col gap-3">
              {item.opciones.map((op, i) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => autoAvanzar(item.key, op)}
                  className="rounded-xl w-full font-semibold text-left transition-all"
                  style={{
                    ...estiloOpcion(op, respuestas[item.key] === op),
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--text-lg)",
                    height: 60,
                    padding: "0 20px",
                    cursor: "pointer",
                  }}
                >
                  {respuestas[item.key] === op ? "✓ " : ""}{item.etiquetas[i] ?? op}
                </button>
              ))}
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textAlign: "center" }}>
              Selecciona una opción para continuar automáticamente
            </p>
          </>
        )}

        {/* ── FOTO GENERAL (licencia) ── */}
        {item.tipo === "foto_gen" && (
          <>
            <h2
              style={{
                fontFamily: "var(--font)",
                fontSize: "var(--text-2xl)",
                fontWeight: 700,
                color: "var(--sidebar-text-active)",
                lineHeight: 1.25,
              }}
            >
              {item.label}
            </h2>
            <SubirFoto
              clave={item.key}
              label={item.label}
              requerido
              url={fotos[item.key]}
              onUrl={(url) => setFoto(item.key, url)}
            />
            {error && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>
                {error}
              </p>
            )}
            <BtnSiguiente
              label={esUltimoItem ? "Finalizar checklist" : "Siguiente →"}
              onClick={siguiente}
              disabled={!puedeAvanzar()}
              pending={pending}
            />
          </>
        )}

        {/* ── LECTURA (odómetro / horómetro) ── */}
        {item.tipo === "lectura" && (
          <>
            <h2
              style={{
                fontFamily: "var(--font)",
                fontSize: "var(--text-2xl)",
                fontWeight: 700,
                color: "var(--sidebar-text-active)",
                lineHeight: 1.25,
              }}
            >
              {item.label}
            </h2>
            <input
              type="number"
              min={0}
              value={respuestas[item.key] ?? ""}
              onChange={(e) => setRespuestas((prev) => ({ ...prev, [item.key]: e.target.value }))}
              placeholder="Ingresa la lectura"
              className="rounded-md"
              style={{
                ...fieldStyle,
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xl)",
                height: 56,
              }}
            />
            <SubirFoto
              clave={item.fotoKey}
              label={item.fotoLabel}
              requerido
              url={fotos[item.fotoKey]}
              onUrl={(url) => setFoto(item.fotoKey, url)}
            />
            {error && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>
                {error}
              </p>
            )}
            <BtnSiguiente
              label={esUltimoItem ? "Finalizar checklist" : "Siguiente →"}
              onClick={siguiente}
              disabled={!puedeAvanzar()}
              pending={pending}
            />
          </>
        )}

        {/* ── RADIO ── */}
        {item.tipo === "radio" && (
          <>
            <h2
              style={{
                fontFamily: "var(--font)",
                fontSize: "var(--text-xl)",
                fontWeight: 700,
                color: "var(--sidebar-text-active)",
                lineHeight: 1.3,
              }}
            >
              {item.label}
              {item.requerido && <span style={{ color: "var(--color-status-escena)", fontWeight: 400, fontSize: "var(--text-base)" }}> *</span>}
            </h2>
            <div className="flex flex-col gap-2.5">
              {item.opciones.map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => responderRadio(item.key, op, !!(item.fotoKey))}
                  className="rounded-xl w-full font-semibold text-left transition-all"
                  style={{
                    ...estiloOpcion(op, respuestas[item.key] === op),
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--text-base)",
                    height: 52,
                    padding: "0 18px",
                    cursor: "pointer",
                  }}
                >
                  {respuestas[item.key] === op ? "✓ " : ""}{op}
                </button>
              ))}
            </div>

            {/* Foto asociada — aparece al seleccionar una opción */}
            {respuestas[item.key] && item.fotoKey && (
              <SubirFoto
                clave={item.fotoKey}
                label={item.fotoLabel ?? "Evidencia fotográfica"}
                requerido={!!item.fotoRequerido}
                url={fotos[item.fotoKey]}
                onUrl={(url) => setFoto(item.fotoKey!, url)}
              />
            )}

            {!item.fotoKey && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textAlign: "center" }}>
                Selecciona una opción para continuar automáticamente
              </p>
            )}

            {error && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>
                {error}
              </p>
            )}

            {mostrarSiguiente() && (
              <BtnSiguiente
                label={esUltimoItem ? "Finalizar checklist" : "Siguiente →"}
                onClick={siguiente}
                disabled={!puedeAvanzar()}
                pending={pending}
              />
            )}
          </>
        )}

        {/* ── FOTO SOLA ── */}
        {item.tipo === "foto" && (
          <>
            <h2
              style={{
                fontFamily: "var(--font)",
                fontSize: "var(--text-xl)",
                fontWeight: 700,
                color: "var(--sidebar-text-active)",
                lineHeight: 1.3,
              }}
            >
              {item.label}
              {!item.requerido && (
                <span style={{ fontWeight: 400, fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}> (opcional)</span>
              )}
            </h2>
            <SubirFoto
              clave={item.key}
              label={item.label}
              requerido={item.requerido}
              url={fotos[item.key]}
              onUrl={(url) => setFoto(item.key, url)}
            />
            {error && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>
                {error}
              </p>
            )}
            <BtnSiguiente
              label={esUltimoItem ? "Finalizar checklist" : "Siguiente →"}
              onClick={siguiente}
              disabled={!puedeAvanzar()}
              pending={pending}
            />
          </>
        )}

        {/* ── NÚMERO ── */}
        {item.tipo === "numero" && (
          <>
            <h2
              style={{
                fontFamily: "var(--font)",
                fontSize: "var(--text-xl)",
                fontWeight: 700,
                color: "var(--sidebar-text-active)",
                lineHeight: 1.3,
              }}
            >
              {item.label}
              {item.requerido && <span style={{ color: "var(--color-status-escena)", fontWeight: 400, fontSize: "var(--text-base)" }}> *</span>}
            </h2>
            {item.min !== undefined && item.max !== undefined && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", marginTop: -12 }}>
                Rango: {item.min} – {item.max}
              </p>
            )}
            <input
              type="number"
              min={item.min}
              max={item.max}
              value={respuestas[item.key] ?? ""}
              onChange={(e) => setRespuestas((prev) => ({ ...prev, [item.key]: e.target.value }))}
              placeholder="Ingresa un valor"
              className="rounded-md"
              style={{
                ...fieldStyle,
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xl)",
                height: 56,
              }}
            />
            {error && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>
                {error}
              </p>
            )}
            <BtnSiguiente
              label={esUltimoItem ? "Finalizar checklist" : "Siguiente →"}
              onClick={siguiente}
              disabled={!puedeAvanzar()}
              pending={pending}
            />
          </>
        )}

        {/* ── TOGGLE ── */}
        {item.tipo === "toggle" && (
          <>
            <h2
              style={{
                fontFamily: "var(--font)",
                fontSize: "var(--text-xl)",
                fontWeight: 700,
                color: "var(--sidebar-text-active)",
                lineHeight: 1.3,
              }}
            >
              {item.label}
            </h2>
            <div className="flex gap-2">
              {item.opciones.map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => autoAvanzar(item.key, op)}
                  className="rounded-xl flex-1 font-semibold transition-all"
                  style={{
                    ...estiloOpcion(op, respuestas[item.key] === op),
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--text-sm)",
                    height: 52,
                    cursor: "pointer",
                  }}
                >
                  {respuestas[item.key] === op ? "✓ " : ""}{op}
                </button>
              ))}
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textAlign: "center" }}>
              Selecciona una opción para continuar automáticamente
            </p>
          </>
        )}

        {/* ── TEXTAREA ── */}
        {item.tipo === "textarea" && (
          <>
            <h2
              style={{
                fontFamily: "var(--font)",
                fontSize: "var(--text-xl)",
                fontWeight: 700,
                color: "var(--sidebar-text-active)",
                lineHeight: 1.3,
              }}
            >
              {item.label}
              <span style={{ fontWeight: 400, fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}> (opcional)</span>
            </h2>
            <textarea
              value={respuestas[item.key] ?? ""}
              onChange={(e) => setRespuestas((prev) => ({ ...prev, [item.key]: e.target.value }))}
              rows={5}
              placeholder="Escribe aquí tus observaciones o irregularidades…"
              className="w-full rounded-xl resize-none"
              style={{
                background: "var(--field-bg)",
                border: "1px solid var(--field-border)",
                color: "var(--field-text)",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-base)",
                padding: "12px 14px",
              }}
            />
            {error && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>
                {error}
              </p>
            )}
            <BtnSiguiente
              label="Finalizar checklist"
              onClick={siguiente}
              disabled={false}
              pending={pending}
            />
          </>
        )}
      </div>
    </div>
  );
}
