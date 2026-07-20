"use client";

import { useTransition } from "react";
import { fmtMoney, fmtFecha } from "@/lib/formato";
import { asignarEconomicoTag } from "@/app/(app)/tag/actions";

type Tag = {
  id: string;
  fecha: string;
  caseta: string | null;
  monto: string;
  proveedorTag: string;
};

const td: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" };

export function TagPendienteRow({ tag: t, unidades }: { tag: Tag; unidades: { numeroEconomico: string }[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
      <td className="px-4 py-3" style={td}>{fmtFecha(t.fecha)}</td>
      <td className="px-4 py-3" style={td}>{t.caseta ?? "—"}</td>
      <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{fmtMoney(t.monto)}</td>
      <td className="px-4 py-3" style={td}>{t.proveedorTag}</td>
      <td className="px-4 py-3">
        <form
          className="flex items-center gap-2"
          action={(fd) => {
            startTransition(() => asignarEconomicoTag(fd));
          }}
        >
          <input type="hidden" name="id" value={t.id} />
          <select
            name="numeroEconomico"
            required
            className="rounded-md px-2"
            style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-sm)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}
          >
            <option value="">Seleccionar…</option>
            {unidades.map((u) => (
              <option key={u.numeroEconomico} value={u.numeroEconomico}>{u.numeroEconomico}</option>
            ))}
          </select>
          <button type="submit" disabled={pending} className="rounded-md px-2.5 py-1 disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
            {pending ? "…" : "Asignar"}
          </button>
        </form>
      </td>
    </tr>
  );
}
