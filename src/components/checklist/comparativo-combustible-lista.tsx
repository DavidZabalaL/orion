"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { Table, EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora, fmtMoney } from "@/lib/formato";

export type FilaComparativoCombustibleRow = {
  id: string;
  fecha: string;
  numeroEconomico: string;
  marcaModelo: string;
  proyecto: string | null;
  responsable: string | null;
  tipoCombustible: string | null;
  porcentajeAntes: number | null;
  porcentajeDespues: number | null;
  litrosCargados: number | null;
  cantidadPagada: number | null;
  precioLitro: number | null;
  alertas: string[];
};

/** Tabla del comparativo de cargas de combustible — compartida entre /checklist/combustible (todas las unidades) y la pestaña "Comparativo combustible" de la ficha de unidad (una sola). */
export function ComparativoCombustibleLista({
  filas,
  mostrarUnidad = true,
}: {
  filas: FilaComparativoCombustibleRow[];
  mostrarUnidad?: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return filas;
    return filas.filter(
      (f) =>
        f.numeroEconomico.toUpperCase().includes(q) ||
        (f.responsable ?? "").toUpperCase().includes(q) ||
        (f.proyecto ?? "").toUpperCase().includes(q)
    );
  }, [filas, busqueda]);

  if (!filas.length) return <EmptyState>Sin cargas de combustible registradas en este rango.</EmptyState>;

  const headers = mostrarUnidad
    ? ["Fecha", "Unidad", "Proyecto", "Responsable", "% antes → después", "Litros", "Importe", "$/L", "Alertas", ""]
    : ["Fecha", "Responsable", "% antes → después", "Litros", "Importe", "$/L", "Alertas"];

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar número económico, responsable o proyecto…" />
      <Table headers={headers} minWidth={900}>
        {filtradas.map((f) => (
          <tr key={f.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
            <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              {fmtFechaHora(f.fecha)}
            </td>
            {mostrarUnidad && (
              <>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                  {f.numeroEconomico} <span style={{ fontFamily: "var(--font-ui)", color: "var(--sidebar-text)" }}>· {f.marcaModelo}</span>
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{f.proyecto ?? "—"}</td>
              </>
            )}
            <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{f.responsable ?? "—"}</td>
            <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
              {f.porcentajeAntes ?? "—"}% → {f.porcentajeDespues ?? "—"}%
            </td>
            <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{f.litrosCargados != null ? `${f.litrosCargados} L` : "—"}</td>
            <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{f.cantidadPagada != null ? fmtMoney(f.cantidadPagada) : "—"}</td>
            <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{f.precioLitro != null ? fmtMoney(f.precioLitro) : "—"}</td>
            <td className="px-4 py-3">
              {f.alertas.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {f.alertas.map((a, i) => (
                    <span key={i} className="flex items-start gap-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>
                      <TriangleAlert size={12} className="shrink-0 mt-0.5" /> {a}
                    </span>
                  ))}
                </div>
              ) : (
                <Badge label="Sin alertas" color="var(--color-status-cerrado)" bg="var(--status-cerrado-bg)" />
              )}
            </td>
            {mostrarUnidad && (
              <td className="px-2 py-3">
                <Link href={`/checklist/${f.id}`} aria-label="Ver detalle">
                  <ChevronRight size={16} color="var(--sidebar-text)" />
                </Link>
              </td>
            )}
          </tr>
        ))}
      </Table>
    </div>
  );
}
