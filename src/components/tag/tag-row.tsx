"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, X } from "lucide-react";
import { fmtMoney, fmtFecha } from "@/lib/formato";
import { actualizarTag } from "@/app/(app)/tag/actions";
import { ComboboxUnidad } from "@/components/ui/combobox-unidad";

type Tag = {
  id: string;
  fecha: string;
  numeroEconomico: string | null;
  caseta: string | null;
  monto: string;
  proveedorTag: string;
};

const td: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" };
const inputSm: React.CSSProperties = { background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-sm)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", borderRadius: "var(--radius-md)", padding: "0 8px", width: "100%" };

export function TagRow({
  tag: t,
  unidades,
  proyectos,
}: {
  tag: Tag;
  unidades: { numeroEconomico: string }[];
  proyectos: { id: string; nombre: string }[];
}) {
  const [editando, setEditando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aplicaAUnidad, setAplicaAUnidad] = useState(!!t.numeroEconomico);

  if (editando) {
    return (
      <tr style={{ borderBottom: "1px solid var(--field-border)", background: "var(--field-bg)" }}>
        <td colSpan={6} className="px-4 py-3">
          <form
            className="flex flex-wrap items-end gap-2"
            action={(fd) => {
              setError(null);
              fd.set("id", t.id);
              startTransition(async () => {
                const res = await actualizarTag(fd);
                if (!res.ok) setError(res.error ?? "No se pudo guardar.");
                else setEditando(false);
              });
            }}
          >
            <div>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--sidebar-text)", display: "block" }}>Fecha</label>
              <input name="fecha" type="date" defaultValue={t.fecha.slice(0, 10)} required max={new Date().toISOString().slice(0, 10)} style={inputSm} />
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--sidebar-text)", display: "block" }}>Caseta</label>
              <input name="caseta" defaultValue={t.caseta ?? ""} style={inputSm} />
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--sidebar-text)", display: "block" }}>Monto</label>
              <input name="monto" type="number" step="0.01" defaultValue={t.monto} required style={{ ...inputSm, fontFamily: "var(--font-mono)" }} />
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--sidebar-text)", display: "block" }}>Proveedor</label>
              <select name="proveedorTag" defaultValue={t.proveedorTag} required style={inputSm}>
                <option value="IAVE">IAVE</option>
                <option value="PASE">PASE</option>
                <option value="TELEVIA">Televía</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--sidebar-text)", display: "block" }}>Asignar a</label>
              <select value={aplicaAUnidad ? "SI" : "NO"} onChange={(e) => setAplicaAUnidad(e.target.value === "SI")} style={inputSm}>
                <option value="SI">Unidad</option>
                <option value="NO">Proyecto</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--sidebar-text)", display: "block" }}>{aplicaAUnidad ? "Unidad" : "Proyecto"}</label>
              {aplicaAUnidad ? (
                <ComboboxUnidad name="numeroEconomico" unidades={unidades} defaultValue={t.numeroEconomico ?? ""} required style={{ ...inputSm, fontFamily: "var(--font-mono)" }} />
              ) : (
                <select name="proyectoReportanteId" required style={inputSm}>
                  <option value="">Seleccionar…</option>
                  {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              )}
            </div>
            <button type="submit" disabled={pending} className="rounded-md px-3 h-8 text-xs font-semibold disabled:opacity-60"
              style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)" }}>
              {pending ? "…" : "Guardar"}
            </button>
            <button type="button" onClick={() => setEditando(false)} className="rounded-md px-2 h-8" style={{ color: "var(--sidebar-text)" }}>
              <X size={16} />
            </button>
            {error && <p className="w-full" style={{ color: "#ef4444", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}>{error}</p>}
          </form>
        </td>
      </tr>
    );
  }

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
        <button onClick={() => setEditando(true)} style={{ color: "var(--sidebar-text)" }} title="Editar">
          <Pencil size={15} />
        </button>
      </td>
    </tr>
  );
}
