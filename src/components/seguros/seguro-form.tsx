"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearSeguro } from "@/app/(app)/seguros/actions";
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

export function SeguroForm({
  unidades,
  numeroEconomicoDefault,
  numeroEconomicoFijo,
  onExito,
}: {
  unidades: { numeroEconomico: string }[];
  numeroEconomicoDefault?: string;
  numeroEconomicoFijo?: string;
  onExito?: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-6"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await crearSeguro(formData);
          if (!res.ok || !res.id) {
            setError(res.error ?? "No se pudo guardar la póliza.");
            return;
          }
          if (onExito) onExito(res.id);
          else router.push(`/unidades/${String(formData.get("numeroEconomico"))}`);
        });
      }}
    >
      <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Datos de la póliza
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <CampoAyuda style={labelStyle} texto="Unidad cubierta por esta póliza.">Número económico *</CampoAyuda>
            {numeroEconomicoFijo ? (
              <>
                <input type="hidden" name="numeroEconomico" value={numeroEconomicoFijo} />
                <div style={{ ...fieldStyle, display: "flex", alignItems: "center", fontFamily: "var(--font-mono)" }}>{numeroEconomicoFijo}</div>
              </>
            ) : (
              <ComboboxUnidad name="numeroEconomico" unidades={unidades} defaultValue={numeroEconomicoDefault} required style={fieldStyle} />
            )}
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Compañía que emite la póliza.">Aseguradora *</CampoAyuda>
            <input name="aseguradora" required style={fieldStyle} />
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Folio de la póliza asignado por la aseguradora.">Número de póliza *</CampoAyuda>
            <input name="numeroPoliza" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Prima total pagada por la póliza.">Costo *</CampoAyuda>
            <input name="costo" type="number" step="0.01" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Fecha en que empieza a tener vigencia la póliza.">Fecha de inicio *</CampoAyuda>
            <input name="fechaInicio" type="date" required style={fieldStyle} />
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Fecha en que vence la vigencia de la póliza.">Fecha de vencimiento *</CampoAyuda>
            <input name="fechaVencimiento" type="date" required style={fieldStyle} />
          </div>
          <div className="md:col-span-2">
            <CampoAyuda style={labelStyle} texto="Documento oficial de la póliza emitido por la aseguradora, en PDF.">PDF de la póliza *</CampoAyuda>
            <input name="archivo" type="file" accept="application/pdf" required style={{ ...fieldStyle, paddingTop: 8 }} />
          </div>
        </div>
      </div>

      {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md px-5 h-10 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          {pending ? "Guardando…" : "Guardar póliza"}
        </button>
      </div>
    </form>
  );
}
