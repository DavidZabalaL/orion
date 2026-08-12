"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtFecha } from "@/lib/formato";
import { conciliarTag } from "@/app/(app)/tag/actions";

type Tag = {
  id: string;
  fecha: string;
  numeroEconomico: string | null;
  caseta: string | null;
  monto: string;
  proveedorTag: string;
  conciliado: boolean;
};

const td: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" };

export function TagRow({ tag: t }: { tag: Tag }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
      <td className="px-4 py-3" style={td}>{fmtFecha(t.fecha)}</td>
      <td className="px-4 py-3">
        <Link href={`/unidades/${t.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          {t.numeroEconomico}
        </Link>
      </td>
      <td className="px-4 py-3" style={td}>{t.caseta ?? "—"}</td>
      <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{fmtMoney(t.monto)}</td>
      <td className="px-4 py-3" style={td}>{t.proveedorTag}</td>
      <td className="px-4 py-3">
        <Badge label={t.conciliado ? "Conciliado" : "Pendiente"} color={t.conciliado ? "var(--color-status-cerrado)" : "var(--color-status-revision)"} bg={t.conciliado ? "var(--status-cerrado-bg)" : "var(--status-revision-bg)"} />
      </td>
      <td className="px-4 py-3">
        {!t.conciliado && (
          <form
            action={(fd) => {
              startTransition(() => conciliarTag(fd));
            }}
          >
            <input type="hidden" name="id" value={t.id} />
            <button type="submit" disabled={pending} className="rounded-md px-2.5 py-1 disabled:opacity-60" style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
              {pending ? "…" : "Conciliar"}
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}
