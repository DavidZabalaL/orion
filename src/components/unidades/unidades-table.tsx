"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Download, Plus, ChevronRight, Eye, EyeOff, Columns3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ESTATUS_UNIDAD_LABEL,
  TIPO_VEHICULO_LABEL,
  estatusVisibleUnidad,
} from "@/lib/estatus";
import { fmtFecha, fmtMoney } from "@/lib/formato";
import { labelFuenteActividad, type FuenteActividad } from "@/lib/actividad-unidad";
import { ToggleDisponibilidad } from "@/components/unidades/toggle-disponibilidad";
import { alternarOcultarSlaDisponibilidad } from "@/app/(app)/unidades/actions";
import { LABEL_MOTIVO } from "@/lib/reportes/estatus-flota-labels";
import { exportarExcel } from "@/lib/exportar-excel";
import type { MotivoIndisponibilidad } from "@/generated/prisma/enums";

export type UnidadRow = {
  numeroEconomico: string;
  placas: string;
  tipoVehiculo: string;
  marca: string;
  unidadModelo: string;
  proyecto: string | null;
  estatus: string;
  disponibilidad: boolean;
  diasSinOperar: number;
  origenDiasSinOperar: "apagada" | "actividad" | "sin_datos";
  fuenteActividad: FuenteActividad | null;
  resguardante: string | null;
  ultimoMantenimiento: string | null;
  proximoMantenimiento: string | null;
  semaforo: "verde" | "amarillo" | "rojo";
  /** % de días activa en el mes en curso, hasta hoy (null = aún sin historial). Ver src/lib/sla-disponibilidad.ts. */
  slaPorcentaje: number | null;
  /** Motivo del periodo de indisponibilidad actualmente abierto (HistoricoDisponibilidadUnidad) — null si está disponible o si nunca se registró un motivo. */
  motivoIndisponibilidad: MotivoIndisponibilidad | null;
  motivoIndisponibilidadDetalle: string | null;
  numeroSerie: string;
  anio: number;
  tipoCombustible: string;
  capacidadTanqueLitros: number | null;
  rendimientoFicha: number | null;
  kmOficial: number;
  /** Año en curso (hora MX), mismo cálculo que la ficha y el comparativo — ver src/lib/gasto-unidad.ts. */
  rendimientoRealAnio: number | null;
  gastoAnio: number;
  /** Km al inicio del año en curso (KmBaseAnual) y su fecha; null = sin base. Fecha posterior a enero = sin lectura en enero. */
  kmBaseAnio: number | null;
  fechaBaseAnio: string | null;
  /** Km oficial − base del año. */
  kmRecorridosAnio: number | null;
};

type ColumnaExtra = { id: string; label: string; valor: (r: UnidadRow) => string | number | null; sufijo?: string; moneda?: boolean };

/** Columnas opcionales del selector "Columnas" — ocultas por defecto; la elección se recuerda en este navegador. */
const COLUMNAS_EXTRA: ColumnaExtra[] = [
  { id: "kmOficial", label: "Km oficial", valor: (r) => r.kmOficial, sufijo: " km" },
  { id: "numeroSerie", label: "N° de serie", valor: (r) => r.numeroSerie },
  { id: "anio", label: "Año", valor: (r) => String(r.anio) },
  { id: "tipoCombustible", label: "Combustible", valor: (r) => r.tipoCombustible },
  { id: "capacidadTanque", label: "Tanque", valor: (r) => r.capacidadTanqueLitros, sufijo: " L" },
  { id: "rendimientoFicha", label: "Rend. ficha", valor: (r) => r.rendimientoFicha, sufijo: " km/L" },
  { id: "rendimientoReal", label: "Rend. real (año)", valor: (r) => r.rendimientoRealAnio, sufijo: " km/L" },
  { id: "gastoAnio", label: "Gasto (año)", valor: (r) => r.gastoAnio, moneda: true },
  { id: "kmBaseAnio", label: "Km al 1-ene", valor: (r) => r.kmBaseAnio, sufijo: " km" },
  // La base de una unidad sin lectura en enero es su primera lectura posterior: se avisa (mes en hora MX, UTC-6).
  { id: "fechaBaseAnio", label: "Fecha de la base", valor: (r) => (r.fechaBaseAnio ? fmtFecha(r.fechaBaseAnio) + (new Date(Date.parse(r.fechaBaseAnio) - 6 * 3_600_000).getUTCMonth() > 0 ? " (sin dato en enero)" : "") : null) },
  { id: "kmRecorridosAnio", label: "Km recorridos (año)", valor: (r) => r.kmRecorridosAnio, sufijo: " km" },
];
const CLAVE_COLUMNAS = "inventario-unidades:columnas";

