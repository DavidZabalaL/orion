"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { fmtMoney } from "@/lib/formato";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";
import type { PartidaResumen } from "@/lib/presupuesto";

const MESES_ABREV = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Filas de la tabla de partidas, con desglose por número económico expandible al hacer clic — mismo gasto REAL anual ya calculado en obtenerResumenPresupuestoPorPartida, solo sin agregar por unidad. */
export function PartidasTabla({ partidas }: { partidas: PartidaResumen[] }) {
  const [expandida, setExpandida] = useState<string | null>(null);

  return (
    <>
      {partidas.map((p) => {
        const abierta = expandida === p.categoria;
        const tieneDesglose = p.porUnidad.length > 0;
        return (
          <Fragment key={p.categoria}>
            <tr
              onClick={() => tieneDesglose && setExpandida(abierta ? null : p.categoria)}
              style={{ borderBottom: "1px solid var(--field-border)", cursor: tieneDesglose ? "pointer" : "default" }}
            >
              <td className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                <span className="flex items-center gap-1.5">
                  {tieneDesglose ? abierta ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span style={{ width: 14 }} />}
                  {CATEGORIA_GASTO_LABEL[p.categoria]}
                </span>
              </td>
              {p.meses.map((m) => (
                <td key={m.mes} className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                  <div style={{ color: m.diferencia < 0 ? "var(--color-status-escena)" : "var(--field-text)" }}>{fmtMoney(m.real)}</div>
                  <div style={{ color: "var(--sidebar-text)" }}>{fmtMoney(m.presupuestado)}</div>
                </td>
              ))}
              <td className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{fmtMoney(p.presupuestadoAnual)}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{fmtMoney(p.realAnual)}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 600, color: p.diferenciaAnual < 0 ? "var(--color-status-escena)" : "var(--color-status-cerrado)" }}>
                {fmtMoney(p.diferenciaAnual)}
              </td>
            </tr>
            {abierta && (
              <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                <td colSpan={MESES_ABREV.length + 4} className="px-4 py-3" style={{ background: "var(--chip)" }}>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", marginBottom: 8 }}>
                    Gasto anual por número económico — {CATEGORIA_GASTO_LABEL[p.categoria]}
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-3 md:grid-cols-4">
                    {p.porUnidad.map((u) => (
                      <div key={u.numeroEconomico} className="flex items-center justify-between gap-3">
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>{u.numeroEconomico}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{fmtMoney(u.monto)}</span>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            )}
          </Fragment>
        );
      })}
    </>
  );
}
