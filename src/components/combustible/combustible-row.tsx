"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, TriangleAlert } from "lucide-react";
import { BadgeMotivo } from "@/components/ui/badge-motivo";
import { fmtMoney, fmtFecha, fmtFechaHora } from "@/lib/formato";
import { tieneHoraMx } from "@/lib/timezone";
import { eliminarCombustible } from "@/app/(app)/combustible/actions";

type Combustible = {
  id: string;
  fecha: string;
  litros: string;
  costo: string;
  kmActual: number | null;
  estacion: string | null;
  rendimientoCalculado: string | null;
  alertaSobrellenado: boolean;
  kmRecorridos: number | null;
  fuenteKmRecorridos: "GPS" | "CAPTURA" | null;
  kmGps?: number | null;
  kmCapturaRecorridos?: number | null;
  motivoSobrellenado?: string | null;
  discrepanciaGps?: string | null;
  gpsAplica?: boolean;
};

const td: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" };

export function CombustibleRow({ registro: r, isAdmin = false }: { registro: Combustible; isAdmin?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleEliminar(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await eliminarCombustible(formData);
      if (res.ok) {
        setConfirmando(false);
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo eliminar.");
      }
    });
  }

  return (
    <>
      <tr style={{ borderBottom: confirmando ? "none" : "1px solid var(--field-border)" }}>
        <td className="px-4 py-3 whitespace-nowrap" style={td}>{tieneHoraMx(r.fecha) ? fmtFechaHora(r.fecha) : fmtFecha(r.fecha)}</td>
        <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{Number(r.litros).toFixed(1)} L</td>
        <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{fmtMoney(r.costo)}</td>
        <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{r.kmActual != null ? r.kmActual.toLocaleString("es-MX") : "—"}</td>
        <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }} title={tieneHoraMx(r.fecha) ? "Odómetro del GPS a la hora de la carga" : "Odómetro del GPS al inicio del día (la carga no trae hora)"}>
          {r.gpsAplica === false ? (
            <span title="Antes de octubre de 2026 no se usaba el GPS: calculado con el km capturado" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
              Sin GPS
            </span>
          ) : r.kmGps != null ? (
            r.kmGps.toLocaleString("es-MX")
          ) : (
            "—"
          )}
        </td>
        <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>
          {r.kmRecorridos != null ? (
            <span title={r.fuenteKmRecorridos === "GPS" ? "Odómetro GPS entre esta carga y la anterior" : "Km capturado entre esta carga y la anterior (sin GPS para comparar)"}>
              {r.kmRecorridos.toLocaleString("es-MX")}{" "}
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{r.fuenteKmRecorridos === "GPS" ? "GPS" : "Captura"}</span>
            </span>
          ) : (
            "—"
          )}
          {r.fuenteKmRecorridos === "GPS" && r.kmCapturaRecorridos != null && r.kmCapturaRecorridos !== r.kmRecorridos && (
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
              capturado: {r.kmCapturaRecorridos.toLocaleString("es-MX")}
            </div>
          )}
        </td>
        <td className="px-4 py-3" style={td}>{r.estacion ?? "—"}</td>
        <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{r.rendimientoCalculado ? `${Number(r.rendimientoCalculado).toFixed(1)} km/L` : "—"}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {r.alertaSobrellenado && (
              <BadgeMotivo label="Excede capacidad" motivo={r.motivoSobrellenado ?? null} color="var(--color-status-escena)" bg="var(--status-escena-bg)" />
            )}
            {r.discrepanciaGps && <BadgeMotivo label="Km ≠ GPS" motivo={r.discrepanciaGps} color="var(--color-status-revision)" bg="var(--status-revision-bg)" />}
            {isAdmin && !confirmando && (
              <button
                onClick={() => setConfirmando(true)}
                className="flex items-center gap-1 rounded-md px-2.5 py-1"
                style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
              >
                <Trash2 size={12} /> Eliminar
              </button>
            )}
          </div>
        </td>
      </tr>
      {confirmando && (
        <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
          <td colSpan={9} className="px-4 py-4" style={{ background: "var(--status-escena-bg)" }}>
            <form action={handleEliminar} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={r.id} />
              <div className="flex items-start gap-2">
                <TriangleAlert size={16} color="var(--color-status-escena)" className="shrink-0 mt-0.5" />
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>
                  Esta acción no se puede deshacer. Escribe la razón por la que se elimina esta carga de combustible — quedará registrada en el historial.
                </span>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                  Razón de la eliminación *
                </label>
                <textarea
                  name="motivo"
                  required
                  minLength={5}
                  rows={2}
                  style={{ background: "var(--panel-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", borderRadius: "var(--radius-md)", padding: "8px 10px", width: "100%" }}
                />
              </div>
              {error && <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</span>}
              <div className="flex items-center gap-2">
                <button type="submit" disabled={pending} className="rounded-md px-3 h-8 font-semibold disabled:opacity-60" style={{ background: "var(--color-status-escena)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
                  {pending ? "Eliminando…" : "Sí, eliminar"}
                </button>
                <button type="button" onClick={() => setConfirmando(false)} className="rounded-md px-3 h-8" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                  Cancelar
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
