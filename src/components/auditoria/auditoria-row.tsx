"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtFecha } from "@/lib/formato";
import { resolverAuditoria } from "@/app/auditoria/actions";

type Auditoria = {
  id: string;
  fechaRevision: string;
  unidad: { numeroEconomico: string };
  categoriaGasto: string;
  montoPptto: string;
  montoReal: string;
  montoCv: string;
  diferencia: string;
  estatus: string;
  tipoDiscrepancia: string | null;
  resolucion: string | null;
};

const td: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" };
const tdMono: React.CSSProperties = { ...td, fontFamily: "var(--font-mono)" };

export function AuditoriaRow({ auditoria: a }: { auditoria: Auditoria }) {
  const [resolviendo, setResolviendo] = useState(false);
  const tieneDiferencia = Number(a.diferencia) !== 0;

  return (
    <>
      <tr style={{ borderBottom: resolviendo ? "none" : "1px solid var(--field-border)" }}>
        <td className="px-4 py-3" style={td}>{fmtFecha(a.fechaRevision)}</td>
        <td className="px-4 py-3">
          <Link href={`/unidades/${a.unidad.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            {a.unidad.numeroEconomico}
          </Link>
        </td>
        <td className="px-4 py-3" style={td}>{a.categoriaGasto}</td>
        <td className="px-4 py-3" style={tdMono}>{fmtMoney(a.montoPptto)}</td>
        <td className="px-4 py-3" style={tdMono}>{fmtMoney(a.montoReal)}</td>
        <td className="px-4 py-3" style={tdMono}>{fmtMoney(a.montoCv)}</td>
        <td className="px-4 py-3" style={{ ...tdMono, color: tieneDiferencia ? "var(--priority-alta)" : "var(--field-text)", fontWeight: tieneDiferencia ? 600 : 400 }}>
          {fmtMoney(a.diferencia)}
        </td>
        <td className="px-4 py-3">
          <Badge
            label={a.estatus === "ABIERTA" ? "Abierta" : "Resuelta"}
            color={a.estatus === "ABIERTA" ? "var(--color-status-escena)" : "var(--color-status-cerrado)"}
            bg={a.estatus === "ABIERTA" ? "var(--status-escena-bg)" : "var(--status-cerrado-bg)"}
          />
        </td>
        <td className="px-4 py-3">
          {a.estatus === "ABIERTA" && (
            <button
              onClick={() => setResolviendo((v) => !v)}
              className="rounded-md px-2.5 py-1"
              style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
            >
              {resolviendo ? "Cancelar" : "Resolver"}
            </button>
          )}
        </td>
      </tr>
      {resolviendo && (
        <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
          <td colSpan={9} className="px-4 py-3" style={{ background: "var(--field-bg)" }}>
            <form
              action={async (formData) => {
                await resolverAuditoria(formData);
                setResolviendo(false);
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="id" value={a.id} />
              <input
                name="resolucion"
                required
                placeholder="Describe la resolución de la discrepancia…"
                className="flex-1 min-w-[240px] rounded-md px-3"
                style={{ background: "var(--panel-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-sm)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
              />
              <button type="submit" className="rounded-md px-3 h-8" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}>
                Marcar resuelta
              </button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
