"use client";

import { Fragment, useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronUp, AlertTriangle, Clock, Trash2, TriangleAlert } from "lucide-react";
import { Table, EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtFecha } from "@/lib/formato";
import { CATEGORIA_GASTO_LABEL, ESTATUS_GASTO_LABEL, ESTATUS_GASTO_STYLE } from "@/lib/categorias-gasto";
import { MarcarRealizadoButton } from "@/components/mantenimiento/marcar-realizado-button";
import { actualizarGasto, eliminarGasto } from "@/app/(app)/mantenimiento/actions";

const HOY = new Date().toISOString().slice(0, 10);

export type GastoRow = {
  id: string;
  fecha: string;
  numeroEconomico: string | null;
  proyectoReportante: { nombre: string } | null;
  categoria: string;
  descripcion: string | null;
  costo: string;
  estatus: string;
  proveedor: string | null;
  servicio: string | null;
  empresa: string | null;
  sc: string | null;
  odc: string | null;
  entradaSap: string | null;
  fechaRequisicion: string | null;
  fechaOdc: string | null;
  fechaFactura: string | null;
  fechaCxp: string | null;
  fechaPago: string | null;
  kmAlMomento: number | null;
  fechaIngresoTaller: string | null;
  fechaEstimadaSalida: string | null;
};

function coincide(g: GastoRow, q: string) {
  return (
    (g.numeroEconomico ?? "").toUpperCase().includes(q) ||
    (g.proyectoReportante?.nombre ?? "").toUpperCase().includes(q) ||
    CATEGORIA_GASTO_LABEL[g.categoria]?.toUpperCase().includes(q)
  );
}

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-sm)",
  height: 36,
  width: "100%",
  borderRadius: "var(--radius-md)",
  padding: "0 10px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 4,
};

function soloFecha(v: string | null) {
  return v ? v.slice(0, 10) : "";
}

