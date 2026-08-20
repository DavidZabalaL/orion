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

function CamposTag({
  unidades,
  numeroEconomicoFijo,
}: {
  unidades: { numeroEconomico: string }[];
  numeroEconomicoFijo?: string;
}) {
  return (
    <>
      <div>
        <CampoAyuda style={labelStyle} texto="Unidad relacionada, si ya se conoce.">Unidad {numeroEconomicoFijo ? "" : "(opcional)"}</CampoAyuda>
        {numeroEconomicoFijo ? (
          <>
            <input type="hidden" name="numeroEconomico" value={numeroEconomicoFijo} />
            <div style={{ ...fieldStyle, display: "flex", alignItems: "center", fontFamily: "var(--font-mono)" }}>{numeroEconomicoFijo}</div>
          </>
        ) : (
          <ComboboxUnidad name="numeroEconomico" unidades={unidades} placeholder="Sin asignar — buscar unidad…" style={fieldStyle} />
        )}
      </div>
      <div>
        <CampoAyuda style={labelStyle} texto="Fecha en la que ocurrió el cruce por caseta.">Fecha *</CampoAyuda>
        <input name="fecha" type="date" required max={new Date().toISOString().slice(0, 10)} style={fieldStyle} />
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
    </>
  );
}

export function TagForm({
  unidades,
  numeroEconomicoFijo,
  onExito,
}: {
  unidades: { numeroEconomico: string }[];
  numeroEconomicoFijo?: string;
  onExito?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function enviar(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await crearTag(formData);
      if (!res.ok) {
        setError(res.error ?? "No se pudo registrar la transacción.");
        return;
      }
      if (onExito) {
        onExito();
        return;
      }
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    });
  }

  // En la ficha de unidad se embebe dentro de un Modal (que ya es el "abrir/cerrar"),
  // así que ahí no tiene sentido el acordeón <details> del panel general de TAG.
  if (numeroEconomicoFijo) {
    return (
      <form className="flex flex-col gap-4" action={enviar}>
        <div className="grid grid-cols-2 gap-4">
          <CamposTag unidades={unidades} numeroEconomicoFijo={numeroEconomicoFijo} />
        </div>
        {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-md h-10 px-5 w-fit font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {pending ? "Guardando…" : "Registrar"}
        </button>
      </form>
    );
  }

  return (
    <details className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <summary
        className="cursor-pointer"
        style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}
      >
        Registrar una transacción manual
      </summary>
      <form className="grid grid-cols-2 gap-4 md:grid-cols-6 items-end mt-4" action={enviar}>
        <CamposTag unidades={unidades} />
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-md h-10 font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {guardado ? <><CheckCircle2 size={16} /> Guardado</> : pending ? "Guardando…" : "Registrar"}
        </button>
      </form>
      {error && <p className="mt-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}
    </details>
  );
}
