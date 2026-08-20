"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Gauge,
  Wrench,
  ShieldCheck,
  CalendarClock,
  FileBadge,
  Pencil,
  ArrowLeftRight,
  Ban,
  Printer,
  Check,
  X,
  Lock,
  AlertTriangle,
  History,
  AlertOctagon,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ESTATUS_SEGURO_STYLE,
  TIPO_VEHICULO_LABEL,
  estatusVisibleUnidad,
} from "@/lib/estatus";
import { fmtMoney, fmtFecha, diasPara } from "@/lib/formato";
import { actualizarCapacidadTanque, reasignarProyecto } from "@/app/(app)/unidades/actions";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { ToggleDisponibilidad } from "@/components/unidades/toggle-disponibilidad";
import { calcularDiasSinOperar, labelFuenteActividad } from "@/lib/actividad-unidad";
import { FormAccidente } from "@/components/accidentes/form-accidente";
import { registrarConsumo } from "@/app/(app)/inventario-insumos/actions";
import { blobProxy } from "@/lib/blob";
import { Modal } from "@/components/ui/modal";
import { NuevaOrdenForm } from "@/components/mantenimiento/nueva-orden-form";
import { CombustibleForm } from "@/components/combustible/combustible-form";
import { TagForm } from "@/components/tag/tag-form";
import { SeguroForm } from "@/components/seguros/seguro-form";
import { NOMBRE_MES, type SlaMensual } from "@/lib/sla-disponibilidad";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Unidad = any;

const TABS = [
  { id: "general", label: "Datos generales" },
  { id: "mantenimiento", label: "Mantenimiento" },
  { id: "gastos", label: "Gastos" },
  { id: "combustible", label: "Combustible" },
  { id: "tag", label: "TAG" },
  { id: "seguro", label: "Seguro" },
  { id: "gps", label: "GPS" },
  { id: "checklist", label: "Checklist" },
  { id: "operador", label: "Operador" },
  { id: "accidentes", label: "Accidentes" },
  { id: "historico", label: "Bitácora" },
  { id: "siniestros", label: "Siniestros" },
  { id: "insumos", label: "Insumos" },
  { id: "sla", label: "SLA de disponibilidad" },
] as const;

const CATEGORIAS_MANTENIMIENTO = new Set(["MANTENIMIENTO_PREVENTIVO", "MANTENIMIENTO_CORRECTIVO"]);

const TIPO_SINIESTRO_LABEL: Record<string, string> = {
  COLISION: "Colisión",
  ROBO_TOTAL: "Robo total",
  ROBO_PARCIAL: "Robo parcial",
  VANDALISMO: "Vandalismo",
  INCENDIO: "Incendio",
  FENOMENO_NATURAL: "Fenómeno natural",
  OTRO: "Otro",
};

const ESTATUS_SINIESTRO_STYLE: Record<string, { color: string; bg: string }> = {
  ABIERTO: { color: "var(--color-status-escena)", bg: "var(--status-escena-bg)" },
  EN_PROCESO: { color: "var(--color-status-revision)", bg: "var(--status-revision-bg)" },
  CERRADO: { color: "var(--color-status-cerrado)", bg: "var(--status-cerrado-bg)" },
  CERRADO_SIN_INDEMNIZACION: { color: "var(--sidebar-text)", bg: "var(--field-bg)" },
};

type TabId = (typeof TABS)[number]["id"];

const panelStyle: React.CSSProperties = { background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" };
const labelStyle: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" };
const valueStyle: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--field-text)" };

function CapacidadTanqueEditor({ numeroEconomico, capacidadTanqueLitros, puedeEditar }: { numeroEconomico: string; capacidadTanqueLitros: number | null; puedeEditar: boolean }) {
  const [editando, setEditando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editando) {
    return (
      <div className="flex items-center gap-2">
        <span style={valueStyle}>{capacidadTanqueLitros ?? "—"} L</span>
        {puedeEditar ? (
          <button onClick={() => setEditando(true)} className="flex items-center justify-center rounded-md" style={{ width: 22, height: 22, color: "var(--sidebar-text)" }} aria-label="Editar capacidad de tanque">
            <Pencil size={13} />
          </button>
        ) : (
          !capacidadTanqueLitros && <Lock size={13} color="var(--sidebar-text)" />
        )}
      </div>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await actualizarCapacidadTanque(formData);
          if (res.ok) setEditando(false);
          else setError(res.error ?? "No se pudo guardar.");
        });
      }}
    >
      <input type="hidden" name="numeroEconomico" value={numeroEconomico} />
      <input
        name="capacidadTanqueLitros"
        type="number"
        step="0.1"
        min={1}
        defaultValue={capacidadTanqueLitros ?? ""}
        autoFocus
        className="rounded-md px-2"
        style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: 28, width: 90, fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}
      />
      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>L</span>
      <button type="submit" disabled={pending} className="flex items-center justify-center rounded-md disabled:opacity-60" style={{ width: 22, height: 22, color: "var(--color-status-cerrado)" }} aria-label="Guardar">
        <Check size={15} />
      </button>
      <button type="button" onClick={() => setEditando(false)} className="flex items-center justify-center rounded-md" style={{ width: 22, height: 22, color: "var(--sidebar-text)" }} aria-label="Cancelar">
        <X size={15} />
      </button>
      {error && <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>{error}</span>}
    </form>
  );
}

