"use client";

import { useState, useMemo } from "react";
import { Layers, Check, X, Building2, ScanLine, Radio, TowerControl, Video, MapPin } from "lucide-react";
import type { CapaInfo } from "@/lib/geo/puntos-clave";

const ICONOS_MAPA: Record<string, typeof Building2> = {
  Building2,
  ScanLine,
  Radio,
  TowerControl,
  Video,
  MapPin,
};

export function ControlCapasPuntos({
  capas,
  capasActivas,
  onToggleCapa,
  onActivarTodas,
  onDesactivarTodas,
}: {
  capas: CapaInfo[];
  capasActivas: string[];
  onToggleCapa: (id: string) => void;
  onActivarTodas: () => void;
  onDesactivarTodas: () => void;
}) {
  const [abierto, setAbierto] = useState(false);

  // Agrupar capas por región
  const porRegion = useMemo(() => {
    const mapa: Record<string, CapaInfo[]> = {};
    for (const c of capas) {
      if (!mapa[c.region]) mapa[c.region] = [];
      mapa[c.region].push(c);
    }
    return mapa;
  }, [capas]);

  const totalPuntosVisibles = useMemo(() => {
    return capas
      .filter((c) => capasActivas.includes(c.id))
      .reduce((acc, c) => acc + c.totalPuntos, 0);
  }, [capas, capasActivas]);

  return (
    <div className="absolute top-3 left-14 z-[999] font-sans">
      {/* Botón flotante */}
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-md transition-all text-sm font-semibold cursor-pointer"
        style={{
          background: "var(--panel-bg, #ffffff)",
          color: "var(--sidebar-text-active, #0f172a)",
          border: "1px solid var(--border-color, #e2e8f0)",
          boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1))",
        }}
        title="Capas de instalaciones y puntos clave"
      >
        <Layers size={16} className="text-blue-600" />
        <span>Capas Clave</span>
        {capasActivas.length > 0 && (
          <span
            className="flex items-center justify-center text-xs px-1.5 py-0.5 rounded-full font-bold"
            style={{
              background: "var(--color-primary, #2563eb)",
              color: "#ffffff",
            }}
          >
            {capasActivas.length}
          </span>
        )}
      </button>

      {/* Panel desplegable de capas */}
      {abierto && (
        <div
          className="mt-2 w-80 max-h-[75vh] flex flex-col rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2"
          style={{
            background: "var(--panel-bg, #ffffff)",
            border: "1px solid var(--border-color, #e2e8f0)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* Header */}
          <div
            className="p-3.5 flex items-center justify-between border-b"
            style={{ borderColor: "var(--border-color, #e2e8f0)" }}
          >
            <div>
              <div className="text-sm font-bold" style={{ color: "var(--sidebar-text-active)" }}>
                Puntos Clave / KMZ
              </div>
              <div className="text-xs" style={{ color: "var(--sidebar-text)" }}>
                {totalPuntosVisibles.toLocaleString("es-MX")} puntos activos en mapa
              </div>
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="p-1 rounded-md hover:bg-slate-100 transition-colors"
              style={{ color: "var(--sidebar-text)" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Acciones Rápidas */}
          <div
            className="px-3 py-2 flex items-center justify-between text-xs bg-slate-50/50 border-b"
            style={{ borderColor: "var(--border-color, #e2e8f0)" }}
          >
            <span style={{ color: "var(--sidebar-text)" }}>Selección rápida:</span>
            <div className="flex gap-2">
              <button
                onClick={onActivarTodas}
                className="hover:underline font-semibold cursor-pointer"
                style={{ color: "var(--color-primary, #2563eb)" }}
              >
                Todas
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={onDesactivarTodas}
                className="hover:underline font-semibold cursor-pointer"
                style={{ color: "var(--sidebar-text)" }}
              >
                Ninguna
              </button>
            </div>
          </div>

          {/* Lista de Capas agrupadas */}
          <div className="p-3 overflow-y-auto flex flex-col gap-3 text-xs">
            {Object.entries(porRegion).map(([region, lista]) => (
              <div key={region} className="flex flex-col gap-1.5">
                <div
                  className="font-bold uppercase tracking-wider text-[10px]"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {region}
                </div>
                {lista.map((c) => {
                  const activa = capasActivas.includes(c.id);
                  const Icono = ICONOS_MAPA[c.icono] ?? MapPin;

                  return (
                    <label
                      key={c.id}
                      onClick={() => onToggleCapa(c.id)}
                      className="flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors"
                      style={{
                        background: activa ? "var(--chip, #f1f5f9)" : "transparent",
                        border: "1px solid",
                        borderColor: activa ? "var(--border-color, #cbd5e1)" : "transparent",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center text-white"
                          style={{
                            background: activa ? "var(--color-primary, #2563eb)" : "#cbd5e1",
                          }}
                        >
                          {activa && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ background: c.color }}
                        >
                          <Icono size={12} color="#ffffff" />
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: activa
                              ? "var(--sidebar-text-active, #0f172a)"
                              : "var(--sidebar-text, #64748b)",
                          }}
                        >
                          {c.nombre.replace(`${region} — `, "")}
                        </span>
                      </div>
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded font-mono"
                        style={{
                          background: "var(--field-bg, #f8fafc)",
                          color: "var(--sidebar-text, #64748b)",
                        }}
                      >
                        {c.totalPuntos}
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
