"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { actualizarPresupuestoAprobado, actualizarPresupuestoMensual } from "@/app/(app)/proyectos/actions";
import { fmtMoney } from "@/lib/formato";
import type { ResumenPresupuestoAnual } from "@/lib/presupuesto";

const MESES_LABEL = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const inputStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--text-sm)",
  height: 32,
  width: 120,
  borderRadius: "var(--radius-md)",
  padding: "0 8px",
};

function BarraProgreso({ valor, total }: { valor: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (valor / total) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full" style={{ background: "var(--chip)" }}>
      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? "var(--color-status-escena)" : "var(--color-primary)" }} />
    </div>
  );
}

function FilaMes({ proyectoId, anio, mes, asignado, gasto }: { proyectoId: string; anio: number; mes: number; asignado: number; gasto: number }) {
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);
  const pct = asignado > 0 ? (gasto / asignado) * 100 : 0;

  return (
    <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
      <td className="px-4 py-2.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
        {MESES_LABEL[mes - 1]}
      </td>
      <td className="px-4 py-2.5">
        <form
          className="flex items-center gap-2"
          action={(formData) => {
            startTransition(async () => {
              await actualizarPresupuestoMensual(formData);
              setOk(true);
              setTimeout(() => setOk(false), 1500);
            });
          }}
        >
          <input type="hidden" name="proyectoId" value={proyectoId} />
          <input type="hidden" name="anio" value={anio} />
          <input type="hidden" name="mes" value={mes} />
          <input name="montoAsignado" type="number" step="0.01" defaultValue={asignado} style={inputStyle} />
          <button type="submit" disabled={pending} className="flex items-center justify-center rounded-md disabled:opacity-60" style={{ width: 28, height: 28, color: ok ? "var(--color-status-cerrado)" : "var(--sidebar-text)" }} aria-label="Guardar">
            <CheckCircle2 size={15} />
          </button>
        </form>
      </td>
      <td className="px-4 py-2.5" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: pct > 90 ? "var(--color-status-escena)" : "var(--field-text)" }}>
        {fmtMoney(gasto)}
      </td>
      <td className="px-4 py-2.5 w-32">
        <BarraProgreso valor={gasto} total={asignado} />
      </td>
    </tr>
  );
}

export function PresupuestoAnual({ proyectoId, resumen }: { proyectoId: string; resumen: ResumenPresupuestoAnual }) {
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>
              Presupuesto aprobado {resumen.anio}
            </div>
            <form
              className="flex items-center gap-2 mt-1"
              action={(formData) => {
                startTransition(async () => {
                  await actualizarPresupuestoAprobado(formData);
                  setOk(true);
                  setTimeout(() => setOk(false), 1500);
                });
              }}
            >
              <input type="hidden" name="id" value={proyectoId} />
              <input name="presupuestoAprobadoAnual" type="number" step="0.01" defaultValue={resumen.presupuestoAprobadoAnual} style={{ ...inputStyle, width: 160, height: 36, fontSize: "var(--text-base)" }} />
              <button type="submit" disabled={pending} className="flex items-center gap-1.5 rounded-md px-3 h-9 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
                {ok ? <><CheckCircle2 size={14} /> Guardado</> : pending ? "Guardando…" : "Guardar"}
              </button>
            </form>
          </div>

          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Asignado a meses</div>
            <div className="mt-1" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
              {fmtMoney(resumen.asignadoAnual)}
            </div>
          </div>

          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Gasto real del año</div>
            <div className="mt-1" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
              {fmtMoney(resumen.gastoAnual)}
            </div>
          </div>
        </div>

        <BarraProgreso valor={resumen.gastoAnual} total={resumen.presupuestoAprobadoAnual} />
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
              {["Mes", "Asignado", "Gasto real", "% usado"].map((h) => (
                <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resumen.meses.map((m) => (
              <FilaMes key={m.mes} proyectoId={proyectoId} anio={resumen.anio} mes={m.mes} asignado={m.asignado} gasto={m.gasto} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