function ReasignarProyectoButton({
  numeroEconomico,
  proyectoActualId,
  proyectos,
}: {
  numeroEconomico: string;
  proyectoActualId: string | null;
  proyectos: { id: string; nombre: string }[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-md px-3 h-9"
        style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      >
        <ArrowLeftRight size={15} /> Reasignar proyecto
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await reasignarProyecto(formData);
          if (res.ok) setAbierto(false);
          else setError(res.error ?? "No se pudo reasignar.");
        });
      }}
    >
      <input type="hidden" name="numeroEconomico" value={numeroEconomico} />
      <select
        name="proyectoId"
        defaultValue={proyectoActualId ?? ""}
        className="rounded-md px-2"
        style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
      >
        <option value="">Sin proyecto</option>
        {proyectos.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="flex items-center justify-center rounded-md disabled:opacity-60" style={{ width: "var(--h-md)", height: "var(--h-md)", color: "var(--color-status-cerrado)" }} aria-label="Guardar">
        <Check size={16} />
      </button>
      <button type="button" onClick={() => setAbierto(false)} className="flex items-center justify-center rounded-md" style={{ width: "var(--h-md)", height: "var(--h-md)", color: "var(--sidebar-text)" }} aria-label="Cancelar">
        <X size={16} />
      </button>
      {error && <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>{error}</span>}
    </form>
  );
}

function BotonAgregarModal({
  label,
  tituloModal,
  children,
}: {
  label: string;
  tituloModal: string;
  children: (cerrar: () => void) => React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-md px-3 h-9 font-semibold"
        style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
      >
        <Plus size={14} /> {label}
      </button>
      {abierto && (
        <Modal title={tituloModal} onClose={() => setAbierto(false)}>
          {children(() => setAbierto(false))}
        </Modal>
      )}
    </>
  );
}

function BotonAgregarMantenimiento({ numeroEconomico }: { numeroEconomico: string }) {
  const router = useRouter();
  return (
    <BotonAgregarModal label="Agregar mantenimiento" tituloModal={`Nueva orden — ${numeroEconomico}`}>
      {(cerrar) => (
        <NuevaOrdenForm
          unidades={[]}
          proyectos={[]}
          numeroEconomicoFijo={numeroEconomico}
          onExito={() => {
            cerrar();
            router.refresh();
          }}
        />
      )}
    </BotonAgregarModal>
  );
}

function BotonAgregarCombustible({ numeroEconomico }: { numeroEconomico: string }) {
  const router = useRouter();
  return (
    <BotonAgregarModal label="Agregar carga" tituloModal={`Carga de combustible — ${numeroEconomico}`}>
      {(cerrar) => (
        <CombustibleForm
          unidades={[]}
          numeroEconomicoFijo={numeroEconomico}
          onExito={() => {
            cerrar();
            router.refresh();
          }}
        />
      )}
    </BotonAgregarModal>
  );
}

function BotonAgregarTag({ numeroEconomico }: { numeroEconomico: string }) {
  const router = useRouter();
  return (
    <BotonAgregarModal label="Agregar transacción TAG" tituloModal={`Transacción TAG — ${numeroEconomico}`}>
      {(cerrar) => (
        <TagForm
          unidades={[]}
          numeroEconomicoFijo={numeroEconomico}
          onExito={() => {
            cerrar();
            router.refresh();
          }}
        />
      )}
    </BotonAgregarModal>
  );
}

function BotonAgregarSeguro({ numeroEconomico }: { numeroEconomico: string }) {
  const router = useRouter();
  return (
    <BotonAgregarModal label="Agregar póliza" tituloModal={`Nueva póliza — ${numeroEconomico}`}>
      {(cerrar) => (
        <SeguroForm
          unidades={[]}
          numeroEconomicoFijo={numeroEconomico}
          onExito={() => {
            cerrar();
            router.refresh();
          }}
        />
      )}
    </BotonAgregarModal>
  );
}

