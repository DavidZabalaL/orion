"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { fmtMoney } from "@/lib/formato";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";
import type { ResumenPresupuestoPorPartida } from "@/lib/presupuesto";

const MESES_LABEL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const selectStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
};

function SelectorMes({ mes }: { mes: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function cambiarMes(nuevoMes: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", String(nuevoMes));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select value={mes} onChange={(e) => cambiarMes(Number(e.target.value))} style={selectStyle}>
      {MESES_LABEL.map((label, i) => (
        <option key={label} value={i + 1}>{label}</option>
      ))}
    </select>
  );
}

export function PresupuestoPartidaMes({
  proyectoId,
  resumen,
  mes,
}: {
  proyectoId: string;
  resumen: ResumenPresupuestoPorPartida;
  mes: number;
}) {
  const partidasDelMes = resumen.partidas.map((p) => ({ categoria: p.categoria, ...p.meses[mes - 1] }));
  const presupuestadoMes = partidasDelMes.reduce((acc, p) => acc + p.presupuestado, 0);
  const realMes = partidasDelMes.reduce((acc, p) => acc + p.real, 0);
  const diferenciaMes = presupuestadoMes - realMes;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Mes</div>
            <div className="mt-1"><SelectorMes mes={mes} /></div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>PTTO del mes</div>
            <div className="mt-1" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>{fmtMoney(presupuestadoMes)}</div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Real del mes</div>
            <div className="mt-1" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>{fmtMoney(realMes)}</div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Diferencia</div>
            <div className="mt-1" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-lg)", fontWeight: 700, color: diferenciaMes < 0 ? "var(--color-status-escena)" : "var(--color-status-cerrado)" }}>{fmtMoney(diferenciaMes)}</div>
          </div>
          <Link href={`/proyectos/${proyectoId}/presupuesto`} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-primary)" }}>
            Ver año completo →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {partidasDelMes.map((p) => (
          <div key={p.categoria} className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
              {CATEGORIA_GASTO_LABEL[p.categoria]}
            </div>
            <div className="flex items-center justify-between" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
              <span style={{ color: "var(--sidebar-text)" }}>PTTO</span>
              <span style={{ color: "var(--field-text)" }}>{fmtMoney(p.presupuestado)}</span>
            </div>
            <div className="flex items-center justify-between" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
              <span style={{ color: "var(--sidebar-text)" }}>Real</span>
              <span style={{ color: "var(--field-text)" }}>{fmtMoney(p.real)}</span>
            </div>
            <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid var(--field-border)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 600 }}>
              <span style={{ color: "var(--sidebar-text)" }}>Diferencia</span>
              <span style={{ color: p.diferencia < 0 ? "var(--color-status-escena)" : "var(--color-status-cerrado)" }}>{fmtMoney(p.diferencia)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
