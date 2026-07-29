"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtFecha } from "@/lib/formato";
import { ESTATUS_SEGURO_LABEL, ESTATUS_SEGURO_STYLE } from "@/lib/estatus";

export type PolizaRow = {
  id: string;
  numeroEconomico: string;
  aseguradora: string;
  numeroPoliza: string;
  fechaInicio: string;
  fechaVencimiento: string;
  costo: string;
  estatus: string;
};

export function PolizasLista({ polizas }: { polizas: PolizaRow[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return polizas;
    return polizas.filter((p) =>
      p.numeroEconomico.toUpperCase().includes(q) ||
      p.aseguradora.toUpperCase().includes(q) ||
      p.numeroPoliza.toUpperCase().includes(q)
    );
  }, [polizas, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar unidad, aseguradora o póliza…" />
      {filtradas.length === 0 ? (
        <EmptyState>Sin pólizas que coincidan.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                {["N° económico", "Aseguradora", "Póliza", "Vigencia", "Costo", "Estatus", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{p.numeroEconomico}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{p.aseguradora}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{p.numeroPoliza}</td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFecha(p.fechaInicio)} — {fmtFecha(p.fechaVencimiento)}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtMoney(p.costo)}</td>
                  <td className="px-4 py-3">
                    <Badge label={ESTATUS_SEGURO_LABEL[p.estatus]} color={ESTATUS_SEGURO_STYLE[p.estatus]?.color} bg={ESTATUS_SEGURO_STYLE[p.estatus]?.bg} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/seguros/${p.id}`} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-primary)" }}>Ver ficha</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