export function FichaUnidad({
  unidad,
  puedeEditarCapacidad,
  proyectos,
  alertaPreventiva,
  insumos = [],
  puedeVerSla = false,
  slaMensual = [],
}: {
  unidad: Unidad;
  puedeEditarCapacidad: boolean;
  proyectos: { id: string; nombre: string }[];
  alertaPreventiva: Unidad | null;
  insumos?: { id: string; nombre: string; unidad: string; existencias: string }[];
  puedeVerSla?: boolean;
  slaMensual?: SlaMensual[];
}) {
  const [tab, setTab] = useState<TabId>("general");

  // Estado del botón de encendido/apagado, elevado hasta aquí para que el badge
  // de estatus del encabezado, el de la pestaña General y el KPI de "días sin
  // operar" cambien todos juntos al usarlo, sin esperar a recargar la página.
  const [disponible, setDisponible] = useState<boolean>(unidad.disponibilidad);
  const [fechaCambioLocal, setFechaCambioLocal] = useState<Date | null>(null);

  const seguroVigente = unidad.seguros?.[0];
  const diasSeguro = diasPara(seguroVigente?.fechaVencimiento);
  const proximoMantenimiento = unidad.gastos?.find((g: Unidad) => g.estatus === "PROGRAMADO");

  // combustible/tags/posicionesGps vienen ordenados desc por fecha — el [0] es el más reciente.
  const { diasSinOperar, operando, origen, fuente } = calcularDiasSinOperar(
    disponible,
    fechaCambioLocal ?? unidad.fechaCambioDisponibilidad,
    unidad.combustible?.[0]?.fecha,
    unidad.tags?.[0]?.fecha,
    unidad.posicionesGps?.[0]?.timestamp
  );
  const estatusVisible = estatusVisibleUnidad(unidad.estatus, disponible);
  const subDiasSinOperar = operando
    ? "Encendida"
    : origen === "apagada"
      ? "Apagada con el botón de encendido/apagado"
      : origen === "actividad"
        ? `Estimado — última actividad: ${labelFuenteActividad(fuente)}`
        : "Sin actividad registrada";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/unidades"
          className="inline-flex items-center gap-1 w-fit"
          style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}
        >
          <ChevronLeft size={15} /> Volver al inventario
        </Link>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "rgba(43,127,255,0.15)" }}
            >
              <Gauge size={26} color="var(--color-primary)" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-3xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
                  {unidad.numeroEconomico}
                </h1>
                <Badge label={estatusVisible.label} color={estatusVisible.color} bg={estatusVisible.bg} />
              </div>
              <div className="mt-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
                {unidad.marca} {unidad.unidadModelo} · {unidad.anio} · {TIPO_VEHICULO_LABEL[unidad.tipoVehiculo]} · Placas{" "}
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--field-text)" }}>{unidad.placas}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-md px-3 h-9"
              style={{ ...panelStyle, color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
            >
              <Printer size={15} /> Imprimir
            </button>
            <ToggleDisponibilidad
              numeroEconomico={unidad.numeroEconomico}
              disponible={disponible}
              onCambio={(nuevo) => {
                setDisponible(nuevo);
                setFechaCambioLocal(new Date());
              }}
              deshabilitado={unidad.estatus === "BAJA"}
              variante="completo"
            />
            <ReasignarProyectoButton numeroEconomico={unidad.numeroEconomico} proyectoActualId={unidad.proyectoId ?? null} proyectos={proyectos} />
            {unidad.proyectoId && (
              <>
                <Link
                  href={`/unidades/${unidad.numeroEconomico}/editar`}
                  className="flex items-center gap-2 rounded-md px-3 h-9"
                  style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
                >
                  <Pencil size={15} /> Editar
                </Link>
                {unidad.estatus !== "BAJA" && (
                  <Link
                    href={`/unidades/${unidad.numeroEconomico}/baja`}
                    className="flex items-center gap-2 rounded-md px-3 h-9"
                    style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
                  >
                    <Ban size={15} /> Dar de baja
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={Gauge} label="Rendimiento" value={`${unidad.rendimientoPromedio ?? "—"} km/L`} sub={`${Number(unidad.kmOficial).toLocaleString("es-MX")} km oficiales`} />
        <Kpi icon={Wrench} label="Próximo mantenimiento" value={proximoMantenimiento ? fmtFecha(proximoMantenimiento.fecha) : "Sin programar"} sub={proximoMantenimiento?.descripcion ?? "—"} />
        <Kpi
          icon={ShieldCheck}
          label="Vencimiento de seguro"
          value={seguroVigente ? fmtFecha(seguroVigente.fechaVencimiento) : "Sin póliza"}
          sub={diasSeguro !== null ? (diasSeguro >= 0 ? `en ${diasSeguro} días` : `vencido hace ${-diasSeguro} días`) : "Registrar en Módulo F"}
          alert={diasSeguro !== null && diasSeguro <= 30}
        />
        <Kpi icon={CalendarClock} label="Días sin operar" value={String(diasSinOperar)} sub={subDiasSinOperar} alert={!operando && diasSinOperar > 2} />
      </div>

      {!unidad.proyectoId && (
        <div className="rounded-md px-4 py-3 flex items-start gap-3" style={{ background: "#fff7ed", border: "1px solid #fed7aa", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#c2410c" }}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            <strong>Unidad sin proyecto asignado.</strong> Asigna un proyecto para habilitar la edición y registro de actividades. Solo la reasignación de proyecto está disponible.
          </span>
        </div>
      )}

      {alertaPreventiva && (
        <div className="rounded-md px-4 py-3" style={{ background: "var(--status-escena-bg)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>
          Mantenimiento preventivo vencido
          {alertaPreventiva.vencidaPorKm && ` — ${alertaPreventiva.kmDesdeUltimoMantenimiento.toLocaleString("es-MX")} km desde el último servicio (intervalo ${alertaPreventiva.intervaloKm.toLocaleString("es-MX")} km)`}
          {alertaPreventiva.vencidaPorHoras && ` — ${alertaPreventiva.horasDesdeUltimoMantenimiento} hrs desde el último servicio (intervalo ${alertaPreventiva.intervaloHoras} hrs)`}
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-1 overflow-x-auto border-b" style={{ borderColor: "var(--field-border)" }}>
          {TABS.filter((t) => t.id !== "sla" || puedeVerSla).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2.5 whitespace-nowrap border-b-2 -mb-px transition-colors"
              style={{
                borderColor: tab === t.id ? "var(--color-primary)" : "transparent",
                color: tab === t.id ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-base)",
                fontWeight: tab === t.id ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="pt-5">
          {tab === "general" && <TabGeneral unidad={unidad} puedeEditarCapacidad={puedeEditarCapacidad} disponible={disponible} />}
          {tab === "mantenimiento" && <TabMantenimiento gastos={unidad.gastos ?? []} numeroEconomico={unidad.numeroEconomico} />}
          {tab === "gastos" && <TabGastos gastos={unidad.gastos ?? []} historicos={unidad.historicosProyecto ?? []} />}
          {tab === "combustible" && <TabCombustible registros={unidad.combustible ?? []} numeroEconomico={unidad.numeroEconomico} />}
          {tab === "tag" && <TabTag registros={unidad.tags ?? []} numeroEconomico={unidad.numeroEconomico} />}
          {tab === "seguro" && <TabSeguro seguros={unidad.seguros ?? []} numeroEconomico={unidad.numeroEconomico} />}
          {tab === "gps" && <TabGps posiciones={unidad.posicionesGps ?? []} />}
          {tab === "checklist" && <TabChecklist checklists={unidad.checklists ?? []} />}
          {tab === "operador" && <TabOperador resguardante={unidad.resguardante} />}
          {tab === "accidentes" && <TabAccidentes accidentes={unidad.accidentes ?? []} numeroEconomico={unidad.numeroEconomico} bloqueada={!unidad.proyectoId} />}
          {tab === "historico" && <TabHistorico historicos={unidad.historicosProyecto ?? []} />}
          {tab === "siniestros" && <TabSiniestros siniestros={unidad.siniestros ?? []} />}
          {tab === "insumos" && (
            <TabInsumos
              consumos={unidad.consumosInsumos ?? []}
              insumos={insumos}
              numeroEconomico={unidad.numeroEconomico}
              bloqueada={!unidad.proyectoId}
            />
          )}
          {tab === "sla" && puedeVerSla && <TabSla meses={slaMensual} />}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  alert,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  sub: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl p-4" style={panelStyle}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} color={alert ? "var(--color-status-escena)" : "var(--sidebar-text)"} />
        <span style={labelStyle}>{label}</span>
      </div>
      <div style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: alert ? "var(--color-status-escena)" : "var(--sidebar-text-active)" }}>
        {value}
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>{sub}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle} className="mt-1">{value}</div>
    </div>
  );
}

function TabGeneral({ unidad, puedeEditarCapacidad, disponible }: { unidad: Unidad; puedeEditarCapacidad: boolean; disponible: boolean }) {
  const estatusVisible = estatusVisibleUnidad(unidad.estatus, disponible);
  const placasHistorial: Unidad[] = unidad.placasHistorial ?? [];
  return (
    <div className="flex flex-col gap-6">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="rounded-xl p-5" style={panelStyle}>
        <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Identificación y vehículo
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Número de serie (VIN)" value={<span style={{ fontFamily: "var(--font-mono)" }}>{unidad.numeroSerie}</span>} />
          <Field label="Placas" value={<span style={{ fontFamily: "var(--font-mono)" }}>{unidad.placas}</span>} />
          <Field label="Marca / Unidad" value={`${unidad.marca} ${unidad.unidadModelo}`} />
          <Field label="Año" value={unidad.anio} />
          <Field label="Tipo de vehículo" value={TIPO_VEHICULO_LABEL[unidad.tipoVehiculo]} />
          <Field label="Tipo de combustible" value={unidad.tipoCombustible} />
          <Field label="Rendimiento promedio" value={`${unidad.rendimientoPromedio ?? "—"} km/L`} />
          <Field label="Km oficial" value={`${Number(unidad.kmOficial).toLocaleString("es-MX")} km`} />
          <Field
            label="Capacidad máxima de tanque"
            value={
              <CapacidadTanqueEditor
                numeroEconomico={unidad.numeroEconomico}
                capacidadTanqueLitros={unidad.capacidadTanqueLitros != null ? Number(unidad.capacidadTanqueLitros) : null}
                puedeEditar={puedeEditarCapacidad}
              />
            }
          />
        </div>
      </div>

      <div className="rounded-xl p-5" style={panelStyle}>
        <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Asignación y documentación
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Proyecto" value={unidad.proyecto?.nombre ?? "—"} />
          <Field
            label="Estatus"
            value={<Badge label={estatusVisible.label} color={estatusVisible.color} bg={estatusVisible.bg} />}
          />
          <Field label="Resguardante" value={unidad.resguardante ? <Link href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--color-primary)" }}>{unidad.resguardante.nombre}</Link> : "Sin asignar"} />
          <Field label="Propietario" value={unidad.propietario} />
          <Field label="Origen de placa" value={unidad.origenPlaca} />
          <Field label="Tag IAVE" value={unidad.tagIave ?? "—"} />
          <Field
            label="Tarjeta de combustible"
            value={
              <span className="flex items-center gap-2">
                {unidad.numeroTarjetaCombustible ?? "—"}
                {unidad.tarjetaCombustible?.url && (
                  <a href={blobProxy(unidad.tarjetaCombustible.url)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", fontSize: "var(--text-sm)" }}>
                    Ver documento
                  </a>
                )}
              </span>
            }
          />
          <Field label="Fecha de alta" value={fmtFecha(unidad.fechaAlta)} />
        </div>
      </div>
    </div>

    <div className="rounded-xl p-5" style={panelStyle}>
      <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
        Historial de placas
      </h3>
      {placasHistorial.length === 0 ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Sin historial registrado todavía.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {placasHistorial.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md px-3 py-2" style={{ background: "var(--field-bg)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{p.placa}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                {fmtFecha(p.fechaDesde)} — {p.fechaHasta ? fmtFecha(p.fechaHasta) : "vigente"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-10 text-center" style={{ ...panelStyle, fontFamily: "var(--font-ui)", color: "var(--sidebar-text)" }}>
      {children}
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl" style={panelStyle}>
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={labelStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const td: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" };

function TabMantenimiento({ gastos, numeroEconomico }: { gastos: Unidad[]; numeroEconomico: string }) {
  const [busqueda, setBusqueda] = useState("");
  const gastosMantenimiento = useMemo(() => gastos.filter((g) => CATEGORIAS_MANTENIMIENTO.has(g.categoria)), [gastos]);
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return gastosMantenimiento;
    return gastosMantenimiento.filter((g) =>
      g.categoria.toUpperCase().includes(q) ||
      fmtFecha(g.fecha).toUpperCase().includes(q) ||
      (g.descripcion ?? "").toUpperCase().includes(q)
    );
  }, [gastosMantenimiento, busqueda]);

  const hoy = new Date();

  if (!gastosMantenimiento.length) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState>Sin órdenes de mantenimiento registradas.</EmptyState>
        <div><BotonAgregarMantenimiento numeroEconomico={numeroEconomico} /></div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar tipo, descripción o fecha…" />
        <BotonAgregarMantenimiento numeroEconomico={numeroEconomico} />
      </div>
      <Table headers={["Fecha", "Tipo", "Descripción", "Ingreso taller", "Salida estimada", "Costo", "Estatus"]}>
        {filtrados.map((g) => {
          const excedido =
            g.fechaEstimadaSalida &&
            new Date(g.fechaEstimadaSalida) < hoy &&
            g.estatus !== "CERRADO" &&
            g.estatus !== "PAGADO";
          return (
            <tr key={g.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3 whitespace-nowrap" style={td}>{fmtFecha(g.fecha)}</td>
              <td className="px-4 py-3 whitespace-nowrap" style={td}>{g.categoria.replaceAll("_", " ")}</td>
              <td className="px-4 py-3" style={td}>{g.descripcion ?? "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap" style={td}>{g.fechaIngresoTaller ? fmtFecha(g.fechaIngresoTaller) : "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap" style={td}>
                <div className="flex items-center gap-2">
                  {g.fechaEstimadaSalida ? fmtFecha(g.fechaEstimadaSalida) : "—"}
                  {excedido && (
                    <Badge label="Excedido" color="var(--color-status-escena)" bg="var(--status-escena-bg)" />
                  )}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap" style={{ ...td, fontFamily: "var(--font-mono)" }}>{fmtMoney(g.costo)}</td>
              <td className="px-4 py-3" style={td}>{g.estatus}</td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

type HistoricoProyecto = { fechaInicio: string; fechaFin: string | null; proyecto: { nombre: string } };

function proyectoDeGasto(fecha: string, historicos: HistoricoProyecto[]): string {
  const f = new Date(fecha).getTime();
  const h = historicos.find((h) => {
    const inicio = new Date(h.fechaInicio).getTime();
    const fin = h.fechaFin ? new Date(h.fechaFin).getTime() : Infinity;
    return f >= inicio && f < fin;
  });
  return h?.proyecto?.nombre ?? "—";
}

function TabGastos({ gastos, historicos }: { gastos: Unidad[]; historicos: HistoricoProyecto[] }) {
  const [busqueda, setBusqueda] = useState("");
  const gastosOtros = useMemo(() => gastos.filter((g) => !CATEGORIAS_MANTENIMIENTO.has(g.categoria)), [gastos]);
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return gastosOtros;
    return gastosOtros.filter((g) =>
      g.categoria.toUpperCase().includes(q) ||
      fmtFecha(g.fecha).toUpperCase().includes(q) ||
      (g.descripcion ?? "").toUpperCase().includes(q) ||
      proyectoDeGasto(g.fecha, historicos).toUpperCase().includes(q)
    );
  }, [gastosOtros, busqueda, historicos]);

  if (!gastosOtros.length) return <EmptyState>Sin otros gastos vehiculares registrados.</EmptyState>;
  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar categoría, descripción, proyecto o fecha…" />
      <Table headers={["Fecha", "Proyecto", "Categoría", "Descripción", "Costo", "Km", "Estatus"]}>
        {filtrados.map((g) => (
          <tr key={g.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
            <td className="px-4 py-3 whitespace-nowrap" style={td}>{fmtFecha(g.fecha)}</td>
            <td className="px-4 py-3 whitespace-nowrap" style={td}>{proyectoDeGasto(g.fecha, historicos)}</td>
            <td className="px-4 py-3 whitespace-nowrap" style={td}>{g.categoria.replaceAll("_", " ")}</td>
            <td className="px-4 py-3" style={td}>{g.descripcion ?? "—"}</td>
            <td className="px-4 py-3 whitespace-nowrap" style={{ ...td, fontFamily: "var(--font-mono)" }}>{fmtMoney(g.costo)}</td>
            <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{g.kmAlMomento ?? "—"}</td>
            <td className="px-4 py-3" style={td}>{g.estatus}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function TabCombustible({ registros, numeroEconomico }: { registros: Unidad[]; numeroEconomico: string }) {
  const [busqueda, setBusqueda] = useState("");
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return registros;
    return registros.filter((r) => (r.estacion ?? "").toUpperCase().includes(q) || fmtFecha(r.fecha).toUpperCase().includes(q));
  }, [registros, busqueda]);

  if (!registros.length) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState>Sin cargas de combustible registradas.</EmptyState>
        <div><BotonAgregarCombustible numeroEconomico={numeroEconomico} /></div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar estación o fecha…" />
        <BotonAgregarCombustible numeroEconomico={numeroEconomico} />
      </div>
      <Table headers={["Fecha", "Litros", "Costo", "Km", "Estación", "Rendimiento", ""]}>
      {filtrados.map((r) => (
        <tr key={r.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
          <td className="px-4 py-3" style={td}>{fmtFecha(r.fecha)}</td>
          <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{r.litros} L</td>
          <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{fmtMoney(r.costo)}</td>
          <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{r.kmActual}</td>
          <td className="px-4 py-3" style={td}>{r.estacion ?? "—"}</td>
          <td className="px-4 py-3" style={td}>{r.rendimientoCalculado ? `${r.rendimientoCalculado} km/L` : "—"}</td>
          <td className="px-4 py-3">
            {r.alertaSobrellenado && <Badge label="Excede capacidad" color="var(--color-status-escena)" bg="var(--status-escena-bg)" />}
          </td>
        </tr>
      ))}
      </Table>
    </div>
  );
}

function TabTag({ registros, numeroEconomico }: { registros: Unidad[]; numeroEconomico: string }) {
  const [busqueda, setBusqueda] = useState("");
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return registros;
    return registros.filter((r) =>
      (r.caseta ?? "").toUpperCase().includes(q) ||
      r.proveedorTag.toUpperCase().includes(q) ||
      fmtFecha(r.fecha).toUpperCase().includes(q)
    );
  }, [registros, busqueda]);

  if (!registros.length) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState>Sin transacciones de TAG registradas.</EmptyState>
        <div><BotonAgregarTag numeroEconomico={numeroEconomico} /></div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar caseta, proveedor o fecha…" />
        <BotonAgregarTag numeroEconomico={numeroEconomico} />
      </div>
      <Table headers={["Fecha", "Caseta", "Monto", "Proveedor", "Conciliado"]}>
      {filtrados.map((r) => (
        <tr key={r.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
          <td className="px-4 py-3" style={td}>{fmtFecha(r.fecha)}</td>
          <td className="px-4 py-3" style={td}>{r.caseta ?? "—"}</td>
          <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{fmtMoney(r.monto)}</td>
          <td className="px-4 py-3" style={td}>{r.proveedorTag}</td>
          <td className="px-4 py-3">
            <Badge label={r.conciliado ? "Conciliado" : "Pendiente"} color={r.conciliado ? "var(--color-status-cerrado)" : "var(--color-status-revision)"} bg={r.conciliado ? "var(--status-cerrado-bg)" : "var(--status-revision-bg)"} />
          </td>
        </tr>
      ))}
      </Table>
    </div>
  );
}

function TabSeguro({ seguros, numeroEconomico }: { seguros: Unidad[]; numeroEconomico: string }) {
  if (!seguros.length) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState>Esta unidad no tiene póliza registrada — Módulo F.</EmptyState>
        <div><BotonAgregarSeguro numeroEconomico={numeroEconomico} /></div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <div><BotonAgregarSeguro numeroEconomico={numeroEconomico} /></div>
      {seguros.map((s) => (
        <div key={s.id} className="rounded-xl p-5" style={panelStyle}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                {s.aseguradora} — {s.numeroPoliza}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                Vigencia {fmtFecha(s.fechaInicio)} — {fmtFecha(s.fechaVencimiento)} · {fmtMoney(s.costo)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge label={s.estatus.replace("_", " ")} color={ESTATUS_SEGURO_STYLE[s.estatus]?.color} bg={ESTATUS_SEGURO_STYLE[s.estatus]?.bg} />
              <Link href={`/seguros/${s.id}`} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-primary)" }}>
                Ver / editar →
              </Link>
            </div>
          </div>

          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                {["Cobertura", "Suma asegurada", "Deducible"].map((h) => (
                  <th key={h} className="text-left px-3 py-2" style={labelStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.coberturas.map((c: Unidad) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
                  <td className="px-3 py-2" style={td}>{c.tipoCobertura.replaceAll("_", " ")}</td>
                  <td className="px-3 py-2" style={{ ...td, fontFamily: "var(--font-mono)" }}>{Number(c.sumaAsegurada) > 0 ? fmtMoney(c.sumaAsegurada) : "Amparada"}</td>
                  <td className="px-3 py-2" style={{ ...td, fontFamily: "var(--font-mono)" }}>{Number(c.deducible) > 0 ? fmtMoney(c.deducible) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function TabGps({ posiciones }: { posiciones: Unidad[] }) {
  const [busqueda, setBusqueda] = useState("");
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return posiciones;
    return posiciones.filter((p) => new Date(p.timestamp).toLocaleString("es-MX").toUpperCase().includes(q));
  }, [posiciones, busqueda]);

  if (!posiciones.length)
    return (
      <EmptyState>
        Sin posiciones GPS registradas todavía. Esta pantalla se alimentará de IntelliHub en la Fase 2.
      </EmptyState>
    );
  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar fecha…" />
      <Table headers={["Fecha / hora", "Lat", "Lng", "Velocidad", "Km validado", "Anómalo"]}>
      {filtradas.map((p) => (
        <tr key={p.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
          <td className="px-4 py-3" style={td}>{new Date(p.timestamp).toLocaleString("es-MX")}</td>
          <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{p.lat}</td>
          <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{p.lng}</td>
          <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{p.velocidad ?? "—"}</td>
          <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{p.kmValidado ?? "—"}</td>
          <td className="px-4 py-3">
            {p.esAnomalo ? (
              <Badge label={p.motivoAnomalia ?? "Anómalo"} color="var(--color-status-escena)" bg="var(--status-escena-bg)" />
            ) : (
              "—"
            )}
          </td>
        </tr>
      ))}
      </Table>
    </div>
  );
}

function ResumenChecklistDiario({ puntos }: { puntos: Record<string, string> }) {
  const pares = Object.entries(puntos).filter(([k]) => !k.endsWith("_foto"));
  const conFoto = pares.some(([k]) => puntos[`${k}_foto`]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {pares.map(([k, v]) => (
        <Badge
          key={k}
          label={`${k}: ${v}`}
          color={v === "ok" ? "var(--color-status-cerrado)" : "var(--color-status-revision)"}
          bg={v === "ok" ? "var(--status-cerrado-bg)" : "var(--status-revision-bg)"}
        />
      ))}
      {conFoto && (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>📷</span>
      )}
    </div>
  );
}

function ResumenChecklistSemanal({ respuestas }: { respuestas: Record<string, string> }) {
  const valores = Object.entries(respuestas).filter(
    ([k, v]) => v && !k.endsWith("Url") && !k.startsWith("gen_foto") && !k.startsWith("fotoLicencia")
  );
  const enMalEstado = valores.filter(([, v]) => v === "MAL ESTADO" || v === "MINIMO").length;
  const sede = respuestas.oficinaSede ?? "—";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{sede}</span>
      {enMalEstado > 0 && (
        <Badge
          label={`${enMalEstado} alertas`}
          color="var(--color-status-revision)"
          bg="var(--status-revision-bg)"
        />
      )}
    </div>
  );
}

function ResumenCargaCombustible({ respuestas }: { respuestas: Record<string, string> }) {
  return (
    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
      {respuestas.tipo_combustible ?? "—"}
      {respuestas.zona ? ` · ${respuestas.zona}` : ""}
    </span>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  if (tipo === "SEMANAL")
    return <Badge label="Semanal" color="var(--sidebar-text-active)" bg="var(--chip)" />;
  if (tipo === "CARGA_COMBUSTIBLE")
    return <Badge label="Combustible" color="var(--color-status-revision)" bg="var(--status-revision-bg)" />;
  return <Badge label="Diario" color="var(--color-status-cerrado)" bg="var(--status-cerrado-bg)" />;
}

function TabChecklist({ checklists }: { checklists: Unidad[] }) {
  const [busqueda, setBusqueda] = useState("");
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return checklists;
    return checklists.filter(
      (c) =>
        fmtFecha(c.fecha).toUpperCase().includes(q) ||
        (c.tipo ?? "").toUpperCase().includes(q)
    );
  }, [checklists, busqueda]);

  if (!checklists.length) return <EmptyState>Sin checklists capturados aún.</EmptyState>;

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar por fecha o tipo…" />
      <Table headers={["Fecha", "Tipo", "Resumen", ""]}>
        {filtrados.map((c) => {
          const puntos = (c.puntosInspeccion ?? {}) as Record<string, string>;
          const respuestas = (c.respuestasSemanal ?? {}) as Record<string, string>;
          return (
            <tr key={c.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3 whitespace-nowrap" style={td}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                  {fmtFecha(c.fecha)}
                </span>
                {c.odometro != null && (
                  <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                    {c.odometro.toLocaleString("es-MX")} km
                  </span>
                )}
              </td>
              <td className="px-4 py-3" style={td}>
                <TipoBadge tipo={c.tipo ?? "DIARIO"} />
              </td>
              <td className="px-4 py-3" style={td}>
                {c.tipo === "SEMANAL" ? (
                  <ResumenChecklistSemanal respuestas={respuestas} />
                ) : c.tipo === "CARGA_COMBUSTIBLE" ? (
                  <ResumenCargaCombustible respuestas={respuestas} />
                ) : (
                  <ResumenChecklistDiario puntos={puntos} />
                )}
              </td>
              <td className="px-4 py-3" style={td}>
                <Link
                  href={`/checklist/${c.id}`}
                  className="rounded-md px-3 py-1.5 text-xs font-semibold"
                  style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)" }}
                >
                  Ver detalle
                </Link>
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

function TabAccidentes({ accidentes, numeroEconomico, bloqueada }: { accidentes: Unidad[]; numeroEconomico: string; bloqueada?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          {accidentes.length} accidente(s) registrado(s)
        </span>
        {!bloqueada && <FormAccidente numeroEconomico={numeroEconomico} />}
      </div>
      {accidentes.length === 0 ? (
        <EmptyState>Sin accidentes registrados para esta unidad.</EmptyState>
      ) : (
        <Table headers={["Fecha", "Tipo", "Descripción", "Evidencias"]}>
          {accidentes.map((a: Unidad) => (
            <tr key={a.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3 whitespace-nowrap" style={td}>{fmtFecha(a.fecha)}</td>
              <td className="px-4 py-3 whitespace-nowrap" style={td}>{a.tipo}</td>
              <td className="px-4 py-3" style={td}>{a.descripcion}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2 flex-wrap">
                  {(a.evidencias ?? []).map((url: string, i: number) => (
                    <a key={url} href={blobProxy(url)} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-primary)" }}>
                      Foto {i + 1}
                    </a>
                  ))}
                  {(!a.evidencias || a.evidencias.length === 0) && <span style={{ color: "var(--sidebar-text)" }}>—</span>}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function TabInsumos({
  consumos,
  insumos,
  numeroEconomico,
  bloqueada,
}: {
  consumos: Unidad[];
  insumos: { id: string; nombre: string; unidad: string; existencias: string }[];
  numeroEconomico: string;
  bloqueada?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      {!bloqueada && insumos.length > 0 && (
        <div className="rounded-xl p-5" style={panelStyle}>
          <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Registrar consumo
          </h3>
          <form
            className="flex flex-col gap-3"
            action={(fd) => {
              setOk(false);
              setErrorMsg(null);
              fd.set("numeroEconomico", numeroEconomico);
              startTransition(async () => {
                const res = await registrarConsumo(fd);
                if (res.ok) setOk(true);
                else setErrorMsg(res.error ?? "Error al registrar.");
              });
            }}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label style={labelStyle}>Insumo *</label>
                <select name="insumoId" required style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", height: "var(--h-md)", width: "100%", borderRadius: "var(--radius-md)", padding: "0 12px" }}>
                  <option value="">Selecciona…</option>
                  {insumos.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.nombre} ({Number(ins.existencias)} {ins.unidad} disponibles)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Cantidad *</label>
                <input name="cantidad" type="number" step="0.01" min="0.01" required style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", height: "var(--h-md)", width: "100%", borderRadius: "var(--radius-md)", padding: "0 12px" }} />
              </div>
              <div>
                <label style={labelStyle}>Nota</label>
                <input name="nota" style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", height: "var(--h-md)", width: "100%", borderRadius: "var(--radius-md)", padding: "0 12px" }} />
              </div>
            </div>
            {errorMsg && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{errorMsg}</p>}
            {ok && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-cerrado)" }}>Consumo registrado. Inventario actualizado.</p>}
            <button type="submit" disabled={pending} className="rounded-md px-4 h-9 w-fit font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
              {pending ? "Guardando…" : "Registrar consumo"}
            </button>
          </form>
        </div>
      )}

      {!bloqueada && insumos.length === 0 && (
        <EmptyState>Esta unidad no tiene inventario de insumos asociado. Agrega insumos al proyecto en el Módulo N.</EmptyState>
      )}

      {consumos.length > 0 ? (
        <Table headers={["Fecha", "Insumo", "Cantidad", "Nota"]}>
          {consumos.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3 whitespace-nowrap" style={td}>{fmtFecha(c.fecha)}</td>
              <td className="px-4 py-3" style={td}>{c.insumo?.nombre ?? "—"}</td>
              <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>
                {Number(c.cantidad)} {c.insumo?.unidad ?? ""}
              </td>
              <td className="px-4 py-3" style={td}>{c.nota ?? "—"}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState>Sin consumos de insumos registrados para esta unidad.</EmptyState>
      )}
    </div>
  );
}

function TabHistorico({ historicos }: { historicos: Unidad[] }) {
  if (!historicos.length)
    return (
      <EmptyState>
        <History size={20} className="mx-auto mb-2 opacity-40" />
        Sin bitácora registrada. Se genera automáticamente al reasignar la unidad a un proyecto.
      </EmptyState>
    );
  return (
    <div className="flex flex-col gap-3">
      <Table headers={["Proyecto", "Inicio", "Fin", "Estado"]}>
        {historicos.map((h) => (
          <tr key={h.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
            <td className="px-4 py-3" style={{ ...td, fontWeight: 600 }}>{h.proyecto?.nombre ?? "—"}</td>
            <td className="px-4 py-3 whitespace-nowrap" style={td}>{fmtFecha(h.fechaInicio)}</td>
            <td className="px-4 py-3 whitespace-nowrap" style={td}>{h.fechaFin ? fmtFecha(h.fechaFin) : "—"}</td>
            <td className="px-4 py-3">
              {!h.fechaFin ? (
                <Badge label="Actual" color="var(--color-status-cerrado)" bg="var(--status-cerrado-bg)" />
              ) : (
                <Badge label="Terminado" color="var(--sidebar-text)" bg="var(--field-bg)" />
              )}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function TabSla({ meses }: { meses: SlaMensual[] }) {
  if (!meses.length)
    return (
      <EmptyState>
        <Gauge size={20} className="mx-auto mb-2 opacity-40" />
        Aún no hay historial de disponibilidad para esta unidad.
      </EmptyState>
    );
  return (
    <div className="flex flex-col gap-3">
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
        % de días activa cada mes. El mes en curso está parcial (se corta al día de hoy) — se cierra al terminar el mes.
      </p>
      <Table headers={["Mes", "Días activa", "Días inactiva", "% SLA"]}>
        {meses.map((m, i) => (
          <tr key={`${m.anio}-${m.mes}`} style={{ borderBottom: "1px solid var(--field-border)" }}>
            <td className="px-4 py-3" style={{ ...td, fontWeight: 600 }}>
              {NOMBRE_MES[m.mes - 1]} {m.anio}
              {i === 0 && <span style={{ color: "var(--sidebar-text)", fontWeight: 400 }}> (en curso)</span>}
            </td>
            <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{m.diasActivo}</td>
            <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{m.diasInactivo}</td>
            <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: m.porcentaje !== null && m.porcentaje < 90 ? "var(--priority-alta)" : "var(--field-text)" }}>
              {m.porcentaje !== null ? `${m.porcentaje}%` : "—"}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function TabSiniestros({ siniestros }: { siniestros: Unidad[] }) {
  if (!siniestros.length)
    return (
      <EmptyState>
        <AlertOctagon size={20} className="mx-auto mb-2 opacity-40" />
        Sin siniestros registrados para esta unidad. Los siniestros se gestionan en el Módulo S.
      </EmptyState>
    );
  return (
    <div className="flex flex-col gap-3">
      <Table headers={["Folio", "Fecha", "Tipo", "Descripción", "Estatus"]}>
        {siniestros.map((s) => {
          const style = ESTATUS_SINIESTRO_STYLE[s.estatus] ?? { color: "var(--sidebar-text)", bg: "var(--field-bg)" };
          return (
            <tr key={s.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>{s.folio}</td>
              <td className="px-4 py-3 whitespace-nowrap" style={td}>{fmtFecha(s.fecha)}</td>
              <td className="px-4 py-3 whitespace-nowrap" style={td}>{TIPO_SINIESTRO_LABEL[s.tipo] ?? s.tipo}</td>
              <td className="px-4 py-3" style={td}>{s.descripcion}</td>
              <td className="px-4 py-3">
                <Badge label={s.estatus.replaceAll("_", " ")} color={style.color} bg={style.bg} />
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

function TabOperador({ resguardante }: { resguardante: Unidad }) {
  if (!resguardante) return <EmptyState>Esta unidad no tiene resguardante asignado.</EmptyState>;
  return (
    <div className="rounded-xl p-5" style={panelStyle}>
      <div className="flex items-center gap-4 mb-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--brand-navy)", color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 700 }}>
          {resguardante.nombre.split(" ").slice(0, 2).map((p: string) => p[0]).join("")}
        </div>
        <div>
          <div style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{resguardante.nombre}</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>CURP {resguardante.curp}</div>
        </div>
      </div>

      <h4 className="mb-2" style={labelStyle}>Documentación</h4>
      <div className="flex flex-col gap-2">
        {(resguardante.documentos ?? []).map((d: Unidad) => {
          const dias = diasPara(d.fechaVencimiento);
          const vencido = dias !== null && dias < 0;
          const porVencer = dias !== null && dias >= 0 && dias <= 30;
          return (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-md px-3 py-2" style={{ background: "var(--field-bg)" }}>
              <div className="flex items-center gap-2">
                <FileBadge size={15} color="var(--sidebar-text)" />
                <span style={td}>{d.tipoDocumento.replaceAll("_", " ")}</span>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: vencido ? "var(--color-status-escena)" : porVencer ? "var(--color-status-revision)" : "var(--sidebar-text)" }}>
                {d.fechaVencimiento ? fmtFecha(d.fechaVencimiento) : "Sin vigencia"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
