"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { Camera, CheckCircle2, ChevronLeft, Loader2, X } from "lucide-react";
import { crearChecklist } from "@/app/(app)/checklist/actions";
import { ComboboxUnidad } from "@/components/ui/combobox-unidad";
import { PUNTOS_INSPECCION } from "@/lib/checklist";

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

type ItemDiario =
  | { tipo: "punto"; key: string; label: string }
  | { tipo: "odometro_foto" };

const ITEMS: ItemDiario[] = [
  ...PUNTOS_INSPECCION.map((p) => ({ tipo: "punto" as const, key: p.key, label: p.label })),
  { tipo: "odometro_foto" as const },
];

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

// ─── sub-componentes ─────────────────────────────────────────────────────────

function BarraProgreso({ actual, total }: { actual: number; total: number }) {
  const pct = total > 0 ? Math.round((actual / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5 flex-1">
      <div className="flex justify-between items-center">
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            color: "var(--sidebar-text)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Inspección diaria
        </span>
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

// ─── componente principal ─────────────────────────────────────────────────────

export function WizardDiario({ unidades, proyectos, esAdmin, fechaHoraActual, onTerminar, onCancelar }: Props) {
  const [fase, setFase] = useState<"identificacion" | "guia" | "exito">("identificacion");
  const [idx, setIdx] = useState(0);
  const [proyectoFiltro, setProyectoFiltro] = useState(proyectos[0]?.id ?? "");
  const [numeroEconomico, setNumeroEconomico] = useState("");
  const [estados, setEstados] = useState<Record<string, "ok" | "revisar">>({});
  const [fotosPorPunto, setFotosPorPunto] = useState<Record<string, string>>({});
  const [odometro, setOdometro] = useState("");
  const [horometro, setHorometro] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoFotoPunto, setSubiendoFotoPunto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const fotoPuntoInputRef = useRef<HTMLInputElement>(null);
  const puntoFotoActualRef = useRef<string | null>(null);

  const unidadesFiltradas = useMemo(
    () => (proyectoFiltro ? unidades.filter((u) => u.proyectoId === proyectoFiltro) : unidades),
    [unidades, proyectoFiltro],
  );

  const unidadSel = unidades.find((u) => u.numeroEconomico === numeroEconomico);
  const esGrua = unidadSel?.tipoVehiculo === "GRUA";

  const fechaDisplay = (() => {
    try {
      return new Date(fechaHoraActual).toLocaleString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return fechaHoraActual;
    }
  })();

  const item = ITEMS[idx];
  const total = ITEMS.length;

  async function subirFoto(file: File | undefined) {
    if (!file) return;
    setSubiendoFoto(true);
    setError(null);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/checklist-upload",
      });
      setFotoUrl(blob.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
    } finally {
      setSubiendoFoto(false);
    }
  }

  async function subirFotoPunto(file: File | undefined) {
    const key = puntoFotoActualRef.current;
    if (!file || !key) return;
    setSubiendoFotoPunto(true);
    setError(null);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/checklist-upload",
      });
      setFotosPorPunto((prev) => ({ ...prev, [key]: blob.url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
    } finally {
      setSubiendoFotoPunto(false);
    }
  }

  function abrirFotoPunto(key: string) {
    puntoFotoActualRef.current = key;
    fotoPuntoInputRef.current?.click();
  }

  function avanzar() {
    setIdx((i) => (i < total - 1 ? i + 1 : i));
  }

  function seleccionarPunto(key: string, valor: "ok" | "revisar") {
    setEstados((s) => ({ ...s, [key]: valor }));
    if (valor === "ok") {
      setTimeout(() => avanzar(), 160);
    }
    // Para "revisar": no auto-avanzar; esperar foto opcional o botón continuar
  }

  function enviar() {
    setError(null);
    if (!odometro || Number(odometro) <= 0) {
      setError("Ingresa una lectura de odómetro válida.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("numeroEconomico", numeroEconomico);
      fd.set("odometro", odometro);
      if (esGrua && horometro) fd.set("horometro", horometro);
      fd.set("evidenciaUrl", fotoUrl ?? "");
      for (const [k, v] of Object.entries(estados)) fd.set(`punto_${k}`, v);
      for (const [k, url] of Object.entries(fotosPorPunto)) fd.set(`foto_${k}`, url);
      const res = await crearChecklist(fd);
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
            Checklist diario guardado
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
              Checklist diario
            </h3>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-sm)",
                color: "var(--sidebar-text)",
                marginTop: 4,
              }}
            >
              {fechaDisplay}
            </p>
          </div>

          {(esAdmin || proyectos.length > 1) && (
            <div>
              <label style={labelStyle}>Proyecto</label>
              <select
                value={proyectoFiltro}
                onChange={(e) => {
                  setProyectoFiltro(e.target.value);
                  setNumeroEconomico("");
                }}
                style={fieldStyle}
                className="rounded-md"
              >
                <option value="">Todos los proyectos</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Número económico *</label>
            <ComboboxUnidad
              name="numeroEconomico"
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
                <label style={labelStyle}>Vehículo</label>
                <div
                  className="flex items-center px-3 rounded-md"
                  style={{ ...fieldStyle, opacity: 0.7, cursor: "default" }}
                >
                  {unidadSel.marca} {unidadSel.unidadModelo}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Proyecto</label>
                <div
                  className="flex items-center px-3 rounded-md"
                  style={{ ...fieldStyle, opacity: 0.7, cursor: "default" }}
                >
                  {unidadSel.proyectoNombre ?? "—"}
                </div>
              </div>
            </div>
          )}

          {error && (
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-sm)",
                color: "var(--color-status-escena)",
              }}
            >
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

  return (
    <div className="flex flex-col gap-3">
      {/* Header: botón anterior + barra de progreso */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            if (idx > 0) setIdx(idx - 1);
            else setFase("identificacion");
          }}
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
        <BarraProgreso actual={idx + 1} total={total} />
      </div>

      {/* Tarjeta del item */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-5"
        style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      >
        {/* ── PUNTO DE INSPECCIÓN ── */}
        {item.tipo === "punto" && (
          <>
            <div>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: "var(--sidebar-text)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Punto de inspección
              </span>
              <h2
                style={{
                  fontFamily: "var(--font)",
                  fontSize: "var(--text-2xl)",
                  fontWeight: 700,
                  color: "var(--sidebar-text-active)",
                  marginTop: 4,
                  lineHeight: 1.2,
                }}
              >
                {item.label}
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => seleccionarPunto(item.key, "ok")}
                className="rounded-xl w-full font-bold transition-all"
                style={{
                  height: 68,
                  background: estados[item.key] === "ok" ? "#16a34a" : "var(--field-bg)",
                  color: estados[item.key] === "ok" ? "#fff" : "var(--sidebar-text-active)",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-xl)",
                  border: estados[item.key] === "ok" ? "none" : "1px solid var(--field-border)",
                  cursor: "pointer",
                  boxShadow: estados[item.key] === "ok" ? "0 2px 10px rgba(22,163,74,0.3)" : "none",
                }}
              >
                {estados[item.key] === "ok" ? "✓ " : ""}OK — Todo en orden
              </button>

              <button
                type="button"
                onClick={() => seleccionarPunto(item.key, "revisar")}
                className="rounded-xl w-full font-bold transition-all"
                style={{
                  height: 68,
                  background: estados[item.key] === "revisar" ? "#d97706" : "var(--field-bg)",
                  color: estados[item.key] === "revisar" ? "#fff" : "var(--sidebar-text-active)",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-xl)",
                  border: estados[item.key] === "revisar" ? "none" : "1px solid var(--field-border)",
                  cursor: "pointer",
                  boxShadow: estados[item.key] === "revisar" ? "0 2px 10px rgba(217,119,6,0.3)" : "none",
                }}
              >
                {estados[item.key] === "revisar" ? "✓ " : ""}⚠ Revisar
              </button>
            </div>

            {/* Input oculto para foto de este rubro */}
            <input
              ref={fotoPuntoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => subirFotoPunto(e.target.files?.[0])}
            />

            {/* Foto + botón continuar cuando el punto está marcado "revisar" */}
            {estados[item.key] === "revisar" && (
              <div className="flex flex-col gap-3 pt-1 border-t" style={{ borderColor: "var(--field-border)" }}>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", fontWeight: 600 }}>
                  Foto del problema (opcional)
                </p>
                {fotosPorPunto[item.key] ? (
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.3)" }}>
                    <Camera size={15} color="#16a34a" className="shrink-0" />
                    <span className="flex-1 truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#16a34a" }}>Foto adjuntada</span>
                    <button type="button" onClick={() => setFotosPorPunto((p) => { const copy = { ...p }; delete copy[item.key]; return copy; })} style={{ color: "#16a34a", opacity: 0.6 }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => abrirFotoPunto(item.key)}
                    className="flex items-center justify-center gap-2 rounded-xl w-full"
                    style={{ height: 48, background: "var(--field-bg)", border: "1px dashed var(--field-border)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", cursor: "pointer" }}
                  >
                    {subiendoFotoPunto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    {subiendoFotoPunto ? "Subiendo…" : "Tomar foto del problema"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={avanzar}
                  disabled={subiendoFotoPunto}
                  className="w-full rounded-xl h-11 font-semibold transition-colors disabled:opacity-60"
                  style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
                >
                  Continuar →
                </button>
              </div>
            )}

            {!estados[item.key] && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textAlign: "center" }}>
                Selecciona una opción para continuar automáticamente
              </p>
            )}
          </>
        )}

        {/* ── ODÓMETRO + FOTO ── */}
        {item.tipo === "odometro_foto" && (
          <>
            <div>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: "var(--sidebar-text)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Lecturas finales
              </span>
              <h2
                style={{
                  fontFamily: "var(--font)",
                  fontSize: "var(--text-2xl)",
                  fontWeight: 700,
                  color: "var(--sidebar-text-active)",
                  marginTop: 4,
                }}
              >
                Odómetro y evidencia
              </h2>
            </div>

            <div>
              <label style={labelStyle}>Lectura del odómetro (km) *</label>
              <input
                type="number"
                min={0}
                value={odometro}
                onChange={(e) => setOdometro(e.target.value)}
                placeholder="Kilómetros"
                className="rounded-md"
                style={{
                  ...fieldStyle,
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xl)",
                  height: 56,
                }}
              />
            </div>

            {esGrua && (
              <div>
                <label style={labelStyle}>Horómetro (horas)</label>
                <input
                  type="number"
                  min={0}
                  value={horometro}
                  onChange={(e) => setHorometro(e.target.value)}
                  placeholder="Horas"
                  className="rounded-md"
                  style={{
                    ...fieldStyle,
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xl)",
                    height: 56,
                  }}
                />
              </div>
            )}

            {/* Foto evidencia (opcional en checklist diario) */}
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => subirFoto(e.target.files?.[0])}
            />

            {fotoUrl ? (
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.3)" }}
              >
                <Camera size={15} color="#16a34a" className="shrink-0" />
                <span
                  className="flex-1 truncate"
                  style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#16a34a" }}
                >
                  Evidencia fotográfica adjuntada
                </span>
                <button
                  type="button"
                  onClick={() => setFotoUrl(null)}
                  style={{ color: "#16a34a", opacity: 0.6, cursor: "pointer" }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fotoInputRef.current?.click()}
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
                {subiendoFoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                {subiendoFoto ? "Subiendo…" : "Foto de evidencia (opcional)"}
              </button>
            )}

            {error && (
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-status-escena)",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={enviar}
              disabled={pending || subiendoFoto || !odometro || Number(odometro) <= 0}
              className="w-full rounded-xl h-12 font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{
                background:
                  !pending && !subiendoFoto && odometro && Number(odometro) > 0
                    ? "var(--color-primary)"
                    : "var(--chip)",
                color:
                  !pending && !subiendoFoto && odometro && Number(odometro) > 0
                    ? "#fff"
                    : "var(--sidebar-text)",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-base)",
                cursor:
                  !pending && !subiendoFoto && odometro && Number(odometro) > 0
                    ? "pointer"
                    : "default",
                opacity: pending ? 0.7 : 1,
              }}
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              {pending ? "Guardando…" : "Finalizar checklist"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
