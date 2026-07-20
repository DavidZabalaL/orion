"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { crearSeguro } from "@/app/(app)/seguros/actions";
import { TIPO_COBERTURA_LABEL } from "@/lib/estatus";

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

type Cobertura = { tipoCobertura: string; sumaAsegurada: string; deducible: string };

export function SeguroForm({ unidades }: { unidades: { numeroEconomico: string }[] }) {
  const [coberturas, setCoberturas] = useState<Cobertura[]>([
    { tipoCobertura: "RC_TERCEROS", sumaAsegurada: "3000000", deducible: "0" },
    { tipoCobertura: "DANOS_MATERIALES", sumaAsegurada: "350000", deducible: "5000" },
  ]);

  return (
    <form action={crearSeguro} className="flex flex-col gap-6">
      <input type="hidden" name="coberturasJson" value={JSON.stringify(coberturas)} />

      <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Datos de la póliza
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label style={labelStyle}>Número económico *</label>
            <select name="numeroEconomico" required style={fieldStyle}>
              {unidades.map((u) => (
                <option key={u.numeroEconomico} value={u.numeroEconomico}>{u.numeroEconomico}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Aseguradora *</label>
            <input name="aseguradora" required style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Número de póliza *</label>
            <input name="numeroPoliza" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
          <div>
            <label style={labelStyle}>Costo *</label>
            <input name="costo" type="number" step="0.01" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
          <div>
            <label style={labelStyle}>Fecha de inicio *</label>
            <input name="fechaInicio" type="date" required style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Fecha de vencimiento *</label>
            <input name="fechaVencimiento" type="date" required style={fieldStyle} />
          </div>
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Coberturas
          </h3>
          <button
            type="button"
            onClick={() => setCoberturas((c) => [...c, { tipoCobertura: "ROBO_TOTAL", sumaAsegurada: "0", deducible: "0" }])}
            className="flex items-center gap-1 rounded-md px-2.5 py-1"
            style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
          >
            <Plus size={13} /> Agregar
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {coberturas.map((c, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_1fr_1fr_auto] items-end">
              <div>
                {i === 0 && <label style={labelStyle}>Tipo de cobertura</label>}
                <select
                  value={c.tipoCobertura}
                  onChange={(e) => setCoberturas((cs) => cs.map((x, xi) => xi === i ? { ...x, tipoCobertura: e.target.value } : x))}
                  style={fieldStyle}
                >
                  {Object.entries(TIPO_COBERTURA_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                {i === 0 && <label style={labelStyle}>Suma asegurada</label>}
                <input
                  type="number"
                  value={c.sumaAsegurada}
                  onChange={(e) => setCoberturas((cs) => cs.map((x, xi) => xi === i ? { ...x, sumaAsegurada: e.target.value } : x))}
                  style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }}
                />
              </div>
              <div>
                {i === 0 && <label style={labelStyle}>Deducible</label>}
                <input
                  type="number"
                  value={c.deducible}
                  onChange={(e) => setCoberturas((cs) => cs.map((x, xi) => xi === i ? { ...x, deducible: e.target.value } : x))}
                  style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }}
                />
              </div>
              <button
                type="button"
                onClick={() => setCoberturas((cs) => cs.filter((_, xi) => xi !== i))}
                className="flex items-center justify-center rounded-md"
                style={{ height: "var(--h-md)", width: "var(--h-md)", color: "var(--color-status-escena)" }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="rounded-md px-5 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          Guardar póliza
        </button>
      </div>
    </form>
  );
}
