"use client";

import { useState, useTransition } from "react";
import { Car, Clock, CheckCircle2, LogIn, LogOut, RefreshCw } from "lucide-react";
import { tomarUnidad, liberarUnidad, type DatosTurno } from "@/app/(app)/operador/turno/actions";

function duracion(inicio: Date, fin: Date | null): string {
  const ms = (fin ?? new Date()).getTime() - new Date(inicio).getTime();
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function hora(fecha: Date): string {
  return new Date(fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export function PanelTurnoOperador({ datos }: { datos: DatosTurno }) {
  const [pending, startTransition] = useTransition();
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(
    datos.sesionActiva?.numeroEconomico ?? ""
  );
  const [error, setError] = useState<string | null>(null);

  const sesionActiva = datos.sesionActiva;
  const mismaUnidad = sesionActiva?.numeroEconomico === unidadSeleccionada;

  function handleTomar() {
    if (!unidadSeleccionada) return;
    setError(null);
    startTransition(async () => {
      try {
        await tomarUnidad(unidadSeleccionada);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al tomar la unidad.");
      }
    });
  }

  function handleLiberar() {
    setError(null);
    startTransition(async () => {
      try {
        await liberarUnidad();
        setUnidadSeleccionada("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al liberar la unidad.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Unidad activa */}
      <div
        className="rounded-xl p-5 flex flex-col gap-4"
        style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex items-center gap-2">
          <Car size={18} style={{ color: "var(--color-primary)" }} />
          <span style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: "var(--text-base)", color: "var(--sidebar-text-active)" }}>
            Unidad actual
          </span>
        </div>

        {sesionActiva ? (
          <div className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: "var(--status-ok-bg)" }}>
            <CheckCircle2 size={20} style={{ color: "var(--color-status-ok)", flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--color-status-ok)" }}>
                {sesionActiva.numeroEconomico}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                {sesionActiva.marcaModelo} · Desde {hora(sesionActiva.inicio)} ({duracion(sesionActiva.inicio, null)})
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg px-4 py-3" style={{ background: "var(--field-bg)" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              Sin unidad activa
            </span>
          </div>
        )}

        {/* Selector + botones */}
        <div className="flex flex-col gap-3">
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--sidebar-text)",
                marginBottom: 6,
              }}
            >
              Seleccionar unidad
            </label>
            <select
              value={unidadSeleccionada}
              onChange={(e) => setUnidadSeleccionada(e.target.value)}
              disabled={pending}
              style={{
                width: "100%",
                height: "var(--h-md)",
                background: "var(--field-bg)",
                border: "1px solid var(--field-border)",
                color: "var(--field-text)",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-base)",
                borderRadius: "var(--radius-md)",
                padding: "0 12px",
              }}
            >
              <option value="">-- Elige una unidad --</option>
              {datos.unidadesDisponibles.map((u) => (
                <option key={u.numeroEconomico} value={u.numeroEconomico}>
                  {u.numeroEconomico} · {u.marcaModelo} · {u.placas}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleTomar}
              disabled={pending || !unidadSeleccionada || (!!sesionActiva && mismaUnidad)}
              className="flex items-center gap-2 rounded-md px-4 disabled:opacity-50"
              style={{
                height: "var(--h-md)",
                background: "var(--color-primary)",
                color: "#fff",
                fontFamily: "var(--font-ui)",
                fontWeight: 600,
                fontSize: "var(--text-base)",
              }}
            >
              {pending ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <LogIn size={15} />
              )}
              {sesionActiva && !mismaUnidad ? "Cambiar unidad" : "Tomar unidad"}
            </button>

            {sesionActiva && (
              <button
                onClick={handleLiberar}
                disabled={pending}
                className="flex items-center gap-2 rounded-md px-4 disabled:opacity-50"
                style={{
                  height: "var(--h-md)",
                  background: "var(--status-baja-bg, #fee2e2)",
                  color: "var(--color-status-baja, #dc2626)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 600,
                  fontSize: "var(--text-base)",
                }}
              >
                <LogOut size={15} />
                Liberar unidad
              </button>
            )}
          </div>

          {error && (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-baja, #dc2626)" }}>
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Bitácora del día */}
      <div
        className="rounded-xl p-5 flex flex-col gap-3"
        style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex items-center gap-2">
          <Clock size={18} style={{ color: "var(--sidebar-text)" }} />
          <span style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: "var(--text-base)", color: "var(--sidebar-text-active)" }}>
            Registro del día
          </span>
        </div>

        {datos.registrosHoy.length === 0 ? (
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
            Sin movimientos hoy.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {datos.registrosHoy.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg px-4 py-2.5"
                style={{ background: "var(--field-bg)" }}
              >
                <div className="min-w-0">
                  <span style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>
                    {r.numeroEconomico}
                  </span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", marginLeft: 8 }}>
                    {r.marcaModelo}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                    {hora(r.inicio)} → {r.fin ? hora(r.fin) : "activo"}
                  </span>
                  <span
                    className="rounded px-2 py-0.5"
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "var(--text-xs)",
                      fontWeight: 600,
                      background: r.fin ? "var(--field-bg)" : "var(--status-ok-bg)",
                      color: r.fin ? "var(--sidebar-text)" : "var(--color-status-ok)",
                      border: "1px solid",
                      borderColor: r.fin ? "var(--field-border)" : "var(--color-status-ok)",
                    }}
                  >
                    {duracion(r.inicio, r.fin)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
