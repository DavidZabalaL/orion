"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { TipoGrafica, TipoAgregacion } from "@/lib/bi/metadata";

export type BiDato = { dimension: string; valor: number };

// Paleta categórica validada (contraste + separación CVD) — orden fijo,
// nunca se reasigna por rango. Ver skill dataviz/references/palette.md.
const SERIES_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const SERIES_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

function colorFor(i: number, dark: boolean) {
  const paleta = dark ? SERIES_DARK : SERIES_LIGHT;
  return paleta[i % paleta.length];
}

function fmtNumero(n: number) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(n);
}

const TAMANO_INICIAL = { width: 640, height: 320 };

/** Mide en píxeles reales el contenedor (vía ResizeObserver) para que el SVG se redibuje a ese tamaño exacto — así el contenido escala con toda la caja, no solo con el ancho. */
function useTamanoContenedor(ref: React.RefObject<HTMLDivElement | null>) {
  const [tamano, setTamano] = useState(TAMANO_INICIAL);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setTamano({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return tamano;
}

export function BiChart({ datos, tipoGrafica, ejeYLabel, agregacion }: { datos: BiDato[]; tipoGrafica: TipoGrafica; ejeYLabel: string; agregacion?: TipoAgregacion }) {
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const { width, height } = useTamanoContenedor(contenedorRef);

  return (
    <div ref={contenedorRef} className="h-full min-h-[280px] w-full">
      {datos.length === 0 ? (
        <div className="flex h-full items-center justify-center rounded-lg p-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
          Sin datos para esta combinación.
        </div>
      ) : (
        <BiChartInterno datos={datos} tipoGrafica={tipoGrafica} ejeYLabel={ejeYLabel} agregacion={agregacion} width={width} height={Math.max(height, 180)} hover={hover} setHover={setHover} uid={uid} />
      )}
    </div>
  );
}

function BiChartInterno(props: {
  datos: BiDato[];
  tipoGrafica: TipoGrafica;
  ejeYLabel: string;
  agregacion?: TipoAgregacion;
  width: number;
  height: number;
  hover: number | null;
  setHover: (i: number | null) => void;
  uid: string;
}) {
  const { datos, tipoGrafica, ejeYLabel, agregacion, width, height, hover, setHover, uid } = props;
  const dark = typeof document !== "undefined" ? document.documentElement.getAttribute("data-theme") !== "light" : true;

  if (tipoGrafica === "contador") return <BiContador datos={datos} ejeYLabel={ejeYLabel} agregacion={agregacion} width={width} height={height} />;
  if (tipoGrafica === "pie") return <BiPie datos={datos} dark={dark} hover={hover} setHover={setHover} uid={uid} ejeYLabel={ejeYLabel} width={width} height={height} />;
  if (tipoGrafica === "lineas") return <BiLineas datos={datos} dark={dark} hover={hover} setHover={setHover} ejeYLabel={ejeYLabel} width={width} height={height} />;
  return <BiBarras datos={datos} dark={dark} hover={hover} setHover={setHover} ejeYLabel={ejeYLabel} width={width} height={height} />;
}

function BiContador({ datos, ejeYLabel, agregacion, width, height }: { datos: BiDato[]; ejeYLabel: string; agregacion?: TipoAgregacion; width: number; height: number }) {
  const suma = datos.reduce((acc, d) => acc + d.valor, 0);
  const total = agregacion === "promedio" ? suma / datos.length : suma;
  const fontSize = Math.min(72, Math.max(28, Math.min(width, height) * 0.22));

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-center">
      <div style={{ fontFamily: "var(--font-mono)", fontSize, fontWeight: 700, color: "var(--sidebar-text-active)", fontVariantNumeric: "tabular-nums" }}>
        {fmtNumero(total)}
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
        {ejeYLabel}
      </div>
      {datos.length > 1 && (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", opacity: 0.7 }}>
          {agregacion === "promedio" ? `promedio de ${datos.length} grupos` : `suma de ${datos.length} grupos`}
        </div>
      )}
    </div>
  );
}

const PAD = { top: 16, right: 16, bottom: 40, left: 48 };

function ejes(w: number, h: number, datos: BiDato[]) {
  const max = Math.max(...datos.map((d) => d.valor), 0);
  const innerW = w - PAD.left - PAD.right;
  const innerH = h - PAD.top - PAD.bottom;
  return { max: max === 0 ? 1 : max, innerW, innerH };
}

function BiBarras({ datos, dark, hover, setHover, ejeYLabel, width, height }: { datos: BiDato[]; dark: boolean; hover: number | null; setHover: (i: number | null) => void; ejeYLabel: string; width: number; height: number }) {
  const W = Math.max(width, datos.length * 60);
  const H = height;
  const { max, innerW, innerH } = ejes(W, H, datos);
  const gap = 8;
  const bw = (innerW - gap * (datos.length - 1)) / datos.length;
  const mostrarEtiquetas = datos.length <= 12;
  const ink = dark ? "#c3c2b7" : "#52514e";
  const grid = dark ? "#2c2c2a" : "#e1e0d9";

  return (
    <div className="relative h-full w-full overflow-x-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH * (1 - t)} y2={PAD.top + innerH * (1 - t)} stroke={grid} strokeWidth={1} />
        ))}
        {datos.map((d, i) => {
          const h = (d.valor / max) * innerH;
          const x = PAD.left + i * (bw + gap);
          const y = PAD.top + innerH - h;
          return (
            <g key={d.dimension} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={y} width={bw} height={Math.max(h, 1)} rx={4} fill={colorFor(i, dark)} opacity={hover === null || hover === i ? 1 : 0.45} />
              {mostrarEtiquetas && (
                <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize={10} fontFamily="var(--font-ui)" fill={ink}>
                  {fmtNumero(d.valor)}
                </text>
              )}
              <text x={x + bw / 2} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={10} fontFamily="var(--font-ui)" fill={ink}>
                {d.dimension.length > 12 ? d.dimension.slice(0, 11) + "…" : d.dimension}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute rounded-md px-3 py-2 text-xs" style={{ left: `${((hover + 0.5) / datos.length) * 100}%`, top: 4, transform: "translateX(-50%)", background: "var(--panel-bg)", boxShadow: "var(--shadow-md)", fontFamily: "var(--font-ui)", color: "var(--sidebar-text-active)" }}>
          <div style={{ fontWeight: 600 }}>{datos[hover].dimension}</div>
          <div style={{ color: "var(--sidebar-text)" }}>{ejeYLabel}: {fmtNumero(datos[hover].valor)}</div>
        </div>
      )}
    </div>
  );
}

