"use client";

import { useEffect, useRef, useState, useTransition, useMemo } from "react";
import { ChevronLeft, CheckCircle2, Loader2, Camera, Image as ImageIcon, TriangleAlert } from "lucide-react";
import { crearChecklistCargaCombustible, subirFotoChecklist } from "@/app/(app)/checklist/actions";
import { CampoFotoSemanal } from "@/components/checklist/campo-foto-semanal";
import { FirmaPad } from "@/components/checklist/firma-pad";
import { prepararFotoDiferida } from "@/lib/foto-diferida";
import { leerBorrador, guardarBorrador, borrarBorrador } from "@/lib/borrador-checklist";
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
  disponibilidad: boolean;
  motivoIndisponibilidad: string | null;
};

const MOTIVO_LABEL: Record<string, string> = {
  MANTENIMIENTO: "en mantenimiento / taller",
  SINIESTRO: "por siniestro",
  SIN_OPERADOR: "sin operador asignado",
  TRAMITE_DOCUMENTACION: "en trámite de documentación",
  SIN_COMBUSTIBLE: "sin combustible",
  FALLA_MECANICA: "por falla mecánica",
  OTRO: "no disponible",
};

// Orden de fases según el documento: Vehículo → Carga de combustible → Datos generales
type Fase = "vehiculo" | "carga" | "generales" | "exito";

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

const CLAVE_BORRADOR = "carga_combustible";
type BorradorCargaCombustible = {
  fase: Fase;
  fecha: string;
  zona: EstadoCarga;
  municipio: string;
  area: AreaCarga;
  responsable: string;
  tipoLicencia: string;
  urlLicencia: string | null;
  tipoVehiculo: string;
  numeroEconomico: string;
  tipoCombustible: string;
  porcentajeAntes: string;
  porcentajeDespues: string;
  litrosCargados: string;
  cantidadPagada: string;
  observaciones: string;
  urlsFotosCarga: Record<string, string>;
};

const FASES: Fase[] = ["vehiculo", "carga", "generales", "exito"];
const FASES_LABEL: Record<Fase, string> = {
  vehiculo: "Vehículo",
  carga: "Carga de combustible",
  generales: "Datos generales",
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
  const total = FASES.length - 1;
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
          style={{ width: `${(idx / (total - 1)) * 100}%`, background: "var(--color-primary)", transition: "width 0.3s" }}
        />
      </div>
    </div>
  );
}

