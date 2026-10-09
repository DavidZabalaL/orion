"use client";

import { useState, useTransition } from "react";
import { Lock, Unlock } from "lucide-react";
import { Panel, SeccionTitulo } from "@/components/ui/documento-panel";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";
import { cerrarReporteFalla } from "@/app/(app)/checklist/actions";

function diasEntre(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

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

/**
 * Abierto/Cerrado de un REPORTE_FALLA, con fecha de cierre y costo de
 * resolución — base para medir tiempo de resolución (SLA) más adelante.
 * estatusFalla null (reportes creados antes de este campo) se trata igual
 * que "ABIERTO".
 */
export function EstatusReporteFalla({
  id,
  fecha,
  estatusFalla,
  fechaCierreFalla,
  costoResolucionFalla,
}: {
  id: string;
  fecha: string;
  estatusFalla: string | null;
  fechaCierreFalla: string | null;
  costoResolucionFalla: number | null;
}) {
  const abierto = estatusFalla !== "CERRADO";
  const [costo, setCosto] = useState(costoResolucionFalla != null ? String(costoResolucionFalla) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fechaApertura = new Date(fecha);
  const dias = diasEntre(fechaApertura, fechaCierreFalla ? new Date(fechaCierreFalla) : new Date());

  function cerrar() {
    setError(null);
    const costoNum = costo.trim() ? Number(costo) : undefined;
    if (costoNum !== undefined && Number.isNaN(costoNum)) {
      setError("El costo debe ser un número.");
      return;
    }
    startTransition(async () => {
      const r = await cerrarReporteFalla({ id, costoResolucion: costoNum });
      if (!r.ok) setError(r.error);
    });
  }

  function reabrir() {
    setError(null);
    startTransition(async () => {
      const r = await cerrarReporteFalla({ id, reabrir: true });
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <Panel>
      <SeccionTitulo titulo="Estado de la falla" />
      <div className="px-5 py-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge
            label={abierto ? "Abierto" : "Cerrado"}
            color={abierto ? "var(--color-status-escena)" : "var(--color-status-cerrado)"}
            bg={abierto ? "var(--status-escena-bg)" : "var(--status-cerrado-bg)"}
          />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
            {abierto ? `Abierto hace ${dias} día(s)` : `Se resolvió en ${dias} día(s)`}
          </span>
        </div>

        {!abierto && (
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
            Cerrado el {fechaCierreFalla ? fmtFechaHora(fechaCierreFalla) : "—"}
            {costoResolucionFalla != null && ` · Costo de resolución: $${costoResolucionFalla.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
          </div>
        )}

        {abierto ? (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", marginBottom: 4 }}>
                Costo de resolución (opcional)
              </label>
              <input type="number" min={0} step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="$0.00" style={fieldStyle} />
            </div>
            <button
              type="button"
              onClick={cerrar}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-md px-4 h-10 font-semibold disabled:opacity-60"
              style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
            >
              <Lock size={14} /> Marcar como cerrado
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={reabrir}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-md px-4 h-10 font-semibold w-fit disabled:opacity-60"
            style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
          >
            <Unlock size={14} /> Reabrir
          </button>
        )}

        {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-error)" }}>{error}</p>}
      </div>
    </Panel>
  );
}
