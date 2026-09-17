"use client";

import { useId, useMemo, useState } from "react";

export type PuntoMovimiento = { timestamp: string; velocidad: number | null };

const ANCHO = 600;
const ALTO = 160;
const PAD_IZQ = 32;
const PAD_INF = 20;

/** Gráfico de velocidad a lo largo del día actual (hora de México), en SVG plano — el proyecto no usa ninguna librería de charting. */
export function MovimientoChart({ puntos }: { puntos: PuntoMovimiento[] }) {
  const gradientId = useId();
  const [hover, setHover] = useState<{ x: number; punto: PuntoMovimiento } | null>(null);

  const validos = useMemo(
    () => puntos.filter((p) => p.velocidad != null).map((p) => ({ ...p, velocidad: p.velocidad as number })),
    [puntos]
  );

  if (validos.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ height: ALTO, background: "var(--chip)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
      >
        Sin lecturas suficientes hoy para graficar movimiento.
      </div>
    );
  }

  const maxVel = Math.max(100, ...validos.map((p) => p.velocidad));
  const anchoUtil = ANCHO - PAD_IZQ;
  const altoUtil = ALTO - PAD_INF;

  const primerTs = new Date(validos[0].timestamp).getTime();
  const ultimoTs = new Date(validos[validos.length - 1].timestamp).getTime();
  const rango = Math.max(1, ultimoTs - primerTs);

  const coords = validos.map((p) => ({
    x: PAD_IZQ + ((new Date(p.timestamp).getTime() - primerTs) / rango) * anchoUtil,
    y: altoUtil - (p.velocidad / maxVel) * altoUtil,
    punto: p,
  }));

  const linea = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${linea} L${coords[coords.length - 1].x.toFixed(1)},${altoUtil} L${coords[0].x.toFixed(1)},${altoUtil} Z`;

  function alMoverMouse(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xRelativo = ((e.clientX - rect.left) / rect.width) * ANCHO;
    let cercano = coords[0];
    for (const c of coords) if (Math.abs(c.x - xRelativo) < Math.abs(cercano.x - xRelativo)) cercano = c;
    setHover({ x: cercano.x, punto: cercano.punto });
  }

  const etiquetasY = [0, 25, 50, 75, 100].filter((v) => v <= maxVel || v === 0);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full" style={{ display: "block" }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {etiquetasY.map((v) => {
          const y = altoUtil - (v / maxVel) * altoUtil;
          return (
            <g key={v}>
              <line x1={PAD_IZQ} x2={ANCHO} y1={y} y2={y} stroke="var(--field-border)" strokeDasharray="2,3" />
              <text x={0} y={y + 3} fontSize="9" fill="var(--sidebar-text)">{v}</text>
            </g>
          );
        })}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={linea} fill="none" stroke="var(--color-primary)" strokeWidth={2} />

        {hover && (
          <g>
            <line x1={hover.x} x2={hover.x} y1={0} y2={altoUtil} stroke="var(--sidebar-text)" strokeDasharray="2,3" />
            <circle cx={hover.x} cy={coords.find((c) => c.x === hover.x)?.y ?? 0} r={3.5} fill="var(--color-primary)" />
          </g>
        )}

        <rect
          x={PAD_IZQ}
          y={0}
          width={anchoUtil}
          height={ALTO}
          fill="transparent"
          onMouseMove={alMoverMouse}
          onMouseLeave={() => setHover(null)}
        />
      </svg>
      {hover && (
        <div
          className="absolute rounded-md px-2 py-1 pointer-events-none"
          style={{
            left: `min(${(hover.x / ANCHO) * 100}%, calc(100% - 110px))`,
            top: 4,
            background: "var(--panel-bg)",
            boxShadow: "var(--shadow-sm)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: "var(--sidebar-text-active)",
            whiteSpace: "nowrap",
          }}
        >
          {new Date(hover.punto.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} · {hover.punto.velocidad?.toFixed(0)} km/h
        </div>
      )}
    </div>
  );
}
