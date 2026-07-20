"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { alternarReporte } from "@/app/(app)/reportes/actions";
import { FRECUENCIA_LABEL, TIPOS_REPORTE } from "@/lib/reportes";

export type Reporte = {
  id: string;
  nombre: string;
  tipo: string;
  destinatarios: string[];
  hora: string;
  frecuencia: string;
  activo: boolean;
  creadoPor: { nombre: string };
};

export function ReporteRow({ reporte: r }: { reporte: Reporte }) {
  const [pending, startTransition] = useTransition();
  const tipoLabel = TIPOS_REPORTE.find((t) => t.value === r.tipo)?.label ?? r.tipo;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{r.nombre}</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          {tipoLabel} · {FRECUENCIA_LABEL[r.frecuencia]} a las {r.hora} · {r.destinatarios.join(", ")}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge label={r.activo ? "Activo" : "Pausado"} color={r.activo ? "var(--color-status-cerrado)" : "var(--sidebar-text)"} bg={r.activo ? "var(--status-cerrado-bg)" : "var(--chip)"} />
        <form
          action={(fd) => {
            startTransition(() => alternarReporte(fd));
          }}
        >
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="activo" value={String(r.activo)} />
          <button type="submit" disabled={pending} className="rounded-md px-2.5 py-1 disabled:opacity-60" style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
            {pending ? "…" : r.activo ? "Pausar" : "Reactivar"}
          </button>
        </form>
      </div>
    </div>
  );
}
