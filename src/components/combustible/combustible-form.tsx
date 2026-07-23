"use client";

import { useRef, useState, useTransition } from "react";
import { crearCombustible } from "@/app/(app)/combustible/actions";
import { CheckCircle2, TriangleAlert } from "lucide-react";

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

type Estado = { tipo: "idle" } | { tipo: "ok" } | { tipo: "alerta" } | { tipo: "error"; mensaje: string };

export function CombustibleForm({ unidades }: { unidades: { numeroEconomico: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<Estado>({ tipo: "idle" });
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
        Captura manual de transacción
      </h3>
      {estado.tipo === "error" && (
        <div className="flex items-start gap-2 rounded-md px-3 py-2.5 mb-4" style={{ background: "var(--status-escena-bg)" }}>
          <TriangleAlert size={15} color="var(--color-status-escena)" className="shrink-0 mt-0.5" />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{estado.mensaje}</span>
        </div>
      )}
      {estado.tipo === "alerta" && (
        <div className="flex items-start gap-2 rounded-md px-3 py-2.5 mb-4" style={{ background: "var(--status-revision-bg)" }}>
          <TriangleAlert size={15} color="var(--color-status-revision)" className="shrink-0 mt-0.5" />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-revision)" }}>
            La transacción se guardó, pero el nivel estimado de tanque excede la capacidad máxima registrada de la unidad. Verifica la carga.
          </span>
        </div>
      )}
      <form
        ref={formRef}
        className="grid grid-cols-2 gap-4 md:grid-cols-5 items-end"
        action={(formData) => {
          startTransition(async () => {
            const res = await crearCombustible(formData);
            if (!res.ok) {
              setEstado({ tipo: "error", mensaje: res.error ?? "No se pudo registrar la transacción." });
              return;
            }
            if (res.alertaSobrellenado) {
              setEstado({ tipo: "alerta" });
            } else {
              setEstado({ tipo: "ok" });
              formRef.current?.reset();
              setTimeout(() => setEstado({ tipo: "idle" }), 2500);
            }
          });
        }}
      >
        <div>
          <label style={labelStyle}>Unidad *</label>
          <select name="numeroEconomico" required style={fieldStyle}>
            {unidades.map((u) => (
              <option key={u.numeroEconomico} value={u.numeroEconomico}>{u.numeroEconomico}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Fecha *</label>
          <input name="fecha" type="date" required style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Litros *</label>
          <input name="litros" type="number" step="0.1" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <label style={labelStyle}>Costo *</label>
          <input name="costo" type="number" step="0.01" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <label style={labelStyle}>Km actual *</label>
          <input name="kmActual" type="number" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div className="col-span-2 md:col-span-4">
          <label style={labelStyle}>Estación</label>
          <input name="estacion" style={fieldStyle} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-md h-10 font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {estado.tipo === "ok" ? <><CheckCircle2 size={16} /> Guardado</> : pending ? "Guardando…" : "Registrar"}
        </button>
      </form>
    </div>
  );
}
