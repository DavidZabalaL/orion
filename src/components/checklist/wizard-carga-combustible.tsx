"use client";

import { useState, useTransition, useMemo } from "react";
import { ChevronLeft, CheckCircle2, Loader2, Camera } from "lucide-react";
import { crearChecklistCargaCombustible, subirFotoChecklist } from "@/app/(app)/checklist/actions";
import { CampoFotoSemanal } from "@/components/checklist/campo-foto-semanal";
import { FirmaPad } from "@/components/checklist/firma-pad";
import {
  ESTADOS_CARGA,
  MUNICIPIOS_POR_ESTADO,
  AREAS_CARGA,
  PERSONAL_POR_AREA,
  TIPOS_LICENCIA_CARGA,
  TIPOS_COMBUSTIBLE_CARGA,
  type EstadoCarga,
  type AreaCarga,
} from "@/lib/checklist-carga-combustible";

type UnidadWizard = {
  numeroEconomico: string;
  marca: string;
  unidadModelo: string;
  tipoVehiculo: string;
  proyectoId: string | null;
  proyectoNombre: string | null;
};

type Fase = "generales" | "vehiculo" | "carga" | "exito";

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

const FASES: Fase[] = ["generales", "vehiculo", "carga", "exito"];
const FASES_LABEL: Record<Fase, string> = {
  generales: "Datos generales",
  vehiculo: "Vehículo",
  carga: "Carga de combustible",
  exito: "Éxito",
};

const TIPOS_VEHICULO = [
  { value: "AUTO", label: "Auto" },
  { value: "CAMIONETA", label: "Camioneta" },
  { value: "GRUA", label: "Grúa" },
  { value: "MOTO", label: "Moto" },
  { value: "OTRO", label: "Otro" },
];

