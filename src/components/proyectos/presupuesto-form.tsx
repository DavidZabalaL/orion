"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { redistribuirPresupuesto } from "@/app/(app)/proyectos/actions";
import { fmtMoney } from "@/lib/formato";

export function PresupuestoForm({ id, presupuestoSemanal, gastado }: { id: string; presupuestoSemanal: number; gastado: number }) {
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);
  const pct = presupuestoSemanal > 0 ? Math.min(100, (gastado / presupuestoSemanal) * 100) : 0;

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Saldo disponible vs. gasto acumulado</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>{fmtMoney(gastado)} / {fmtMoney(presupuestoSemanal)}</span>
        </div>
        <div className="h-2 rounded-full" style={{ background: "var(--chip)" }}>
          <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? "var(--color-status-escena)" : "var(--color-primary)" }} />
        </div>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        action={(formData) => {
          startTransition(async () => {
            await redistribuirPresupuesto(formData);
            setOk(true);
            setTimeout(() => setOk(false), 2000);
          });
        }}
      >
        <input type="hidden" name="id" value={id} />
        <div>
          <label style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            Redistribuir presupuesto semanal
          </label>
          <input
            name="presupuestoSemanal"
            type="number"
            step="0.01"
            defaultValue={presupuestoSemanal}
            className="rounded-md px-3"
            style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)" }}
          />
        </div>
        <button type="submit" disabled={pending} className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          {ok ? <><CheckCircle2 size={16} /> Actualizado</> : pending ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </div>
  );
}