function textoColumna(c: ColumnaExtra, r: UnidadRow): string {
  const v = c.valor(r);
  if (v == null) return "—";
  if (c.moneda) return fmtMoney(v);
  return typeof v === "number" ? `${v.toLocaleString("es-MX")}${c.sufijo ?? ""}` : v;
}

function motivoTexto(r: UnidadRow): string {
  if (r.disponibilidad) return "—";
  if (r.motivoIndisponibilidad) return LABEL_MOTIVO[r.motivoIndisponibilidad] + (r.motivoIndisponibilidadDetalle ? ` — ${r.motivoIndisponibilidadDetalle}` : "");
  return "Sin motivo registrado";
}

const SEMAFORO_COLOR: Record<string, string> = {
  verde: "#22c55e",
  amarillo: "#f59e0b",
  rojo: "#ef4444",
};

const SEMAFORO_LABEL: Record<string, string> = {
  verde: "Disponible / Óptimas condiciones",
  amarillo: "Requiere atención (doc. faltante, póliza por vencer, sin operar)",
  rojo: "Parada por daño, baja, mantenimiento o inactiva",
};

function exportarExcelUnidades(rows: UnidadRow[], incluirSla: boolean, extras: ColumnaExtra[]) {
  const headers = [
    "N° económico", "Placas", "Tipo", "Marca", "Unidad", "Proyecto", "Estatus", "Disponible", "Motivo", "Días sin operar",
    ...(incluirSla ? ["SLA disponibilidad mes en curso (%)"] : []),
    "Resguardante", "Último mantenimiento", "Próximo mantenimiento",
    ...extras.map((c) => c.label + (c.sufijo ? ` (${c.sufijo.trim()})` : "")),
  ];
  const filas = rows.map((r) => [
    r.numeroEconomico,
    r.placas,
    TIPO_VEHICULO_LABEL[r.tipoVehiculo] ?? r.tipoVehiculo,
    r.marca,
    r.unidadModelo,
    r.proyecto ?? "",
    estatusVisibleUnidad(r.estatus, r.disponibilidad).label,
    r.disponibilidad ? "Sí" : "No",
    motivoTexto(r),
    String(r.diasSinOperar),
    ...(incluirSla ? [r.slaPorcentaje !== null ? String(r.slaPorcentaje) : ""] : []),
    r.resguardante ?? "",
    fmtFecha(r.ultimoMantenimiento),
    fmtFecha(r.proximoMantenimiento),
    ...extras.map((c) => c.valor(r) ?? ""),
  ]);
  exportarExcel("inventario-unidades", [{ nombre: "Unidades", headers, filas }]);
}

const selectStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
};