function BarraProgreso({ fase }: { fase: Fase }) {
  const idx = FASES.indexOf(fase);
  const total = FASES.length - 1; // excluir "exito"
  if (fase === "exito") return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
          Paso {idx + 1} de {total} — {FASES_LABEL[fase]}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: "var(--field-border)" }}>
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${((idx) / (total - 1)) * 100}%`, background: "var(--color-primary)", transition: "width 0.3s" }}
        />
      </div>
    </div>
  );
}

export function WizardCargaCombustible({
  unidades,
  onTerminar,
  onCancelar,
}: {
  unidades: UnidadWizard[];
  onTerminar: () => void;
  onCancelar: () => void;
}) {
  const [fase, setFase] = useState<Fase>("generales");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Fase generales
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [zona, setZona] = useState<EstadoCarga>(ESTADOS_CARGA[0]);
  const [municipio, setMunicipio] = useState(MUNICIPIOS_POR_ESTADO[ESTADOS_CARGA[0]][0] ?? "");
  const [area, setArea] = useState<AreaCarga>(AREAS_CARGA[0]);
  const [responsable, setResponsable] = useState("");
  const [tipoLicencia, setTipoLicencia] = useState<string>(TIPOS_LICENCIA_CARGA[0]);
  // Foto de licencia — rastreada en estado porque está fuera del <form> final
  const [fotoLicenciaUrl, setFotoLicenciaUrl] = useState<string | null>(null);
  const [subiendoFotoLicencia, setSubiendoFotoLicencia] = useState(false);

  // Fase vehiculo
  const [tipoVehiculo, setTipoVehiculo] = useState("CAMIONETA");
  const [numeroEconomico, setNumeroEconomico] = useState("");

  // Fase carga
  const [tipoCombustible, setTipoCombustible] = useState<string>(TIPOS_COMBUSTIBLE_CARGA[0]);
  const [observaciones, setObservaciones] = useState("");

  const municipiosDisponibles = MUNICIPIOS_POR_ESTADO[zona] ?? [];
  const personalDisponible = PERSONAL_POR_AREA[area] ?? [];

  const unidadesFiltradas = useMemo(
    () => unidades.filter((u) => u.tipoVehiculo === tipoVehiculo),
    [unidades, tipoVehiculo]
  );

  const unidadSeleccionada = useMemo(
    () => unidades.find((u) => u.numeroEconomico === numeroEconomico),
    [unidades, numeroEconomico]
  );

  function alCambiarZona(nuevaZona: EstadoCarga) {
    setZona(nuevaZona);
    const munis = MUNICIPIOS_POR_ESTADO[nuevaZona] ?? [];
    setMunicipio(munis[0] ?? "");
  }

  function alCambiarTipoVehiculo(tipo: string) {
    setTipoVehiculo(tipo);
    setNumeroEconomico("");
  }

  async function alSeleccionarFotoLicencia(file: File | undefined) {
    if (!file) { setFotoLicenciaUrl(null); return; }
    setSubiendoFotoLicencia(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const result = await subirFotoChecklist(fd);
      if (!result.ok) throw new Error(result.error);
      setFotoLicenciaUrl(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
    } finally {
      setSubiendoFotoLicencia(false);
    }
  }

  function validarGenerales() {
    if (!fecha) return "La fecha es obligatoria.";
    if (!municipio) return "El municipio es obligatorio.";
    if (!responsable.trim()) return "El nombre del responsable es obligatorio.";
    if (!fotoLicenciaUrl) return "La foto de licencia es obligatoria.";
    return null;
  }

  function validarVehiculo() {
    if (!numeroEconomico) return "Selecciona un número económico.";
    return null;
  }

  function continuarDesdeGenerales() {
    const err = validarGenerales();
    if (err) { setError(err); return; }
    setError(null);
    setFase("vehiculo");
  }

  function continuarDesdeVehiculo() {
    const err = validarVehiculo();
    if (err) { setError(err); return; }
    setError(null);
    setFase("carga");
  }

  function enviar(formData: FormData) {
    setError(null);
    // Agregar campos de estado
    formData.set("gen_fecha", fecha);
    formData.set("gen_zona", zona);
    formData.set("gen_municipio", municipio);
    formData.set("gen_area", area);
    formData.set("gen_responsable", responsable);
    formData.set("gen_tipo_licencia", tipoLicencia);
    formData.set("gen_foto_licencia", fotoLicenciaUrl ?? "");
    formData.set("veh_tipo_vehiculo", tipoVehiculo);
    formData.set("veh_numero_economico", numeroEconomico);
    formData.set("veh_modelo", unidadSeleccionada ? `${unidadSeleccionada.marca} ${unidadSeleccionada.unidadModelo}` : "");
    formData.set("carg_tipo_combustible", tipoCombustible);
    formData.set("carg_observaciones", observaciones);

    startTransition(async () => {
      const res = await crearChecklistCargaCombustible(formData);
      if (!res.ok) { setError(res.error); return; }
      setFase("exito");
    });
  }

  if (fase === "exito") {
    return (
      <div className="flex flex-col items-center gap-6 rounded-xl p-8 text-center" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <CheckCircle2 size={48} color="var(--color-status-cerrado)" />
        <div>
          <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Carga de combustible registrada
          </h2>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", marginTop: 8 }}>
            El checklist de carga de combustible fue guardado correctamente.
          </p>
        </div>
        <button
          type="button"
          onClick={onTerminar}
          className="rounded-md px-6 h-10 font-semibold"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          Registrar otra carga
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header con progreso */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={fase === "generales" ? onCancelar : () => setFase(FASES[FASES.indexOf(fase) - 1])}
          className="rounded-full p-1.5"
          style={{ background: "var(--chip)", color: "var(--sidebar-text-active)" }}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <BarraProgreso fase={fase} />
        </div>
      </div>

      {/* ── Fase: Generales ─────────────────────────────────── */}
      {fase === "generales" && (
        <div className="flex flex-col gap-5 rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Datos generales
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label style={labelStyle}>Fecha *</label>
              <input
                type="date"
                value={fecha}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setFecha(e.target.value)}
                style={fieldStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Estado *</label>
              <select value={zona} onChange={(e) => alCambiarZona(e.target.value as EstadoCarga)} style={fieldStyle}>
                {ESTADOS_CARGA.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Municipio *</label>
              <select value={municipio} onChange={(e) => setMunicipio(e.target.value)} style={fieldStyle}>
                {municipiosDisponibles.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {municipiosDisponibles.length === 0 && (
                  <option value="">Selecciona un estado primero</option>
                )}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Área *</label>
              <select value={area} onChange={(e) => setArea(e.target.value as AreaCarga)} style={fieldStyle}>
                {AREAS_CARGA.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label style={labelStyle}>Responsable *</label>
              {personalDisponible.length > 0 ? (
                <select value={responsable} onChange={(e) => setResponsable(e.target.value)} style={fieldStyle}>
                  <option value="">Selecciona…</option>
                  {personalDisponible.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  placeholder="Nombre del responsable"
                  style={fieldStyle}
                />
              )}
            </div>

            <div>
              <label style={labelStyle}>Tipo de licencia *</label>
              <select value={tipoLicencia} onChange={(e) => setTipoLicencia(e.target.value)} style={fieldStyle}>
                {TIPOS_LICENCIA_CARGA.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Foto de licencia — usa estado en lugar de input hidden dentro de form */}
          <div>
            <label
              className="flex items-center gap-2 rounded-md px-3 py-2.5 cursor-pointer"
              style={{
                background: fotoLicenciaUrl ? "var(--status-cerrado-bg)" : "var(--field-bg)",
                color: fotoLicenciaUrl ? "var(--color-status-cerrado)" : "var(--sidebar-text)",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-sm)",
              }}
            >
              {subiendoFotoLicencia ? (
                <Loader2 size={15} className="animate-spin shrink-0" />
              ) : (
                <Camera size={15} className="shrink-0" />
              )}
              <span className="truncate">
                {subiendoFotoLicencia
                  ? "Subiendo foto de licencia…"
                  : fotoLicenciaUrl
                    ? "Foto de licencia adjuntada *"
                    : "Foto de licencia *"}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => alSeleccionarFotoLicencia(e.target.files?.[0])}
              />
            </label>
          </div>

          {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}

          <button
            type="button"
            onClick={continuarDesdeGenerales}
            className="rounded-md px-6 h-10 font-semibold"
            style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            Continuar →
          </button>
        </div>
      )}

      {/* ── Fase: Vehículo ──────────────────────────────────── */}
      {fase === "vehiculo" && (
        <div className="flex flex-col gap-5 rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Vehículo
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label style={labelStyle}>Tipo de vehículo *</label>
              <select value={tipoVehiculo} onChange={(e) => alCambiarTipoVehiculo(e.target.value)} style={fieldStyle}>
                {TIPOS_VEHICULO.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Número económico *</label>
              <select
                value={numeroEconomico}
                onChange={(e) => setNumeroEconomico(e.target.value)}
                style={fieldStyle}
              >
                <option value="">Selecciona una unidad…</option>
                {unidadesFiltradas.map((u) => (
                  <option key={u.numeroEconomico} value={u.numeroEconomico}>
                    {u.numeroEconomico} — {u.marca} {u.unidadModelo}
                  </option>
                ))}
                {unidadesFiltradas.length === 0 && (
                  <option disabled value="">Sin unidades de este tipo</option>
                )}
              </select>
            </div>

            {unidadSeleccionada && (
              <div>
                <label style={labelStyle}>Modelo (derivado)</label>
                <div
                  className="flex items-center rounded-md px-3"
                  style={{ ...fieldStyle, cursor: "default", color: "var(--sidebar-text)" }}
                >
                  {unidadSeleccionada.marca} {unidadSeleccionada.unidadModelo}
                </div>
              </div>
            )}
          </div>

          {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}

          <button
            type="button"
            onClick={continuarDesdeVehiculo}
            className="rounded-md px-6 h-10 font-semibold"
            style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            Continuar →
          </button>
        </div>
      )}

      {/* ── Fase: Carga de Combustible ─────────────────────── */}
      {fase === "carga" && (
        <form
          className="flex flex-col gap-5 rounded-xl p-5"
          style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
          action={(formData) => enviar(formData)}
        >
          <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Carga de combustible
          </h2>

          <div>
            <label style={labelStyle}>Tipo de combustible *</label>
            <div className="flex gap-3 flex-wrap">
              {TIPOS_COMBUSTIBLE_CARGA.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipoCombustible(t)}
                  className="rounded-full px-4 py-2 font-semibold"
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--text-sm)",
                    background: tipoCombustible === t ? "var(--color-primary)" : "var(--chip)",
                    color: tipoCombustible === t ? "#fff" : "var(--sidebar-text-active)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <CampoFotoSemanal name="carg_foto_odometro_antes" label="Odómetro antes de cargar" requerido />
            </div>
            <div>
              <CampoFotoSemanal name="carg_foto_odometro_despues" label="Odómetro después de cargar" requerido />
            </div>
            <div>
              <CampoFotoSemanal name="carg_foto_evidencia_bomba_1" label="Evidencia de bomba" requerido />
            </div>
            <div>
              <CampoFotoSemanal name="carg_foto_evidencia_bomba_2" label="Evidencia de bomba 2 (opcional)" requerido={false} />
            </div>
            <div>
              <CampoFotoSemanal name="carg_foto_ticket" label="Foto del ticket" requerido />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Notas adicionales sobre la carga (opcional)…"
              className="w-full rounded-md px-3 py-2"
              style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
            />
          </div>

          <FirmaPad name="carg_firma_responsable" label="Firma del responsable" required />

          {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="flex items-center justify-center gap-2 rounded-md px-6 h-10 font-semibold disabled:opacity-60"
            style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            {pending ? <><Loader2 size={16} className="animate-spin" /> Guardando…</> : "Registrar carga de combustible"}
          </button>
        </form>
      )}
    </div>
  );
}
