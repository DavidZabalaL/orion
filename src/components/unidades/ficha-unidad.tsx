"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ESTATUS_UNIDAD_LABEL,
  ESTATUS_UNIDAD_STYLE,
  ESTATUS_SEGURO_STYLE,
  TIPO_VEHICULO_LABEL,
} from "@/lib/estatus";
import { fmtMoney, fmtFecha, diasPara } from "@/lib/formato";
import { actualizarCapacidadTanque } from "@/app/(app)/unidades/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Unidad = any;

const TABS = [
  { id: "general", label: "Datos generales" },
  { id: "mantenimiento", label: "Mantenimiento" },
  { id: "combustible", label: "Combustible" },
  { id: "tag", label: "TAG" },
  { id: "seguro", label: "Seguro" },
  { id: "gps", label: "GPS" },
  { id: "checklist", label: "Checklist" },
  { id: "operador", label: "Operador" },
] as const;

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

export function FichaUnidad({ unidad, puedeEditarCapacidad }: { unidad: Unidad; puedeEditarCapacidad: boolean }) {
  const [tab, setTab] = useState<TabId>("general");

  const seguroVigente = unidad.seguros?.[0];
  const diasSeguro = diasPara(seguroVigente?.fechaVencimiento);
  const proximoMantenimiento = unidad.gastos?.find((g: Unidad) => g.estatus === "PROGRAMADO");

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
                <Badge
                  label={ESTATUS_UNIDAD_LABEL[unidad.estatus] ?? unidad.estatus}
                  color={ESTATUS_UNIDAD_STYLE[unidad.estatus]?.color}
                  bg={ESTATUS_UNIDAD_STYLE[unidad.estatus]?.bg}
                />
              </div>
              <div className="mt-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
                {unidad.marca} {unidad.unidadModelo} · {unidad.anio} · {TIPO_VEHICULO_LABEL[unidad.tipoVehiculo]} · Placas{" "}
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--field-text)" }}>{unidad.placas}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button className="flex items-center gap-2 rounded-md px-3 h-9" style={{ ...panelStyle, color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
              <Printer size={15} /> Imprimir
            </button>
            <button className="flex items-center gap-2 rounded-md px-3 h-9" style={{ ...panelStyle, color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
              <ArrowLeftRight size={15} /> Reasignar proyecto
            </button>
            <button className="flex items-center gap-2 rounded-md px-3 h-9" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
              <Pencil size={15} /> Editar
            </button>
            {unidad.estatus !== "BAJA" && (
              <Link
                href={`/unidades/${unidad.numeroEconomico}/baja`}
                className="flex items-center gap-2 rounded-md px-3 h-9"
                style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
              >
                <Ban size={15} /> Dar de baja
              </Link>
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
        <Kpi icon={CalendarClock} label="Días sin operar" value={String(unidad.diasSinOperar)} sub={unidad.disponibilidad ? "Disponible" : "No disponible"} alert={unidad.diasSinOperar > 2} />
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 overflow-x-auto border-b" style={{ borderColor: "var(--field-border)" }}>
          {TABS.map((t) => (
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
          {tab === "general" && <TabGeneral unidad={unidad} puedeEditarCapacidad={puedeEditarCapacidad} />}
          {tab === "mantenimiento" && <TabMantenimiento gastos={unidad.gastos ?? []} />}
          {tab === "combustible" && <TabCombustible registros={unidad.combustible ?? []} />}
          {tab === "tag" && <TabTag registros={unidad.tags ?? []} />}
          {tab === "seguro" && <TabSeguro seguros={unidad.seguros ?? []} />}
          {tab === "gps" && <TabGps posiciones={unidad.posicionesGps ?? []} />}
          {tab === "checklist" && <TabChecklist checklists={unidad.checklists ?? []} />}
          {tab === "operador" && <TabOperador resguardante={unidad.resguardante} />}
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

function TabGeneral({ unidad, puedeEditarCapacidad }: { unidad: Unidad; puedeEditarCapacidad: boolean }) {
  return (
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
          <Field label="Estado de operación" value={unidad.estadoOperacion} />
          <Field
            label="Estatus"
            value={<Badge label={ESTATUS_UNIDAD_LABEL[unidad.estatus]} color={ESTATUS_UNIDAD_STYLE[unidad.estatus]?.color} bg={ESTATUS_UNIDAD_STYLE[unidad.estatus]?.bg} />}
          />
          <Field label="Resguardante" value={unidad.resguardante ? <Link href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--color-primary)" }}>{unidad.resguardante.nombre}</Link> : "Sin asignar"} />
          <Field label="Propietario" value={unidad.propietario} />
          <Field label="Origen de placa" value={unidad.origenPlaca} />
          <Field label="Tag IAVE" value={unidad.tagIave ?? "—"} />
          <Field label="Fecha de alta" value={fmtFecha(unidad.fechaAlta)} />
        </div>
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

function TabMantenimiento({ gastos }: { gastos: Unidad[] }) {
  if (!gastos.length) return <EmptyState>Sin gastos vehiculares registrados.</EmptyState>;
  return (
    <Table headers={["Fecha", "Categoría", "Descripción", "Costo", "Km", "Estatus"]}>
      {gastos.map((g) => (
        <tr key={g.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
          <td className="px-4 py-3" style={td}>{fmtFecha(g.fecha)}</td>
          <td className="px-4 py-3" style={td}>{g.categoria.replaceAll("_", " ")}</td>
          <td className="px-4 py-3" style={td}>{g.descripcion ?? "—"}</td>
          <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{fmtMoney(g.costo)}</td>
          <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{g.kmAlMomento ?? "—"}</td>
          <td className="px-4 py-3" style={td}>{g.estatus}</td>
        </tr>
      ))}
    </Table>
  );
}

function TabCombustible({ registros }: { registros: Unidad[] }) {
  if (!registros.length) return <EmptyState>Sin cargas de combustible registradas.</EmptyState>;
  return (
    <Table headers={["Fecha", "Litros", "Costo", "Km", "Estación", "Rendimiento", ""]}>
      {registros.map((r) => (
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
  );
}

function TabTag({ registros }: { registros: Unidad[] }) {
  if (!registros.length) return <EmptyState>Sin transacciones de TAG registradas.</EmptyState>;
  return (
    <Table headers={["Fecha", "Caseta", "Monto", "Proveedor", "Conciliado"]}>
      {registros.map((r) => (
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
  );
}

function TabSeguro({ seguros }: { seguros: Unidad[] }) {
  if (!seguros.length) return <EmptyState>Esta unidad no tiene póliza registrada — Módulo F.</EmptyState>;
  return (
    <div className="flex flex-col gap-5">
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
            <Badge label={s.estatus.replace("_", " ")} color={ESTATUS_SEGURO_STYLE[s.estatus]?.color} bg={ESTATUS_SEGURO_STYLE[s.estatus]?.bg} />
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
  if (!posiciones.length)
    return (
      <EmptyState>
        Sin posiciones GPS registradas todavía. Esta pantalla se alimentará de IntelliHub en la Fase 2.
      </EmptyState>
    );
  return (
    <Table headers={["Fecha / hora", "Lat", "Lng", "Velocidad", "Km validado", "Anómalo"]}>
      {posiciones.map((p) => (
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
  );
}

function TabChecklist({ checklists }: { checklists: Unidad[] }) {
  if (!checklists.length) return <EmptyState>Sin checklists capturados aún.</EmptyState>;
  return (
    <Table headers={["Fecha", "Odómetro", "Puntos de inspección"]}>
      {checklists.map((c) => (
        <tr key={c.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
          <td className="px-4 py-3" style={td}>{fmtFecha(c.fecha)}</td>
          <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{c.odometro} km</td>
          <td className="px-4 py-3" style={td}>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(c.puntosInspeccion ?? {}).map(([k, v]) => (
                <Badge
                  key={k}
                  label={`${k}: ${v}`}
                  color={v === "ok" ? "var(--color-status-cerrado)" : "var(--color-status-revision)"}
                  bg={v === "ok" ? "var(--status-cerrado-bg)" : "var(--status-revision-bg)"}
                />
              ))}
            </div>
          </td>
        </tr>
      ))}
    </Table>
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
