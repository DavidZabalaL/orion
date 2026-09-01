"use client";

import Link from "next/link";
import { fmtMoney, fmtFecha } from "@/lib/formato";

type Tag = {
  id: string;
  fecha: string;
  numeroEconomico: string | null;
  caseta: string | null;
  monto: string;
  proveedorTag: string;
};

const td: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" };

export function TagRow({ tag: t }: { tag: Tag }) {
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
    </tr>
  );
}