export function UnidadesTable({
  rows: rowsIniciales,
  puedeVerSla = false,
  slaOcultoInicial = false,
}: {
  rows: UnidadRow[];
  /** Su rol tiene el permiso especial "verSlaDisponibilidad" (ver src/lib/permisos.ts) — controla si existe la columna y su control de mostrar/ocultar. */
  puedeVerSla?: boolean;
  /** Preferencia personal guardada: el propio usuario decidió ocultarla para sí mismo aunque tenga permiso. */
  slaOcultoInicial?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(rowsIniciales);
  // Sincroniza `rows` cuando el servidor manda datos nuevos (router.refresh()
  // del intervalo de abajo, o una recarga de la página) sin perder los
  // cambios optimistas locales de alCambiarDisponibilidad entre medio —
  // ajuste de estado durante el render (patrón oficial de React), no un
  // efecto, para no disparar un re-render extra de cascada.
  const [rowsInicialesAnterior, setRowsInicialesAnterior] = useState(rowsIniciales);
  if (rowsIniciales !== rowsInicialesAnterior) {
    setRowsInicialesAnterior(rowsIniciales);
    setRows(rowsIniciales);
  }
  const [slaOculto, setSlaOculto] = useState(slaOcultoInicial);
  const mostrarColumnaSla = puedeVerSla && !slaOculto;

  function alternarSla() {
    const nuevo = !slaOculto;
    setSlaOculto(nuevo);
    alternarOcultarSlaDisponibilidad(nuevo);
  }
  const [columnasVisibles, setColumnasVisibles] = useState<string[]>([]);
  useEffect(() => {
    // Se lee tras montar (localStorage no existe en el servidor); sin almacenamiento quedan ocultas.
    try {
      const guardadas = JSON.parse(localStorage.getItem(CLAVE_COLUMNAS) ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(guardadas)) setColumnasVisibles(guardadas.filter((id) => typeof id === "string"));
    } catch {
      // Valor corrupto: se ignora.
    }
  }, []);
  function alternarColumna(id: string) {
    const nuevas = columnasVisibles.includes(id) ? columnasVisibles.filter((c) => c !== id) : [...columnasVisibles, id];
    setColumnasVisibles(nuevas);
    try {
      localStorage.setItem(CLAVE_COLUMNAS, JSON.stringify(nuevas));
    } catch {
      // Sin almacenamiento (modo privado, bloqueado): vale solo para esta pestaña.
    }
  }
  const extras = COLUMNAS_EXTRA.filter((c) => columnasVisibles.includes(c.id));

  const [busqueda, setBusqueda] = useState("");
  const [proyectoFiltro, setProyectoFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [estatusFiltro, setEstatusFiltro] = useState("");
  const [semaforoFiltro, setSemaforoFiltro] = useState("");

  // Antes cada 60s — con muchas pestañas abiertas en background eso mantenía
  // la base de datos activa casi sin descanso (ver cuota de cómputo de Neon).
  // 5 minutos sigue siendo razonable para una vista de inventario, no es un
  // tablero en tiempo real.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 300_000);
    return () => clearInterval(id);
  }, [router]);

  // Al encender/apagar desde esta tabla, "días sin operar" arranca en 0 —
  // acaba de cambiar en este instante — sin esperar a recargar la página.
  function alCambiarDisponibilidad(numeroEconomico: string, nuevoDisponible: boolean, motivo?: string | null, motivoDetalle?: string | null) {
    setRows((prev) =>
      prev.map((r) =>
        r.numeroEconomico === numeroEconomico
          ? {
              ...r,
              disponibilidad: nuevoDisponible,
              diasSinOperar: 0,
              origenDiasSinOperar: nuevoDisponible ? r.origenDiasSinOperar : "apagada",
              motivoIndisponibilidad: (motivo ?? null) as UnidadRow["motivoIndisponibilidad"],
              motivoIndisponibilidadDetalle: motivoDetalle ?? null,
            }
          : r
      )
    );
  }

  // Opciones del selector de proyecto: derivadas de lo que llega en `rows`, así
  // que si los chips de arriba ya acotaron por proyecto, este select solo
  // ofrece esas opciones — ambos filtros conviven sin contradecirse.
  const proyectos = useMemo(
    () => Array.from(new Set(rows.map((r) => r.proyecto).filter(Boolean))) as string[],
    [rows]
  );

  // Si el proyecto elegido ya no está entre las opciones disponibles (los
  // chips de arriba acotaron a otro proyecto), se limpia el filtro — mismo
  // ajuste de estado durante el render que `rows` arriba.
  const [proyectosAnterior, setProyectosAnterior] = useState(proyectos);
  if (proyectos !== proyectosAnterior) {
    setProyectosAnterior(proyectos);
    if (proyectoFiltro && !proyectos.includes(proyectoFiltro)) setProyectoFiltro("");
  }

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return rows.filter((r) => {
      if (q && !r.numeroEconomico.toUpperCase().includes(q) && !r.placas.toUpperCase().includes(q) && !(r.resguardante ?? "").toUpperCase().includes(q)) return false;
      if (proyectoFiltro && r.proyecto !== proyectoFiltro) return false;
      if (tipoFiltro && r.tipoVehiculo !== tipoFiltro) return false;
      if (estatusFiltro && r.estatus !== estatusFiltro) return false;
      if (semaforoFiltro && r.semaforo !== semaforoFiltro) return false;
      return true;
    });
  }, [rows, busqueda, proyectoFiltro, tipoFiltro, estatusFiltro, semaforoFiltro]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-2 rounded-md px-3 flex-1 min-w-[220px] max-w-sm"
            style={selectStyle}
          >
            <Search size={15} color="var(--sidebar-text)" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar económico, placa, resguardante…"
              className="bg-transparent outline-none flex-1 min-w-0"
            />
          </div>

          <select value={proyectoFiltro} onChange={(e) => setProyectoFiltro(e.target.value)} className="rounded-md px-3" style={selectStyle}>
            <option value="">Todos los proyectos</option>
            {proyectos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="rounded-md px-3" style={selectStyle}>
            <option value="">Todos los tipos</option>
            {Object.entries(TIPO_VEHICULO_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select value={estatusFiltro} onChange={(e) => setEstatusFiltro(e.target.value)} className="rounded-md px-3" style={selectStyle}>
            <option value="">Todos los estatus</option>
            {Object.entries(ESTATUS_UNIDAD_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select value={semaforoFiltro} onChange={(e) => setSemaforoFiltro(e.target.value)} className="rounded-md px-3" style={selectStyle}>
            <option value="">🚦 Todos</option>
            <option value="verde">🟢 Disponibles</option>
            <option value="amarillo">🟡 Requieren atención</option>
            <option value="rojo">🔴 Inactivas / Baja</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {puedeVerSla && (
            <button
              onClick={alternarSla}
              className="flex items-center gap-2 rounded-md px-3"
              style={{ ...selectStyle, color: "var(--sidebar-text-active)" }}
              title={slaOculto ? "Solo tú la tienes oculta — tu rol sí tiene permiso para verla" : "Ocultar la columna de SLA solo para tu usuario"}
            >
              {slaOculto ? <EyeOff size={15} /> : <Eye size={15} />}
              <span style={{ fontSize: "var(--text-base)" }}>{slaOculto ? "Mostrar SLA" : "Ocultar SLA"}</span>
            </button>
          )}
          <details className="relative">
            <summary className="flex items-center gap-2 rounded-md px-3 cursor-pointer list-none" style={{ ...selectStyle, color: "var(--sidebar-text-active)" }}>
              <Columns3 size={15} />
              <span style={{ fontSize: "var(--text-base)" }}>Columnas{extras.length > 0 ? ` (${extras.length})` : ""}</span>
            </summary>
            <div className="absolute right-0 z-20 mt-1 flex w-56 flex-col gap-1 rounded-md p-2" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-md)", border: "1px solid var(--field-border)" }}>
              {COLUMNAS_EXTRA.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1 cursor-pointer" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                  <input type="checkbox" checked={columnasVisibles.includes(c.id)} onChange={() => alternarColumna(c.id)} />
                  {c.label}
                </label>
              ))}
            </div>
          </details>
          <button
            onClick={() => exportarExcelUnidades(filtradas, mostrarColumnaSla, extras)}
            className="flex items-center gap-2 rounded-md px-3"
            style={{ ...selectStyle, color: "var(--sidebar-text-active)" }}
          >
            <Download size={15} />
            <span style={{ fontSize: "var(--text-base)" }}>Exportar</span>
          </button>
          <Link
            href="/altas-bajas/nueva"
            className="flex items-center gap-2 rounded-md px-3 font-semibold"
            style={{ background: "var(--color-primary)", color: "#fff", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            <Plus size={15} />
            Dar de alta
          </Link>
        </div>
      </div>

      <div
        className="overflow-x-auto rounded-xl"
        style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      >
        <table className="w-full min-w-[1140px] border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
              {[
                "", "N° económico", "Placas", "Tipo", "Marca / Unidad", "Proyecto", "Estatus", "Disp.", "Motivo", "Días s/operar",
                ...(mostrarColumnaSla ? ["SLA disp. (mes)"] : []),
                "Resguardante", "Último manto.", "Próx. manto.",
                ...extras.map((c) => c.label),
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 whitespace-nowrap"
                  style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.map((r) => (
              <tr
                key={r.numeroEconomico}
                className="transition-colors"
                style={{ borderBottom: "1px solid var(--field-border)" }}
              >
                <td className="px-3 py-3">
                  <div
                    title={SEMAFORO_LABEL[r.semaforo]}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: SEMAFORO_COLOR[r.semaforo],
                      flexShrink: 0,
                    }}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/unidades/${r.numeroEconomico}`}
                    style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}
                  >
                    {r.numeroEconomico}
                  </Link>
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
                  {r.placas}
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
                  {TIPO_VEHICULO_LABEL[r.tipoVehiculo] ?? r.tipoVehiculo}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
                  {r.marca} {r.unidadModelo}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
                  {r.proyecto ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    label={estatusVisibleUnidad(r.estatus, r.disponibilidad).label}
                    color={estatusVisibleUnidad(r.estatus, r.disponibilidad).color}
                    bg={estatusVisibleUnidad(r.estatus, r.disponibilidad).bg}
                  />
                </td>
                <td className="px-4 py-3">
                  <ToggleDisponibilidad
                    numeroEconomico={r.numeroEconomico}
                    disponible={r.disponibilidad}
                    onCambio={(nuevo, motivo, motivoDetalle) => alCambiarDisponibilidad(r.numeroEconomico, nuevo, motivo, motivoDetalle)}
                    onMotivoActualizado={(motivo, motivoDetalle) =>
                      setRows((prev) =>
                        prev.map((row) =>
                          row.numeroEconomico === r.numeroEconomico
                            ? { ...row, motivoIndisponibilidad: (motivo ?? null) as UnidadRow["motivoIndisponibilidad"], motivoIndisponibilidadDetalle: motivoDetalle ?? null }
                            : row
                        )
                      )
                    }
                    deshabilitado={r.estatus === "BAJA"}
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: r.disponibilidad ? "var(--sidebar-text)" : "var(--priority-alta)" }}>
                  {motivoTexto(r)}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: r.diasSinOperar > 3 ? "var(--priority-alta)" : "var(--field-text)" }}
                  title={
                    r.disponibilidad
                      ? "Encendida"
                      : r.origenDiasSinOperar === "apagada"
                        ? "Contando desde que se apagó con el botón de encendido/apagado"
                        : r.origenDiasSinOperar === "actividad"
                          ? `Estimado por última actividad: ${labelFuenteActividad(r.fuenteActividad)}`
                          : "Sin actividad ni cambios de disponibilidad registrados"
                  }
                >
                  {r.diasSinOperar}
                </td>
                {mostrarColumnaSla && (
                  <td
                    className="px-4 py-3"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: r.slaPorcentaje !== null && r.slaPorcentaje < 90 ? "var(--priority-alta)" : "var(--field-text)" }}
                    title="% de días activa en el mes en curso, actualizado al día — para el histórico mes a mes ve la ficha de la unidad"
                  >
                    {r.slaPorcentaje !== null ? `${r.slaPorcentaje}%` : "—"}
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
                  {r.resguardante ?? "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                  {r.ultimoMantenimiento ? fmtFecha(r.ultimoMantenimiento) : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: r.proximoMantenimiento ? "var(--field-text)" : "var(--sidebar-text)" }}>
                  {r.proximoMantenimiento ? fmtFecha(r.proximoMantenimiento) : "Sin programar"}
                </td>
                {extras.map((c) => (
                  <td
                    key={c.id}
                    className="px-4 py-3 whitespace-nowrap"
                    style={{ fontFamily: c.id === "numeroSerie" || c.sufijo || c.moneda ? "var(--font-mono)" : "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}
                  >
                    {textoColumna(c, r)}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <Link href={`/unidades/${r.numeroEconomico}`}>
                    <ChevronRight size={16} color="var(--sidebar-text)" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={(mostrarColumnaSla ? 15 : 14) + extras.length} className="px-4 py-10 text-center" style={{ fontFamily: "var(--font-ui)", color: "var(--sidebar-text)" }}>
                  No se encontraron unidades con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
        Mostrando {filtradas.length} de {rows.length} unidades
      </div>
    </div>
  );
}