function TimerTaller({ ingreso, estimada }: { ingreso: string | null; estimada: string | null }) {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!ingreso) return null;
  const desde = new Date(ingreso);
  const diasEnTaller = Math.floor((ahora.getTime() - desde.getTime()) / 86_400_000);
  const vencida = estimada ? ahora > new Date(estimada) : false;

  return (
    <div
      className="flex items-center gap-2 rounded-md px-3 py-2"
      style={{ background: vencida ? "var(--status-escena-bg, #fef2f2)" : "var(--chip)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
    >
      {vencida ? (
        <AlertTriangle size={14} color="var(--color-status-escena, #ef4444)" />
      ) : (
        <Clock size={14} color="var(--sidebar-text)" />
      )}
      <span style={{ color: vencida ? "var(--color-status-escena, #ef4444)" : "var(--field-text)", fontWeight: vencida ? 600 : 400 }}>
        {diasEnTaller === 0 ? "Entró hoy" : `${diasEnTaller} día${diasEnTaller !== 1 ? "s" : ""} en taller`}
        {vencida && " — VENCIDA"}
      </span>
    </div>
  );
}

function VerOrdenButton({ abierto, onClick }: { abierto: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-md px-2.5 py-1"
      style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
    >
      {abierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Ver orden
    </button>
  );
}

function OrdenDetalle({ g, isAdmin }: { g: GastoRow; isAdmin: boolean }) {
  const [editando, setEditando] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!editando) {
    return (
      <div className="flex flex-col gap-3">
        {g.fechaIngresoTaller && (
          <div className="flex items-center gap-3 flex-wrap">
            <TimerTaller ingreso={g.fechaIngresoTaller} estimada={g.fechaEstimadaSalida} />
            <Detalle label="Ingreso taller" value={fmtFecha(g.fechaIngresoTaller)} />
            <Detalle label="Salida estimada" value={g.fechaEstimadaSalida ? fmtFecha(g.fechaEstimadaSalida) : null} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Detalle label="Proveedor" value={g.proveedor} />
          <Detalle label="Servicio" value={g.servicio} />
          <Detalle label="Empresa" value={g.empresa} />
          <Detalle label="Km al momento" value={g.kmAlMomento?.toString() ?? null} />
          <Detalle label="SC" value={g.sc} />
          <Detalle label="ODC" value={g.odc} />
          <Detalle label="Entrada SAP" value={g.entradaSap} />
          <Detalle label="Fecha requisición" value={g.fechaRequisicion ? fmtFecha(g.fechaRequisicion) : null} />
          <Detalle label="Fecha ODC" value={g.fechaOdc ? fmtFecha(g.fechaOdc) : null} />
          <Detalle label="Fecha factura" value={g.fechaFactura ? fmtFecha(g.fechaFactura) : null} />
          <Detalle label="Fecha CXP" value={g.fechaCxp ? fmtFecha(g.fechaCxp) : null} />
          <Detalle label="Fecha de pago" value={g.fechaPago ? fmtFecha(g.fechaPago) : null} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setEditando(true)}
            className="rounded-md px-3 h-9 w-fit"
            style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
          >
            Editar orden
          </button>
          {isAdmin && <EliminarGasto id={g.id} />}
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) => {
        startTransition(async () => {
          await actualizarGasto(formData);
          setEditando(false);
        });
      }}
    >
      <input type="hidden" name="id" value={g.id} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label style={labelStyle}>Descripción</label>
          <input name="descripcion" defaultValue={g.descripcion ?? ""} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Costo *</label>
          <input name="costo" type="number" step="0.01" required defaultValue={g.costo} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <label style={labelStyle}>Estatus *</label>
          <select name="estatus" required defaultValue={g.estatus} style={fieldStyle}>
            {Object.entries(ESTATUS_GASTO_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Proveedor</label>
          <input name="proveedor" defaultValue={g.proveedor ?? ""} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Servicio</label>
          <input name="servicio" defaultValue={g.servicio ?? ""} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Empresa</label>
          <input name="empresa" defaultValue={g.empresa ?? ""} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>SC</label>
          <input name="sc" defaultValue={g.sc ?? ""} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>ODC</label>
          <input name="odc" defaultValue={g.odc ?? ""} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Entrada SAP</label>
          <input name="entradaSap" defaultValue={g.entradaSap ?? ""} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Fecha requisición</label>
          <input name="fechaRequisicion" type="date" max={HOY} defaultValue={soloFecha(g.fechaRequisicion)} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Fecha ODC</label>
          <input name="fechaOdc" type="date" max={HOY} defaultValue={soloFecha(g.fechaOdc)} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Fecha factura</label>
          <input name="fechaFactura" type="date" max={HOY} defaultValue={soloFecha(g.fechaFactura)} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Fecha CXP</label>
          <input name="fechaCxp" type="date" max={HOY} defaultValue={soloFecha(g.fechaCxp)} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Fecha de pago</label>
          <input name="fechaPago" type="date" max={HOY} defaultValue={soloFecha(g.fechaPago)} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Ingreso taller</label>
          <input name="fechaIngresoTaller" type="date" max={HOY} defaultValue={soloFecha(g.fechaIngresoTaller)} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Salida estimada taller</label>
          <input name="fechaEstimadaSalida" type="date" defaultValue={soloFecha(g.fechaEstimadaSalida)} style={fieldStyle} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="rounded-md px-3 h-9 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        <button type="button" onClick={() => setEditando(false)} className="rounded-md px-3 h-9" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function EliminarGasto({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleEliminar(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await eliminarGasto(formData);
      if (res.ok) {
        setConfirmando(false);
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo eliminar.");
      }
    });
  }

  if (!confirmando) {
    return (
      <button
        onClick={() => setConfirmando(true)}
        className="flex items-center gap-1.5 rounded-md px-3 h-9 w-fit"
        style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
      >
        <Trash2 size={13} /> Eliminar orden
      </button>
    );
  }

  return (
    <form
      action={handleEliminar}
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: "var(--status-escena-bg)" }}
    >
      <input type="hidden" name="id" value={id} />
      <div className="flex items-start gap-2">
        <TriangleAlert size={16} color="var(--color-status-escena)" className="shrink-0 mt-0.5" />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>
          Esta acción no se puede deshacer. Escribe la razón por la que se elimina esta orden — quedará registrada en el historial.
        </span>
      </div>
      <div>
        <label style={labelStyle}>Razón de la eliminación *</label>
        <textarea name="motivo" required minLength={5} rows={2} style={{ ...fieldStyle, height: "auto", padding: "8px 10px" }} />
      </div>
      {error && <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</span>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="rounded-md px-3 h-8 font-semibold disabled:opacity-60" style={{ background: "var(--color-status-escena)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
          {pending ? "Eliminando…" : "Sí, eliminar"}
        </button>
        <button type="button" onClick={() => setConfirmando(false)} className="rounded-md px-3 h-8" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Detalle({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{value ?? "—"}</div>
    </div>
  );
}

export function PendientesLista({ pendientes, isAdmin = false }: { pendientes: GastoRow[]; isAdmin?: boolean }) {
  const [busqueda, setBusqueda] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const ahora = useMemo(() => new Date(), []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return pendientes;
    return pendientes.filter((g) => coincide(g, q));
  }, [pendientes, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar unidad o categoría…" />
      {filtrados.length === 0 ? (
        <EmptyState>Sin órdenes que coincidan.</EmptyState>
      ) : (
        <Table headers={["Fecha", "Unidad", "Categoría", "Descripción", "Costo", ""]} minWidth={760}>
          {filtrados.map((g) => (
            <Fragment key={g.id}>
              <tr style={{ borderBottom: expandido === g.id ? "none" : "1px solid var(--field-border)" }}>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: new Date(g.fecha) < ahora ? "var(--color-status-escena)" : "var(--field-text)" }}>
                  {fmtFecha(g.fecha)}
                </td>
                <td className="px-4 py-3">
                  {g.numeroEconomico ? (
                    <Link href={`/unidades/${g.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                      {g.numeroEconomico}
                    </Link>
                  ) : (
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>{g.proyectoReportante?.nombre ?? "—"}</span>
                  )}
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{CATEGORIA_GASTO_LABEL[g.categoria]}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{g.descripcion ?? "—"}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtMoney(g.costo)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <VerOrdenButton abierto={expandido === g.id} onClick={() => setExpandido((e) => (e === g.id ? null : g.id))} />
                    <MarcarRealizadoButton id={g.id} />
                  </div>
                </td>
              </tr>
              {expandido === g.id && (
                <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                  <td colSpan={6} className="px-4 py-4" style={{ background: "var(--field-bg)" }}>
                    <OrdenDetalle g={g} isAdmin={isAdmin} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </Table>
      )}
    </div>
  );
}

export function HistorialLista({ historial, isAdmin = false }: { historial: GastoRow[]; isAdmin?: boolean }) {
  const [busqueda, setBusqueda] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return historial;
    return historial.filter((g) => coincide(g, q));
  }, [historial, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar unidad o categoría…" />
      {filtrados.length === 0 ? (
        <EmptyState>Sin gastos que coincidan.</EmptyState>
      ) : (
        <Table headers={["Fecha", "Unidad", "Categoría", "Costo", "Estatus", ""]} minWidth={720}>
          {filtrados.map((g) => (
            <Fragment key={g.id}>
              <tr style={{ borderBottom: expandido === g.id ? "none" : "1px solid var(--field-border)" }}>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFecha(g.fecha)}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{g.numeroEconomico ?? g.proyectoReportante?.nombre ?? "—"}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{CATEGORIA_GASTO_LABEL[g.categoria]}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtMoney(g.costo)}</td>
                <td className="px-4 py-3">
                  <Badge label={ESTATUS_GASTO_LABEL[g.estatus]} color={ESTATUS_GASTO_STYLE[g.estatus]?.color} bg={ESTATUS_GASTO_STYLE[g.estatus]?.bg} />
                </td>
                <td className="px-4 py-3">
                  <VerOrdenButton abierto={expandido === g.id} onClick={() => setExpandido((e) => (e === g.id ? null : g.id))} />
                </td>
              </tr>
              {expandido === g.id && (
                <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                  <td colSpan={6} className="px-4 py-4" style={{ background: "var(--field-bg)" }}>
                    <OrdenDetalle g={g} isAdmin={isAdmin} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </Table>
      )}
    </div>
  );
}