function BiLineas({ datos, dark, hover, setHover, ejeYLabel, width, height }: { datos: BiDato[]; dark: boolean; hover: number | null; setHover: (i: number | null) => void; ejeYLabel: string; width: number; height: number }) {
  const W = Math.max(width, datos.length * 50);
  const H = height;
  const { max, innerW, innerH } = ejes(W, H, datos);
  const stepX = datos.length > 1 ? innerW / (datos.length - 1) : 0;
  const puntos = datos.map((d, i) => ({ x: PAD.left + i * stepX, y: PAD.top + innerH - (d.valor / max) * innerH }));
  const path = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const color = colorFor(0, dark);
  const ink = dark ? "#c3c2b7" : "#52514e";
  const grid = dark ? "#2c2c2a" : "#e1e0d9";

  return (
    <div className="relative h-full w-full overflow-x-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH * (1 - t)} y2={PAD.top + innerH * (1 - t)} stroke={grid} strokeWidth={1} />
        ))}
        <path d={path} fill="none" stroke={color} strokeWidth={2} />
        {puntos.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <line x1={p.x} x2={p.x} y1={PAD.top} y2={H - PAD.bottom} stroke={hover === i ? grid : "transparent"} strokeWidth={1} />
            <circle cx={p.x} cy={p.y} r={hover === i ? 5 : 3} fill={color} />
            <text x={p.x} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={10} fontFamily="var(--font-ui)" fill={ink}>
              {datos[i].dimension}
            </text>
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute rounded-md px-3 py-2 text-xs" style={{ left: `${(puntos[hover].x / W) * 100}%`, top: 4, transform: "translateX(-50%)", background: "var(--panel-bg)", boxShadow: "var(--shadow-md)", fontFamily: "var(--font-ui)", color: "var(--sidebar-text-active)" }}>
          <div style={{ fontWeight: 600 }}>{datos[hover].dimension}</div>
          <div style={{ color: "var(--sidebar-text)" }}>{ejeYLabel}: {fmtNumero(datos[hover].valor)}</div>
        </div>
      )}
    </div>
  );
}

function BiPie({ datos, dark, hover, setHover, uid, ejeYLabel, width, height }: { datos: BiDato[]; dark: boolean; hover: number | null; setHover: (i: number | null) => void; uid: string; ejeYLabel: string; width: number; height: number }) {
  const total = datos.reduce((acc, d) => acc + d.valor, 0) || 1;
  const apilado = width < 420;
  const pieW = apilado ? width : Math.max(180, Math.min(width * 0.5, height));
  const pieH = height;
  const cx = pieW / 2;
  const cy = pieH / 2;
  const r = Math.max(40, Math.min(pieW, pieH) / 2 - 20);
  const surface = dark ? "#1a1a19" : "#fcfcfb";

  const prefijos = datos.reduce<{ acc: number; list: number[] }>(
    (estado, d) => ({ acc: estado.acc + d.valor, list: [...estado.list, estado.acc] }),
    { acc: 0, list: [] }
  ).list;

  const arcos = datos.map((d, i) => {
    const inicio = (prefijos[i] / total) * Math.PI * 2 - Math.PI / 2;
    const fin = ((prefijos[i] + d.valor) / total) * Math.PI * 2 - Math.PI / 2;
    const grandeArco = fin - inicio > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(inicio);
    const y1 = cy + r * Math.sin(inicio);
    const x2 = cx + r * Math.cos(fin);
    const y2 = cy + r * Math.sin(fin);
    return { d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${grandeArco} 1 ${x2},${y2} Z`, color: colorFor(i, dark), pct: d.valor / total };
  });

  return (
    <div className={`flex h-full gap-4 ${apilado ? "flex-col" : "flex-row items-center"}`}>
      <svg width={pieW} height={pieH} viewBox={`0 0 ${pieW} ${pieH}`} style={{ flexShrink: 0 }}>
        {arcos.map((a, i) => (
          <path
            key={uid + i}
            d={a.d}
            fill={a.color}
            stroke={surface}
            strokeWidth={2}
            opacity={hover === null || hover === i ? 1 : 0.45}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      <div className="flex flex-1 flex-col gap-1.5 overflow-auto">
        {datos.map((d, i) => (
          <div key={d.dimension} className="flex items-center gap-2" style={{ opacity: hover === null || hover === i ? 1 : 0.5, fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: colorFor(i, dark), flexShrink: 0 }} />
            <span style={{ color: "var(--sidebar-text-active)" }}>{d.dimension}</span>
            <span style={{ color: "var(--sidebar-text)" }}>
              — {fmtNumero(d.valor)} {ejeYLabel} ({Math.round((arcos[i].pct ?? 0) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
