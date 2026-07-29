"use client";

import { useState, useTransition } from "react";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { renovarSeguro } from "@/app/(app)/seguros/actions";
import { CampoAyuda } from "@/components/ui/campo-ayuda";

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
};

export function RenovarSeguroForm({ id }: { id: string }) {
  const [abierto, setAbierto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-md px-4 h-10 w-fit"
        style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", boxShadow: "var(--shadow-sm)" }}
      >
        <RefreshCw size={15} /> Renovar póliza
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl p-5"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      action={(formData) => {
        startTransition(async () => {
          await renovarSeguro(formData);
          setOk(true);
          setTimeout(() => { setOk(false); setAbierto(false); }, 1500);
        });
      }}
    >
      <input type="hidden" name="id" value={id} />
      <div>
        <CampoAyuda
          style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", display: "block", marginBottom: 6 }}
          texto="Nueva fecha en la que vencerá la póliza tras la renovación."
        >
          Nueva fecha de vencimiento *
        </CampoAyuda>
        <input name="fechaVencimiento" type="date" required style={fieldStyle} />
      </div>
      <div>
        <CampoAyuda
          style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", display: "block", marginBottom: 6 }}
          texto="Nueva prima, solo si cambió respecto al periodo anterior."
        >
          Nuevo costo
        </CampoAyuda>
        <input name="costo" type="number" step="0.01" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
      </div>
      <button type="submit" disabled={pending} className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
        {ok ? <><CheckCircle2 size={16} /> Renovada</> : pending ? "Guardando…" : "Confirmar renovación"}
      </button>
    </form>
  );
}
