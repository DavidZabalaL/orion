"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Download, Plus, ChevronRight, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ESTATUS_OPERADOR_LABEL,
  ESTATUS_DOCUMENTAL_LABEL,
  ESTATUS_DOCUMENTAL_STYLE,
} from "@/lib/estatus-operador";

export type OperadorRow = {
  id: string;
  nombre: string;
  curp: string;
  proyecto: string | null;
  unidades: string[];
  estatus: string;
  estatusDocumental: string;
};

const selectStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
};

export function OperadoresTable({ rows, proyectos }: { rows: OperadorRow[]; proyectos: string[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [proyectoFiltro, setProyectoFiltro] = useState("");
  const [estatusFiltro, setEstatusFiltro] = useState("");

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return rows.filter((r) => {
      if (q && !r.nombre.toUpperCase().includes(q) && !r.curp.includes(q)) return false;
      if (proyectoFiltro && r.proyecto !== proyectoFiltro) return false;
      if (estatusFiltro && r.estatusDocumental !== estatusFiltro) return false;
      return true;
    });
  }, [rows, busqueda, proyectoFiltro, estatusFiltro]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md px-3 flex-1 min-w-[220px] max-w-sm" style={selectStyle}>
            <Search size={15} color="var(--sidebar-text)" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o CURP…"
              className="bg-transparent outline-none flex-1 min-w-0"
            />
          </div>

          <select value={proyectoFiltro} onChange={(e) => setProyectoFiltro(e.target.value)} className="rounded-md px-3" style={selectStyle}>
            <option value="">Todos los proyectos</option>
            {proyectos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select value={estatusFiltro} onChange={(e) => setEstatusFiltro(e.target.value)} className="rounded-md px-3" style={selectStyle}>
            <option value="">Todos los estatus documentales</option>
            {Object.entries(ESTATUS_DOCUMENTAL_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/operadores/pendientes"
            className="flex items-center gap-2 rounded-md px-3"
            style={{ ...selectStyle, color: "var(--sidebar-text-active)" }}
          >
            <ClipboardList size={15} />
            <span>Pendientes documentales</span>
          </Link>
          <button className="flex items-center gap-2 rounded-md px-3" style={{ ...selectStyle, color: "var(--sidebar-text-active)" }}>
            <Download size={15} />
            <span>Exportar</span>
          </button>
          <Link
            href="/operadores/nuevo"
            className="flex items-center gap-2 rounded-md px-3 font-semibold"
            style={{ background: "var(--color-primary)", color: "#fff", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            <Plus size={15} />
            Dar de alta
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
              {["Nombre", "Proyecto", "Unidad(es) asignada(s)", "Estatus", "Doc. estatus", ""].map((h) => (
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
              <tr key={r.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
                <td className="px-4 py-3">
                  <Link href={`/operadores/${r.id}`} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                    {r.nombre}
                  </Link>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{r.curp}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
                  {r.proyecto ?? "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                  {r.unidades.length ? r.unidades.join(", ") : "—"}
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
                  {ESTATUS_OPERADOR_LABEL[r.estatus]}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    label={ESTATUS_DOCUMENTAL_LABEL[r.estatusDocumental]}
                    color={ESTATUS_DOCUMENTAL_STYLE[r.estatusDocumental]?.color}
                    bg={ESTATUS_DOCUMENTAL_STYLE[r.estatusDocumental]?.bg}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/operadores/${r.id}`}>
                    <ChevronRight size={16} color="var(--sidebar-text)" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center" style={{ fontFamily: "var(--font-ui)", color: "var(--sidebar-text)" }}>
                  No se encontraron operadores con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
        Mostrando {filtradas.length} de {rows.length} operadores
      </div>
    </div>
  );
}
