"use client";

import { useState, useTransition } from "react";
import { fmtMoney, fmtFecha } from "@/lib/formato";
import { asignarEconomicoTag } from "@/app/(app)/tag/actions";
import { ComboboxUnidad } from "@/components/ui/combobox-unidad";

type Tag = {
  id: string;
  fecha: string;
  caseta: string | null;
  monto: string;
  proveedorTag: string;
  proyectoReportante: { nombre: string } | null;
};

const td: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" };
const selectSm: React.CSSProperties = { background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-sm)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", borderRadius: "var(--radius-md)", padding: "0 8px" };

export function TagPendienteRow({
  tag: t,
  unidades,
  proyectos,
}: {
  tag: Tag;
  unidades: { numeroEconomico: string }[];
  proyectos: { id: string; nombre: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [aplicaAUnidad, setAplicaAUnidad] = useState(true);

  return (
    <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
      <td className="px-4 py-3" style={td}>{fmtFecha(t.fecha)}</td>
      <td className="px-4 py-3" style={td}>{t.caseta ?? "—"}</td>
      <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{fmtMoney(t.monto)}</td>
      <td className="px-4 py-3" style={td}>{t.proveedorTag}</td>
      <td className="px-4 py-3" style={td}>{t.proyectoReportante?.nombre ?? "—"}</td>
      <td className="px-4 py-3">
        <form
          className="flex items-center gap-2"
          action={(fd) => {
            startTransition(() => asignarEconomicoTag(fd));
          }}
        >
          <input type="hidden" name="id" value={t.id} />
          <select value={aplicaAUnidad ? "SI" : "NO"} onChange={(e) => setAplicaAUnidad(e.target.value === "SI")} style={{ ...selectSm, width: 90 }}>
            <option value="SI">Unidad</option>
            <option value="NO">Proyecto</option>
          </select>
          {aplicaAUnidad ? (
            <ComboboxUnidad
              name="numeroEconomico"
              unidades={unidades}
              required
              placeholder="Seleccionar…"
              style={{ ...selectSm, fontFamily: "var(--font-mono)", width: 160 }}
            />
          ) : (
            <select name="proyectoReportanteId" required style={{ ...selectSm, width: 160 }}>
              <option value="">Seleccionar…</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          )}
          <button type="submit" disabled={pending} className="rounded-md px-2.5 py-1 disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
            {pending ? "…" : "Asignar"}
          </button>
        </form>
      </td>
    </tr>
  );
}