export function WizardCargaCombustible({
  unidades,
  permitirGaleriaFotos = false,
  permitirApoyoOperador = false,
  onTerminar,
  onCancelar,
}: {
  unidades: UnidadWizard[];
  permitirGaleriaFotos?: boolean;
  permitirApoyoOperador?: boolean;
  onTerminar: () => void;
  onCancelar: () => void;
}) {
  const [borradorInicial] = useState(() => leerBorrador<BorradorCargaCombustible>(CLAVE_BORRADOR));

  const [fase, setFase] = useState<Fase>(borradorInicial?.fase ?? "vehiculo");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Fase vehiculo
  const [fecha, setFecha] = useState(borradorInicial?.fecha ?? new Date().toISOString().slice(0, 10));
  const [tipoVehiculo, setTipoVehiculo] = useState(borradorInicial?.tipoVehiculo ?? "CAMIONETA");
  const [numeroEconomico, setNumeroEconomico] = useState(borradorInicial?.numeroEconomico ?? "");

  // Fase carga
  const [tipoCombustible, setTipoCombustible] = useState<string>(borradorInicial?.tipoCombustible ?? TIPOS_COMBUSTIBLE_CARGA[0]);
  const [porcentajeDespues, setPorcentajeDespues] = useState(borradorInicial?.porcentajeDespues ?? "");
  const [porcentajeAntes, setPorcentajeAntes] = useState(borradorInicial?.porcentajeAntes ?? "");
  const [litrosCargados, setLitrosCargados] = useState(borradorInicial?.litrosCargados ?? "");
  const [cantidadPagada, setCantidadPagada] = useState(borradorInicial?.cantidadPagada ?? "");
  const [procesandoFotoCarga, setProcesandoFotoCarga] = useState(false);
  const [subidasPendientesCarga, setSubidasPendientesCarga] = useState(0);
  const [urlsFotosCarga, setUrlsFotosCarga] = useState<Record<string, string>>(borradorInicial?.urlsFotosCarga ?? {});

  // Fase generales
  const [zona, setZona] = useState<EstadoCarga>(borradorInicial?.zona ?? ESTADOS_CARGA[0]);
  const [municipio, setMunicipio] = useState(borradorInicial?.municipio ?? MUNICIPIOS_POR_ESTADO[ESTADOS_CARGA[0]][0] ?? "");
  const [area, setArea] = useState<AreaCarga>(borradorInicial?.area ?? AREAS_CARGA[0]);
  const [responsable, setResponsable] = useState(borradorInicial?.responsable ?? "");
  const [esApoyoOperador, setEsApoyoOperador] = useState(false);
  const [tipoLicencia, setTipoLicencia] = useState<string>(borradorInicial?.tipoLicencia ?? TIPOS_LICENCIA_CARGA[0]);
  const [fotoLicenciaArchivo, setFotoLicenciaArchivo] = useState<File | null>(null);
  const [urlLicencia, setUrlLicencia] = useState<string | null>(borradorInicial?.urlLicencia ?? null);
  const [procesandoLicencia, setProcesandoLicencia] = useState(false);
  const [observaciones, setObservaciones] = useState(borradorInicial?.observaciones ?? "");
  const archivoVigenteLicenciaRef = useRef<File | null>(null);
  const tieneLicencia = !!fotoLicenciaArchivo || !!urlLicencia;

  useEffect(() => {
    if (fase === "exito") return;
    guardarBorrador<BorradorCargaCombustible>(CLAVE_BORRADOR, {
      fase, fecha, zona, municipio, area, responsable, tipoLicencia, urlLicencia,
      tipoVehiculo, numeroEconomico, tipoCombustible, porcentajeAntes, porcentajeDespues,
      litrosCargados, cantidadPagada, observaciones, urlsFotosCarga,
    });
  }, [fase, fecha, zona, municipio, area, responsable, tipoLicencia, urlLicencia, tipoVehiculo, numeroEconomico, tipoCombustible, porcentajeAntes, porcentajeDespues, litrosCargados, cantidadPagada, observaciones, urlsFotosCarga]);

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

  function actualizarUrlFotoCarga(campo: string, url: string | null) {
    setUrlsFotosCarga((prev) => {
      const c = { ...prev };
      if (url) c[campo] = url; else delete c[campo];
      return c;
    });
  }

  async function alSeleccionarFotoLicencia(file: File | undefined) {
    if (!file) {
      archivoVigenteLicenciaRef.current = null;
      setFotoLicenciaArchivo(null);
      setUrlLicencia(null);
      return;
    }
    setProcesandoLicencia(true);
    setError(null);
    const { archivo, subida } = await prepararFotoDiferida(file);
    archivoVigenteLicenciaRef.current = archivo;
    setFotoLicenciaArchivo(archivo);
    setUrlLicencia(null);
    setProcesandoLicencia(false);
    subida.then((r) => {
      if (archivoVigenteLicenciaRef.current !== archivo) return;
      if (r.ok) {
        setFotoLicenciaArchivo(null);
        setUrlLicencia(r.url);
      }
    });
  }

  function validarVehiculo() {
    if (!fecha) return "La fecha es obligatoria.";
    if (!numeroEconomico) return "Selecciona un número económico.";
    if (unidadSeleccionada && !unidadSeleccionada.disponibilidad) return "Esta unidad no está disponible. Reactívala primero en el módulo de Flota.";
    return null;
  }

  function validarGenerales() {
    if (!municipio) return "El municipio es obligatorio.";
    if (!responsable.trim()) return "El nombre del responsable es obligatorio.";
    if (!tieneLicencia) return "La foto de licencia es obligatoria.";
    return null;
  }

  function continuarDesdeVehiculo() {
    const err = validarVehiculo();
    if (err) { setError(err); return; }
    setError(null);
    setFase("carga");
  }

  function continuarDesdeCarga() {
    setError(null);
    setFase("generales");
  }

  function enviar(formData: FormData) {
    const err = validarGenerales();
    if (err) { setError(err); return; }
    setError(null);
    startTransition(async () => {
      let urlLicenciaFinal = urlLicencia;
      if (!urlLicenciaFinal && fotoLicenciaArchivo) {
        const fd = new FormData();
        fd.set("file", fotoLicenciaArchivo);
        const r = await subirFotoChecklist(fd);
        if (!r.ok) {
          setError(`No se pudo subir la foto de licencia: ${r.error}`);
          return;
        }
        urlLicenciaFinal = r.url;
        setUrlLicencia(r.url);
      }

      formData.set("gen_fecha", fecha);
      formData.set("gen_zona", zona);
      formData.set("gen_municipio", municipio);
      formData.set("gen_area", area);
      formData.set("gen_responsable", responsable);
      formData.set("gen_es_apoyo_operador", esApoyoOperador ? "Y" : "N");
      formData.set("gen_tipo_licencia", tipoLicencia);
      formData.set("gen_foto_licencia", urlLicenciaFinal ?? "");
      formData.set("veh_tipo_vehiculo", tipoVehiculo);
      formData.set("veh_numero_economico", numeroEconomico);
      formData.set("veh_modelo", unidadSeleccionada ? `${unidadSeleccionada.marca} ${unidadSeleccionada.unidadModelo}` : "");
      formData.set("carg_tipo_combustible", tipoCombustible);
      formData.set("carg_porcentaje_antes", porcentajeAntes);
      formData.set("carg_porcentaje_despues", porcentajeDespues);
      formData.set("carg_litros_cargados", litrosCargados);
      formData.set("carg_cantidad_pagada", cantidadPagada);
      formData.set("carg_observaciones", observaciones);

      const res = await crearChecklistCargaCombustible(formData);
      if (!res.ok) { setError(res.error); return; }
      borrarBorrador(CLAVE_BORRADOR);
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
          onClick={fase === "vehiculo" ? () => { borrarBorrador(CLAVE_BORRADOR); onCancelar(); } : () => setFase(FASES[FASES.indexOf(fase) - 1])}
          className="rounded-full p-1.5"
          style={{ background: "var(--chip)", color: "var(--sidebar-text-active)" }}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <BarraProgreso fase={fase} />
        </div>
      </div>

      {/* ── Fase: Vehículo ──────────────────────────────────── */}
      {fase === "vehiculo" && (
        <div className="flex flex-col gap-5 rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Vehículo
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

          {unidadSeleccionada && !unidadSeleccionada.disponibilidad && (
            <div
              className="flex items-start gap-3 rounded-xl px-4 py-3"
              style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)" }}
            >
              <TriangleAlert size={16} color="#dc2626" className="shrink-0 mt-0.5" />
              <div>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "#dc2626" }}>
                  Unidad no disponible
                </p>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#dc2626", marginTop: 2 }}>
                  Esta unidad está {MOTIVO_LABEL[unidadSeleccionada.motivoIndisponibilidad ?? ""] ?? "no disponible"} y no puede recibir un checklist. Reactívala primero en el módulo de Flota.
                </p>
              </div>
            </div>
          )}

          {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}

          <button
            type="button"
            onClick={continuarDesdeVehiculo}
            disabled={!!(unidadSeleccionada && !unidadSeleccionada.disponibilidad)}
            className="rounded-md px-6 h-10 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            Continuar →
          </button>
        </div>
      )}

      {/* ── Fase: Carga de Combustible ─────────────────────── */}
      {fase === "carga" && (
        <div className="flex flex-col gap-5 rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
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
              <label style={labelStyle}>% de combustible antes de la carga *</label>
              <input
                type="number" min={0} max={100}
                value={porcentajeAntes}
                onChange={(e) => setPorcentajeAntes(e.target.value)}
                placeholder="Ej. 20"
                style={fieldStyle}
              />
            </div>

            <div>
              <CampoFotoSemanal
                name="carg_foto_odometro_antes"
                label="Odómetro antes de cargar"
                requerido
                permitirGaleria={permitirGaleriaFotos}
                initialUrl={borradorInicial?.urlsFotosCarga.carg_foto_odometro_antes}
                bloqueado={procesandoFotoCarga}
                onSubiendoChange={setProcesandoFotoCarga}
                onSubidaPendienteChange={(p) => setSubidasPendientesCarga((n) => n + (p ? 1 : -1))}
                onUrlChange={(url) => actualizarUrlFotoCarga("carg_foto_odometro_antes", url)}
              />
            </div>

            <div>
              <CampoFotoSemanal
                name="carg_foto_evidencia_bomba_1"
                label="Evidencia de bomba"
                requerido
                permitirGaleria={permitirGaleriaFotos}
                initialUrl={borradorInicial?.urlsFotosCarga.carg_foto_evidencia_bomba_1}
                bloqueado={procesandoFotoCarga}
                onSubiendoChange={setProcesandoFotoCarga}
                onSubidaPendienteChange={(p) => setSubidasPendientesCarga((n) => n + (p ? 1 : -1))}
                onUrlChange={(url) => actualizarUrlFotoCarga("carg_foto_evidencia_bomba_1", url)}
              />
            </div>

            <div>
              <label style={labelStyle}>% de combustible después de la carga *</label>
              <input
                type="number" min={0} max={100}
                value={porcentajeDespues}
                onChange={(e) => setPorcentajeDespues(e.target.value)}
                placeholder="Ej. 95"
                style={fieldStyle}
              />
            </div>

            <div>
              <CampoFotoSemanal
                name="carg_foto_odometro_despues"
                label="Odómetro después de cargar"
                requerido
                permitirGaleria={permitirGaleriaFotos}
                initialUrl={borradorInicial?.urlsFotosCarga.carg_foto_odometro_despues}
                bloqueado={procesandoFotoCarga}
                onSubiendoChange={setProcesandoFotoCarga}
                onSubidaPendienteChange={(p) => setSubidasPendientesCarga((n) => n + (p ? 1 : -1))}
                onUrlChange={(url) => actualizarUrlFotoCarga("carg_foto_odometro_despues", url)}
              />
            </div>

            <div>
              <CampoFotoSemanal
                name="carg_foto_evidencia_bomba_2"
                label="Evidencia de bomba 2 (opcional)"
                requerido={false}
                permitirGaleria={permitirGaleriaFotos}
                initialUrl={borradorInicial?.urlsFotosCarga.carg_foto_evidencia_bomba_2}
                bloqueado={procesandoFotoCarga}
                onSubiendoChange={setProcesandoFotoCarga}
                onSubidaPendienteChange={(p) => setSubidasPendientesCarga((n) => n + (p ? 1 : -1))}
                onUrlChange={(url) => actualizarUrlFotoCarga("carg_foto_evidencia_bomba_2", url)}
              />
            </div>

            <div>
              <CampoFotoSemanal
                name="carg_foto_ticket"
                label="Foto del ticket"
                requerido
                permitirGaleria={permitirGaleriaFotos}
                initialUrl={borradorInicial?.urlsFotosCarga.carg_foto_ticket}
                bloqueado={procesandoFotoCarga}
                onSubiendoChange={setProcesandoFotoCarga}
                onSubidaPendienteChange={(p) => setSubidasPendientesCarga((n) => n + (p ? 1 : -1))}
                onUrlChange={(url) => actualizarUrlFotoCarga("carg_foto_ticket", url)}
              />
            </div>

            <div>
              <label style={labelStyle}>Litros cargados *</label>
              <input
                type="number" min={0} step="0.01"
                value={litrosCargados}
                onChange={(e) => setLitrosCargados(e.target.value)}
                placeholder="Ej. 45.5"
                style={fieldStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Cantidad pagada *</label>
              <input
                type="number" min={0} step="0.01"
                value={cantidadPagada}
                onChange={(e) => setCantidadPagada(e.target.value)}
                placeholder="Ej. 1200.00"
                style={fieldStyle}
              />
            </div>
          </div>

          {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}

          <button
            type="button"
            onClick={continuarDesdeCarga}
            className="rounded-md px-6 h-10 font-semibold"
            style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            Continuar →
          </button>
        </div>
      )}

      {/* ── Fase: Datos generales ────────────────────────────── */}
      {fase === "generales" && (
        <form
          className="flex flex-col gap-5 rounded-xl p-5"
          style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
          action={(formData) => enviar(formData)}
        >
          <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Datos generales
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div>
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
              {permitirApoyoOperador && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setEsApoyoOperador((v) => !v)}
                    className="flex items-center gap-2 rounded-md px-3 py-1.5"
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "var(--text-sm)",
                      background: esApoyoOperador ? "rgba(22,163,74,0.12)" : "var(--chip)",
                      color: esApoyoOperador ? "#15803d" : "var(--sidebar-text)",
                      border: `1px solid ${esApoyoOperador ? "rgba(22,163,74,0.3)" : "transparent"}`,
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: esApoyoOperador ? "#16a34a" : "var(--field-border)",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    Apoyo a operador
                  </button>
                  {esApoyoOperador && (
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                      Estás capturando en nombre del operador
                    </span>
                  )}
                </div>
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

          {/* Foto de licencia */}
          <div>
            <label style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              {tieneLicencia ? "Foto de licencia adjuntada *" : "Foto de licencia *"}
            </label>
            <div className="flex gap-2 mt-1">
              <label
                className="flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5"
                style={{
                  background: tieneLicencia ? "var(--status-cerrado-bg)" : "var(--field-bg)",
                  color: tieneLicencia ? "var(--color-status-cerrado)" : "var(--sidebar-text)",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-sm)",
                  opacity: procesandoLicencia ? 0.6 : 1,
                  cursor: procesandoLicencia ? "not-allowed" : "pointer",
                }}
              >
                {procesandoLicencia ? <Loader2 size={15} className="animate-spin shrink-0" /> : <Camera size={15} className="shrink-0" />}
                <span className="truncate">{procesandoLicencia ? "Procesando…" : "Tomar foto"}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={procesandoLicencia}
                  onChange={(e) => alSeleccionarFotoLicencia(e.target.files?.[0])}
                />
              </label>
              <label
                className="flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5"
                style={{
                  background: tieneLicencia ? "var(--status-cerrado-bg)" : "var(--field-bg)",
                  color: tieneLicencia ? "var(--color-status-cerrado)" : "var(--sidebar-text)",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-sm)",
                  opacity: procesandoLicencia ? 0.6 : 1,
                  cursor: procesandoLicencia ? "not-allowed" : "pointer",
                }}
              >
                {procesandoLicencia ? <Loader2 size={15} className="animate-spin shrink-0" /> : <ImageIcon size={15} className="shrink-0" />}
                <span className="truncate">{procesandoLicencia ? "Procesando…" : "Elegir de galería"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={procesandoLicencia}
                  onChange={(e) => alSeleccionarFotoLicencia(e.target.files?.[0])}
                />
              </label>
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
            disabled={pending || subidasPendientesCarga > 0}
            className="flex items-center justify-center gap-2 rounded-md px-6 h-10 font-semibold disabled:opacity-60"
            style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            {pending ? (
              <><Loader2 size={16} className="animate-spin" /> Guardando…</>
            ) : subidasPendientesCarga > 0 ? (
              <><Loader2 size={16} className="animate-spin" /> Terminando de subir fotos…</>
            ) : (
              "Registrar carga de combustible"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
