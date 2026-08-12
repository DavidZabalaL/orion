"use client";

import { useState, useTransition } from "react";
import { crearTag } from "@/app/(app)/tag/actions";
import { CheckCircle2 } from "lucide-react";
import { CampoAyuda } from "@/components/ui/campo-ayuda";
import { ComboboxUnidad } from "@/components/ui/combobox-unidad";

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
  width: "100%",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  display: "block",
  marginBottom: 6,
};

export function TagForm({ unidades }: { unidades: { numeroEconomico: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [guardado, setGuardado] = useState(false);

  return (
    <details className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <summary
        className="cursor-pointer"
        style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}
      >
        Registrar una transacción manual
      </summary>
      <form
        className="grid grid-cols-2 gap-4 md:grid-cols-6 items-end mt-4"
        action={(formData) => {
          startTransition(async () => {
            await crearTag(formData);
            setGuardado(true);
            setTimeout(() => setGuardado(false), 2500);
          });
        }}
      >
        <div>
          <CampoAyuda style={labelStyle} texto="Unidad relacionada, si ya se conoce.">Unidad (opcional)</CampoAyuda>
          <ComboboxUnidad name="numeroEconomico" unidades={unidades} placeholder="Sin asignar — buscar unidad…" style={fieldStyle} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Fecha en la que ocurrió el cruce por caseta.">Fecha *</CampoAyuda>
          <input name="fecha" type="date" required style={fieldStyle} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Monto cobrado por el cruce.">Monto *</CampoAyuda>
          <input name="monto" type="number" step="0.01" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Nombre de la caseta donde se hizo el cruce.">Caseta</CampoAyuda>
          <input name="caseta" style={fieldStyle} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Empresa que emitió el tag electrónico.">Proveedor *</CampoAyuda>
          <select name="proveedorTag" required style={fieldStyle}>
            <option value="IAVE">IAVE</option>
            <option value="PASE">PASE</option>
            <option value="TELEVIA">Televía</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-md h-10 font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {guardado ? <><CheckCircle2 size={16} /> Guardado</> : pending ? "Guardando…" : "Registrar"}
        </button>
      </form>
    </details>
  );
}
