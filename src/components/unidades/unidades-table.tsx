"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Download, Plus, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ESTATUS_UNIDAD_LABEL,
  ESTATUS_UNIDAD_STYLE,
  TIPO_VEHICULO_LABEL,
} from "@/lib/estatus";

export type UnidadRow = {
  numeroEconomico: string;
  placas: string;
  tipoVehiculo: string;
  marca: string;
  unidadModelo: string;
  proyecto: string | null;
  estadoOperacion: string;
  estatus: string;
  disponibilidad: boolean;
  diasSinOperar: number;
  resguardante: string | null;
};

const selectStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
};

export function UnidadesTable({
  rows,
  proyectos,
  estados,
}: {
  rows: UnidadRow[];
  proyectos: string[];
  estados: string[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [proyectoFiltro, setProyectoFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [estatusFiltro, setEstatusFiltro] = useState("");

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return rows.filter((r) => {
      if (q && !r.numeroEconomico.includes(q) && !r.placas.includes(q) && !(r.resguardante ?? "").toUpperCase().includes(q)) return false;
      if (proyectoFiltro && r.proyecto !== proyectoFiltro) return false;
      if (estadoFiltro && r.estadoOperacion !== estadoFiltro) return false;
      if (tipoFiltro && r.tipoVehiculo !== tipoFiltro) return false;
      if (estatusFiltro && r.estatus !== estatusFiltro) return false;
      return true;
    });
  }, [rows, busqueda, proyectoFiltro, estadoFiltro, tipoFiltro, estatusFiltro]);

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

          <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="rounded-md px-3" style={selectStyle}>
            <option value="">Todos los estados</option>
            {estados.map((e) => (
              <option key={e} value={e}>{e}</option>
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
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
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
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
              {["N° económico", "Placas", "Tipo", "Marca / Unidad", "Proyecto", "Estatus", "Disp.", "Días s/operar", "Resguardante", ""].map((h) => (
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
                    label={ESTATUS_UNIDAD_LABEL[r.estatus] ?? r.estatus}
                    color={ESTATUS_UNIDAD_STYLE[r.estatus]?.color ?? "var(--sidebar-text)"}
                    bg={ESTATUS_UNIDAD_STYLE[r.estatus]?.bg ?? "var(--chip)"}
                  />
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: r.disponibilidad ? "var(--resource-disponible)" : "var(--sidebar-text)" }}
                    title={r.disponibilidad ? "Disponible" : "No disponible"}
                  />
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: r.diasSinOperar > 3 ? "var(--priority-alta)" : "var(--field-text)" }}>
                  {r.diasSinOperar}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
                  {r.resguardante ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/unidades/${r.numeroEconomico}`}>
                    <ChevronRight size={16} color="var(--sidebar-text)" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center" style={{ fontFamily: "var(--font-ui)", color: "var(--sidebar-text)" }}>
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
