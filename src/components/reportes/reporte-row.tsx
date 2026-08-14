"use client";

import { useState, useTransition } from "react";
import { PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { alternarReporte, ejecutarReporteAhora } from "@/app/(app)/reportes/actions";
import { FRECUENCIA_LABEL, TIPOS_REPORTE } from "@/lib/reportes";

export type Reporte = {
  id: string;
  nombre: string;
  tipo: string;
  destinatarios: string[];
  hora: string;
  frecuencia: string;
  formato: string;
  activo: boolean;
  ultimaEjecucionEn: string | null;
  ultimoEstatus: string | null;
  ultimoErrorDetalle: string | null;
  creadoPor: { nombre: string };
};

const ESTATUS_LABEL: Record<string, string> = { ok: "Enviado", error: "Error", sin_destinatarios: "Sin destinatarios" };

export function ReporteRow({ reporte: r }: { reporte: Reporte }) {
  const [pending, startTransition] = useTransition();
  const [ejecutando, setEjecutando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const tipoLabel = TIPOS_REPORTE.find((t) => t.value === r.tipo)?.label ?? r.tipo;

  function ejecutarAhora() {
    setMensaje(null);
    setEjecutando(true);
    startTransition(async () => {
      const resultado = await ejecutarReporteAhora(r.id);
      setMensaje(resultado.ok ? "Reporte enviado." : resultado.error ?? "No se pudo enviar.");
      setEjecutando(false);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{r.nombre}</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          {tipoLabel} · {r.formato === "PDF" ? "PDF" : "Excel"} · {FRECUENCIA_LABEL[r.frecuencia]} a las {r.hora} · {r.destinatarios.join(", ")}
        </div>
        {r.ultimaEjecucionEn && (
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: r.ultimoEstatus === "ok" ? "var(--color-success)" : "var(--color-error)" }}>
            Última ejecución: {new Date(r.ultimaEjecucionEn).toLocaleString("es-MX")} — {ESTATUS_LABEL[r.ultimoEstatus ?? ""] ?? r.ultimoEstatus}
            {r.ultimoErrorDetalle ? ` (${r.ultimoErrorDetalle})` : ""}
          </div>
        )}
        {mensaje && <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{mensaje}</div>}
      </div>
      <div className="flex items-center gap-3">
        <Badge label={r.activo ? "Activo" : "Pausado"} color={r.activo ? "var(--color-status-cerrado)" : "var(--sidebar-text)"} bg={r.activo ? "var(--status-cerrado-bg)" : "var(--chip)"} />
        <button
          type="button"
          onClick={ejecutarAhora}
          disabled={ejecutando}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 disabled:opacity-60"
          style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
        >
          <PlayCircle size={13} /> {ejecutando ? "Enviando…" : "Ejecutar ahora"}
        </button>
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
