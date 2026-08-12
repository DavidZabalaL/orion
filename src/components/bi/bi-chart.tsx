"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { TipoGrafica, TipoAgregacion } from "@/lib/bi/metadata";
import { resolverEstado } from "@/lib/bi/estados-mexico";

export type BiDato = { dimension: string; valor: number };
export type BiCaja = { dimension: string; min: number; q1: number; mediana: number; q3: number; max: number };
export type BiPar = { dimension: string; izquierda: number; derecha: number };
export type BiCruzado = { series: string[]; filas: { dimension: string; valores: Record<string, number> }[]; truncado: boolean };

// Paleta categórica validada (contraste + separación CVD) — orden fijo,
// nunca se reasigna por rango. Ver skill dataviz/references/palette.md.
const SERIES_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const SERIES_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
// Par divergente (frío/cálido) para "por encima" / "por debajo" de una referencia.
const DIVERGENTE_LIGHT = { alto: "#2a78d6", bajo: "#e34948" };
const DIVERGENTE_DARK = { alto: "#3987e5", bajo: "#e66767" };
// Rampa secuencial de un solo tono (azul), para magnitud continua (calendario).
const SECUENCIAL_LIGHT = ["#eef4fc", "#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#1c5cab", "#104281"];
const SECUENCIAL_DARK = ["#0d2338", "#104281", "#184f95", "#1c5cab", "#3987e5", "#6da7ec", "#9ec5f4"];

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

export function BiChart({
  datos,
  cajas,
  pares,
  splitLabels,
  cruzado,
  tipoGrafica,
  ejeYLabel,
  agregacion,
  truncado,
}: {
  datos: BiDato[];
  cajas?: BiCaja[];
  pares?: BiPar[];
  splitLabels?: [string, string];
  cruzado?: BiCruzado | null;
  tipoGrafica: TipoGrafica;
  ejeYLabel: string;
  agregacion?: TipoAgregacion;
  truncado?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const { width, height } = useTamanoContenedor(contenedorRef);

  const vacio =
    tipoGrafica === "caja"
      ? (cajas?.length ?? 0) === 0
      : tipoGrafica === "piramide"
      ? (pares?.length ?? 0) === 0
      : tipoGrafica === "barras" && cruzado
      ? cruzado.filas.length === 0
      : datos.length === 0;

  return (
    <div ref={contenedorRef} className="flex h-full min-h-[280px] w-full flex-col gap-2">
      {truncado && (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
          Mostrando una muestra de los primeros puntos — hay más datos de los que se grafican aquí.
        </div>
      )}
      <div className="min-h-0 flex-1">
        {vacio ? (
          <div className="flex h-full items-center justify-center rounded-lg p-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
            Sin datos para esta combinación.
          </div>
        ) : (
          <BiChartInterno
            datos={datos}
            cajas={cajas ?? []}
            pares={pares ?? []}
            splitLabels={splitLabels ?? ["", ""]}
            cruzado={cruzado ?? null}
            tipoGrafica={tipoGrafica}
            ejeYLabel={ejeYLabel}
            agregacion={agregacion}
            width={width}
            height={Math.max(height, 180)}
            hover={hover}
            setHover={setHover}
            uid={uid}
          />
        )}
      </div>
    </div>
  );
}

function BiChartInterno(props: {
  datos: BiDato[];
  cajas: BiCaja[];
  pares: BiPar[];
  splitLabels: [string, string];
  cruzado: BiCruzado | null;
  tipoGrafica: TipoGrafica;
  ejeYLabel: string;
  agregacion?: TipoAgregacion;
  width: number;
  height: number;
  hover: number | null;
  setHover: (i: number | null) => void;
  uid: string;
}) {
  const { datos, cajas, pares, splitLabels, cruzado, tipoGrafica, ejeYLabel, agregacion, width, height, hover, setHover, uid } = props;
  const dark = typeof document !== "undefined" ? document.documentElement.getAttribute("data-theme") !== "light" : true;

  if (tipoGrafica === "contador") return <BiContador datos={datos} ejeYLabel={ejeYLabel} agregacion={agregacion} width={width} height={height} />;
  if (tipoGrafica === "pie") return <BiPie datos={datos} dark={dark} hover={hover} setHover={setHover} uid={uid} ejeYLabel={ejeYLabel} width={width} height={height} />;
  if (tipoGrafica === "lineas") return <BiLineas datos={datos} dark={dark} hover={hover} setHover={setHover} ejeYLabel={ejeYLabel} width={width} height={height} />;
  if (tipoGrafica === "puntos") return <BiPuntos datos={datos} dark={dark} hover={hover} setHover={setHover} ejeYLabel={ejeYLabel} width={width} height={height} />;
  if (tipoGrafica === "divergente") return <BiDivergente datos={datos} dark={dark} hover={hover} setHover={setHover} ejeYLabel={ejeYLabel} width={width} height={height} />;
  if (tipoGrafica === "dispersion") return <BiDispersion datos={datos} dark={dark} hover={hover} setHover={setHover} ejeYLabel={ejeYLabel} width={width} height={height} />;
  if (tipoGrafica === "calendario") return <BiCalendario datos={datos} dark={dark} hover={hover} setHover={setHover} ejeYLabel={ejeYLabel} width={width} height={height} />;
  if (tipoGrafica === "caja") return <BiCajaChart cajas={cajas} dark={dark} hover={hover} setHover={setHover} ejeYLabel={ejeYLabel} width={width} height={height} />;
  if (tipoGrafica === "piramide") return <BiPiramide pares={pares} splitLabels={splitLabels} dark={dark} hover={hover} setHover={setHover} ejeYLabel={ejeYLabel} width={width} height={height} />;
  if (tipoGrafica === "mapa") return <BiMapa datos={datos} dark={dark} hover={hover} setHover={setHover} ejeYLabel={ejeYLabel} width={width} height={height} />;
  if (tipoGrafica === "barras" && cruzado) return <BiBarrasAgrupadas cruzado={cruzado} dark={dark} hover={hover} setHover={setHover} ejeYLabel={ejeYLabel} width={width} height={height} />;
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

function ejes(w: number, h: number, valores: number[]) {
  const max = Math.max(...valores, 0);
  const innerW = w - PAD.left - PAD.right;
  const innerH = h - PAD.top - PAD.bottom;
  return { max: max === 0 ? 1 : max, innerW, innerH };
}

function BiBarras({ datos, dark, hover, setHover, ejeYLabel, width, height }: { datos: BiDato[]; dark: boolean; hover: number | null; setHover: (i: number | null) => void; ejeYLabel: string; width: number; height: number }) {
  const W = Math.max(width, datos.length * 60);
  const H = height;
  const { max, innerW, innerH } = ejes(W, H, datos.map((d) => d.valor));
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

/** Barras agrupadas: cruce de 2 dimensiones — una barra por serie dentro de cada grupo (eje X). `hover` indexa `dimension::serie` aplanado. */
function BiBarrasAgrupadas({ cruzado, dark, hover, setHover, ejeYLabel, width, height }: { cruzado: BiCruzado; dark: boolean; hover: number | null; setHover: (i: number | null) => void; ejeYLabel: string; width: number; height: number }) {
  const { series, filas } = cruzado;
  const nSeries = Math.max(series.length, 1);
  const legendH = 28;
  const groupMinWidth = Math.max(50, nSeries * 16 + 12);
  const W = Math.max(width, filas.length * groupMinWidth);
  const H = height;
  const max = Math.max(...filas.flatMap((f) => series.map((s) => f.valores[s] ?? 0)), 0);
  const { max: maxSeguro, innerW, innerH } = ejes(W, H - legendH, [max]);
  const groupGap = 16;
  const groupWidth = (innerW - groupGap * (filas.length - 1)) / filas.length;
  const barGap = 2;
  const barWidth = (groupWidth - barGap * (nSeries - 1)) / nSeries;
  const mostrarEtiquetas = filas.length <= 8;
  const ink = dark ? "#c3c2b7" : "#52514e";
  const grid = dark ? "#2c2c2a" : "#e1e0d9";
  const celdaHover = hover !== null ? { fila: Math.floor(hover / nSeries), serie: hover % nSeries } : null;

  return (
    <div className="relative flex h-full w-full flex-col gap-1">
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-1" style={{ height: legendH }}>
        {series.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: colorFor(i, dark), flexShrink: 0 }} />
            {s}
          </div>
        ))}
      </div>
      <div className="relative min-h-0 flex-1 overflow-x-auto">
        <svg width={W} height={H - legendH} viewBox={`0 0 ${W} ${H - legendH}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH * (1 - t)} y2={PAD.top + innerH * (1 - t)} stroke={grid} strokeWidth={1} />
          ))}
          {filas.map((f, fi) => {
            const gx = PAD.left + fi * (groupWidth + groupGap);
            return (
              <g key={f.dimension}>
                {series.map((s, si) => {
                  const valor = f.valores[s] ?? 0;
                  const h = (valor / maxSeguro) * innerH;
                  const x = gx + si * (barWidth + barGap);
                  const y = PAD.top + innerH - h;
                  const idx = fi * nSeries + si;
                  return (
                    <g key={s} onMouseEnter={() => setHover(idx)} onMouseLeave={() => setHover(null)}>
                      <rect x={x} y={y} width={Math.max(barWidth, 1)} height={Math.max(h, 1)} rx={3} fill={colorFor(si, dark)} opacity={hover === null || hover === idx ? 1 : 0.4} />
                      {mostrarEtiquetas && (
                        <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fontSize={9} fontFamily="var(--font-ui)" fill={ink}>
                          {fmtNumero(valor)}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text x={gx + groupWidth / 2} y={H - legendH - PAD.bottom + 16} textAnchor="middle" fontSize={10} fontFamily="var(--font-ui)" fill={ink}>
                  {f.dimension.length > 14 ? f.dimension.slice(0, 13) + "…" : f.dimension}
                </text>
              </g>
            );
          })}
        </svg>
        {celdaHover && filas[celdaHover.fila] && (
          <div
            className="pointer-events-none absolute rounded-md px-3 py-2 text-xs"
            style={{
              left: `${((celdaHover.fila + 0.5) / filas.length) * 100}%`,
              top: 4,
              transform: "translateX(-50%)",
              background: "var(--panel-bg)",
              boxShadow: "var(--shadow-md)",
              fontFamily: "var(--font-ui)",
              color: "var(--sidebar-text-active)",
            }}
          >
            <div style={{ fontWeight: 600 }}>{filas[celdaHover.fila].dimension}</div>
            <div style={{ color: colorFor(celdaHover.serie, dark) }}>
              {series[celdaHover.serie]}: {fmtNumero(filas[celdaHover.fila].valores[series[celdaHover.serie]] ?? 0)}
            </div>
            <div style={{ color: "var(--sidebar-text)", opacity: 0.7 }}>{ejeYLabel}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function BiLineas({ datos, dark, hover, setHover, ejeYLabel, width, height }: { datos: BiDato[]; dark: boolean; hover: number | null; setHover: (i: number | null) => void; ejeYLabel: string; width: number; height: number }) {
  const W = Math.max(width, datos.length * 50);
  const H = height;
  const { max, innerW, innerH } = ejes(W, H, datos.map((d) => d.valor));
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

/** Diagrama de tira de puntos: una fila por categoría, punto posicionado por su valor — alternativa más ligera a las barras para rankings. */
function BiPuntos({ datos, dark, hover, setHover, ejeYLabel, width, height }: { datos: BiDato[]; dark: boolean; hover: number | null; setHover: (i: number | null) => void; ejeYLabel: string; width: number; height: number }) {
  const W = width;
  const filaAlto = 28;
  const H = Math.max(height, PAD.top + PAD.bottom + datos.length * filaAlto);
  const max = Math.max(...datos.map((d) => d.valor), 0) || 1;
  const labelAncho = 130;
  const innerW = W - PAD.left - labelAncho - PAD.right;
  const ink = dark ? "#c3c2b7" : "#52514e";
  const grid = dark ? "#2c2c2a" : "#e1e0d9";
  const color = colorFor(0, dark);

  return (
    <div className="relative h-full w-full overflow-y-auto overflow-x-hidden">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {datos.map((d, i) => {
          const y = PAD.top + i * filaAlto + filaAlto / 2;
          const x0 = PAD.left + labelAncho;
          const x = x0 + (d.valor / max) * innerW;
          return (
            <g key={d.dimension} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <text x={PAD.left} y={y + 4} fontSize={11} fontFamily="var(--font-ui)" fill={ink}>
                {d.dimension.length > 20 ? d.dimension.slice(0, 19) + "…" : d.dimension}
              </text>
              <line x1={x0} x2={W - PAD.right} y1={y} y2={y} stroke={grid} strokeWidth={1} />
              <line x1={x0} x2={x} y1={y} y2={y} stroke={color} strokeWidth={2} opacity={hover === null || hover === i ? 1 : 0.4} />
              <circle cx={x} cy={y} r={hover === i ? 6 : 4.5} fill={color} opacity={hover === null || hover === i ? 1 : 0.4} />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute rounded-md px-3 py-2 text-xs" style={{ left: PAD.left + labelAncho, top: PAD.top + hover * filaAlto, transform: "translateY(-100%)", background: "var(--panel-bg)", boxShadow: "var(--shadow-md)", fontFamily: "var(--font-ui)", color: "var(--sidebar-text-active)" }}>
          <div style={{ fontWeight: 600 }}>{datos[hover].dimension}</div>
          <div style={{ color: "var(--sidebar-text)" }}>{ejeYLabel}: {fmtNumero(datos[hover].valor)}</div>
        </div>
      )}
    </div>
  );
}

/** Barra divergente: desviación de cada categoría respecto al promedio del conjunto mostrado. */
function BiDivergente({ datos, dark, hover, setHover, ejeYLabel, width, height }: { datos: BiDato[]; dark: boolean; hover: number | null; setHover: (i: number | null) => void; ejeYLabel: string; width: number; height: number }) {
  const promedio = datos.reduce((acc, d) => acc + d.valor, 0) / datos.length;
  const desviaciones = datos.map((d) => d.valor - promedio);
  const maxAbs = Math.max(...desviaciones.map((v) => Math.abs(v)), 1);

  const W = width;
  const filaAlto = 28;
  const H = Math.max(height, PAD.top + PAD.bottom + datos.length * filaAlto);
  const labelAncho = 130;
  const centro = PAD.left + labelAncho + (W - PAD.left - labelAncho - PAD.right) / 2;
  const mitad = (W - PAD.left - labelAncho - PAD.right) / 2;
  const ink = dark ? "#c3c2b7" : "#52514e";
  const grid = dark ? "#2c2c2a" : "#e1e0d9";
  const paleta = dark ? DIVERGENTE_DARK : DIVERGENTE_LIGHT;

  return (
    <div className="relative h-full w-full overflow-y-auto overflow-x-hidden">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1={centro} x2={centro} y1={PAD.top - 4} y2={H - PAD.bottom + 4} stroke={grid} strokeWidth={1.5} />
        {datos.map((d, i) => {
          const y = PAD.top + i * filaAlto + filaAlto / 2;
          const desv = desviaciones[i];
          const anchoBarra = (Math.abs(desv) / maxAbs) * mitad;
          const x = desv >= 0 ? centro : centro - anchoBarra;
          return (
            <g key={d.dimension} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <text x={PAD.left} y={y + 4} fontSize={11} fontFamily="var(--font-ui)" fill={ink}>
                {d.dimension.length > 20 ? d.dimension.slice(0, 19) + "…" : d.dimension}
              </text>
              <rect x={x} y={y - 7} width={Math.max(anchoBarra, 1)} height={14} rx={3} fill={desv >= 0 ? paleta.alto : paleta.bajo} opacity={hover === null || hover === i ? 1 : 0.45} />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute rounded-md px-3 py-2 text-xs" style={{ left: centro, top: PAD.top + hover * filaAlto, transform: "translateY(-100%)", background: "var(--panel-bg)", boxShadow: "var(--shadow-md)", fontFamily: "var(--font-ui)", color: "var(--sidebar-text-active)" }}>
          <div style={{ fontWeight: 600 }}>{datos[hover].dimension}</div>
          <div style={{ color: "var(--sidebar-text)" }}>{ejeYLabel}: {fmtNumero(datos[hover].valor)}</div>
          <div style={{ color: "var(--sidebar-text)" }}>Promedio: {fmtNumero(promedio)} ({desviaciones[hover] >= 0 ? "+" : ""}{fmtNumero(desviaciones[hover])})</div>
        </div>
      )}
    </div>
  );
}

/** Dispersión: cada fila de "datos" es un punto (dimension = X como texto numérico, valor = Y), sin agrupar. */
function BiDispersion({ datos, dark, hover, setHover, ejeYLabel, width, height }: { datos: BiDato[]; dark: boolean; hover: number | null; setHover: (i: number | null) => void; ejeYLabel: string; width: number; height: number }) {
  const puntos = datos.map((d) => ({ x: Number(d.dimension), y: d.valor }));
  const W = width;
  const H = height;
  const minX = Math.min(...puntos.map((p) => p.x));
  const maxX = Math.max(...puntos.map((p) => p.x));
  const minY = Math.min(...puntos.map((p) => p.y));
  const maxY = Math.max(...puntos.map((p) => p.y));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const rangoX = maxX - minX || 1;
  const rangoY = maxY - minY || 1;
  const ink = dark ? "#c3c2b7" : "#52514e";
  const grid = dark ? "#2c2c2a" : "#e1e0d9";
  const color = colorFor(0, dark);

  const posiciones = puntos.map((p) => ({
    cx: PAD.left + ((p.x - minX) / rangoX) * innerW,
    cy: PAD.top + innerH - ((p.y - minY) / rangoY) * innerH,
    x: p.x,
    y: p.y,
  }));

  return (
    <div className="relative h-full w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH * (1 - t)} y2={PAD.top + innerH * (1 - t)} stroke={grid} strokeWidth={1} />
        ))}
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H - PAD.bottom} stroke={grid} strokeWidth={1} />
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke={grid} strokeWidth={1} />
        {posiciones.map((p, i) => (
          <circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r={hover === i ? 6 : 4}
            fill={color}
            opacity={hover === null || hover === i ? 0.75 : 0.3}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <text x={PAD.left} y={H - 6} fontSize={10} fontFamily="var(--font-ui)" fill={ink}>{fmtNumero(minX)}</text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize={10} fontFamily="var(--font-ui)" fill={ink}>{fmtNumero(maxX)}</text>
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute rounded-md px-3 py-2 text-xs" style={{ left: posiciones[hover].cx, top: posiciones[hover].cy, transform: "translate(-50%, -120%)", background: "var(--panel-bg)", boxShadow: "var(--shadow-md)", fontFamily: "var(--font-ui)", color: "var(--sidebar-text-active)" }}>
          <div style={{ color: "var(--sidebar-text)" }}>X: {fmtNumero(posiciones[hover].x)}</div>
          <div style={{ color: "var(--sidebar-text)" }}>{ejeYLabel}: {fmtNumero(posiciones[hover].y)}</div>
        </div>
      )}
    </div>
  );
}

/** Mapa de calor calendario: dimension = "YYYY-MM-DD". Cuadrícula de semanas (columnas) x días (filas), color por magnitud (rampa secuencial de un tono). */
function BiCalendario({ datos, dark, hover, setHover, ejeYLabel, width, height }: { datos: BiDato[]; dark: boolean; hover: number | null; setHover: (i: number | null) => void; ejeYLabel: string; width: number; height: number }) {
  const fechas = datos.map((d) => new Date(d.dimension + "T00:00:00Z"));
  const inicio = new Date(Math.min(...fechas.map((f) => f.getTime())));
  const fin = new Date(Math.max(...fechas.map((f) => f.getTime())));
  const inicioSemana = new Date(inicio);
  inicioSemana.setUTCDate(inicioSemana.getUTCDate() - inicioSemana.getUTCDay());

  const totalDias = Math.round((fin.getTime() - inicioSemana.getTime()) / 86_400_000) + 1;
  const semanas = Math.ceil(totalDias / 7);
  const max = Math.max(...datos.map((d) => d.valor), 0) || 1;
  const rampa = dark ? SECUENCIAL_DARK : SECUENCIAL_LIGHT;
  const ink = dark ? "#c3c2b7" : "#52514e";

  const porFecha = new Map(datos.map((d, i) => [d.dimension, { valor: d.valor, i }]));
  const celda = Math.min(22, Math.max(10, (width - 20) / semanas));
  const W = 20 + semanas * (celda + 3);
  const H = Math.max(height, 20 + 7 * (celda + 3));
  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const dias = Array.from({ length: semanas * 7 }, (_, offset) => {
    const fecha = new Date(inicioSemana);
    fecha.setUTCDate(fecha.getUTCDate() + offset);
    const iso = fecha.toISOString().slice(0, 10);
    const semana = Math.floor(offset / 7);
    const diaSemana = offset % 7;
    const entrada = porFecha.get(iso);
    return { iso, semana, diaSemana, valor: entrada?.valor ?? null, i: entrada?.i ?? -1, esPrimerDiaMes: fecha.getUTCDate() === 1, mes: fecha.getUTCMonth() };
  });

  return (
    <div className="relative h-full w-full overflow-x-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {dias.map((d) => {
          const x = 20 + d.semana * (celda + 3);
          const y = 20 + d.diaSemana * (celda + 3);
          const intensidad = d.valor === null ? -1 : Math.min(rampa.length - 1, Math.round((d.valor / max) * (rampa.length - 1)));
          const activo = d.i !== -1;
          return (
            <g key={d.iso}>
              {d.esPrimerDiaMes && (
                <text x={x} y={12} fontSize={9} fontFamily="var(--font-ui)" fill={ink}>{MESES[d.mes]}</text>
              )}
              <rect
                x={x}
                y={y}
                width={celda}
                height={celda}
                rx={2}
                fill={intensidad === -1 ? "var(--chip)" : rampa[intensidad]}
                opacity={hover === null || (activo && hover === d.i) ? 1 : 0.6}
                onMouseEnter={() => activo && setHover(d.i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>
      {hover !== null && datos[hover] && (
        <div className="pointer-events-none absolute rounded-md px-3 py-2 text-xs" style={{ left: 20, top: 0, background: "var(--panel-bg)", boxShadow: "var(--shadow-md)", fontFamily: "var(--font-ui)", color: "var(--sidebar-text-active)" }}>
          <div style={{ fontWeight: 600 }}>{datos[hover].dimension}</div>
          <div style={{ color: "var(--sidebar-text)" }}>{ejeYLabel}: {fmtNumero(datos[hover].valor)}</div>
        </div>
      )}
    </div>
  );
}

/** Box plot: min / Q1 / mediana / Q3 / max por categoría. */
function BiCajaChart({ cajas, dark, hover, setHover, ejeYLabel, width, height }: { cajas: BiCaja[]; dark: boolean; hover: number | null; setHover: (i: number | null) => void; ejeYLabel: string; width: number; height: number }) {
  const W = Math.max(width, cajas.length * 70);
  const H = height;
  const max = Math.max(...cajas.map((c) => c.max), 0) || 1;
  const min = Math.min(...cajas.map((c) => c.min), 0);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const gap = 16;
  const bw = (innerW - gap * (cajas.length - 1)) / cajas.length;
  const rango = max - min || 1;
  const ink = dark ? "#c3c2b7" : "#52514e";
  const grid = dark ? "#2c2c2a" : "#e1e0d9";
  const color = colorFor(0, dark);

  const escalaY = (v: number) => PAD.top + innerH - ((v - min) / rango) * innerH;

  return (
    <div className="relative h-full w-full overflow-x-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH * (1 - t)} y2={PAD.top + innerH * (1 - t)} stroke={grid} strokeWidth={1} />
        ))}
        {cajas.map((c, i) => {
          const x = PAD.left + i * (bw + gap);
          const cx = x + bw / 2;
          return (
            <g key={c.dimension} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <line x1={cx} x2={cx} y1={escalaY(c.max)} y2={escalaY(c.q3)} stroke={color} strokeWidth={1.5} opacity={hover === null || hover === i ? 1 : 0.4} />
              <line x1={cx} x2={cx} y1={escalaY(c.q1)} y2={escalaY(c.min)} stroke={color} strokeWidth={1.5} opacity={hover === null || hover === i ? 1 : 0.4} />
              <rect x={x} y={escalaY(c.q3)} width={bw} height={Math.max(escalaY(c.q1) - escalaY(c.q3), 1)} rx={3} fill={color} opacity={hover === null || hover === i ? 0.35 : 0.15} stroke={color} strokeWidth={1.5} />
              <line x1={x} x2={x + bw} y1={escalaY(c.mediana)} y2={escalaY(c.mediana)} stroke={color} strokeWidth={2.5} opacity={hover === null || hover === i ? 1 : 0.4} />
              <text x={cx} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={10} fontFamily="var(--font-ui)" fill={ink}>
                {c.dimension.length > 12 ? c.dimension.slice(0, 11) + "…" : c.dimension}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute rounded-md px-3 py-2 text-xs" style={{ left: `${((hover + 0.5) / cajas.length) * 100}%`, top: 4, transform: "translateX(-50%)", background: "var(--panel-bg)", boxShadow: "var(--shadow-md)", fontFamily: "var(--font-ui)", color: "var(--sidebar-text-active)" }}>
          <div style={{ fontWeight: 600 }}>{cajas[hover].dimension}</div>
          <div style={{ color: "var(--sidebar-text)" }}>Máx: {fmtNumero(cajas[hover].max)}</div>
          <div style={{ color: "var(--sidebar-text)" }}>Q3: {fmtNumero(cajas[hover].q3)}</div>
          <div style={{ color: "var(--sidebar-text)" }}>Mediana: {fmtNumero(cajas[hover].mediana)}</div>
          <div style={{ color: "var(--sidebar-text)" }}>Q1: {fmtNumero(cajas[hover].q1)}</div>
          <div style={{ color: "var(--sidebar-text)" }}>Mín: {fmtNumero(cajas[hover].min)}</div>
          <div style={{ color: "var(--sidebar-text)", opacity: 0.7 }}>{ejeYLabel}</div>
        </div>
      )}
    </div>
  );
}

/** Comparación de dos grupos (estilo pirámide poblacional): barras espejo a izquierda/derecha de un eje central por categoría. */
function BiPiramide({ pares, splitLabels, dark, hover, setHover, ejeYLabel, width, height }: { pares: BiPar[]; splitLabels: [string, string]; dark: boolean; hover: number | null; setHover: (i: number | null) => void; ejeYLabel: string; width: number; height: number }) {
  const maxAbs = Math.max(...pares.flatMap((p) => [p.izquierda, p.derecha]), 1);
  const W = width;
  const filaAlto = 28;
  const H = Math.max(height, PAD.top + PAD.bottom + 24 + pares.length * filaAlto);
  const labelAncho = 130;
  const centro = PAD.left + labelAncho + (W - PAD.left - labelAncho - PAD.right) / 2;
  const mitad = (W - PAD.left - labelAncho - PAD.right) / 2;
  const ink = dark ? "#c3c2b7" : "#52514e";
  const colorIzq = colorFor(0, dark);
  const colorDer = colorFor(1, dark);

  return (
    <div className="relative h-full w-full overflow-y-auto overflow-x-hidden">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <text x={centro - 6} y={16} textAnchor="end" fontSize={11} fontWeight={600} fontFamily="var(--font-ui)" fill={colorIzq}>{splitLabels[0]}</text>
        <text x={centro + 6} y={16} textAnchor="start" fontSize={11} fontWeight={600} fontFamily="var(--font-ui)" fill={colorDer}>{splitLabels[1]}</text>
        {pares.map((p, i) => {
          const y = PAD.top + 24 + i * filaAlto + filaAlto / 2;
          const anchoIzq = (p.izquierda / maxAbs) * mitad;
          const anchoDer = (p.derecha / maxAbs) * mitad;
          return (
            <g key={p.dimension} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <text x={PAD.left} y={y + 4} fontSize={11} fontFamily="var(--font-ui)" fill={ink}>
                {p.dimension.length > 20 ? p.dimension.slice(0, 19) + "…" : p.dimension}
              </text>
              <rect x={centro - anchoIzq} y={y - 7} width={Math.max(anchoIzq, 1)} height={14} rx={3} fill={colorIzq} opacity={hover === null || hover === i ? 1 : 0.45} />
              <rect x={centro} y={y - 7} width={Math.max(anchoDer, 1)} height={14} rx={3} fill={colorDer} opacity={hover === null || hover === i ? 1 : 0.45} />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute rounded-md px-3 py-2 text-xs" style={{ left: centro, top: PAD.top + 24 + hover * filaAlto, transform: "translateY(-100%)", background: "var(--panel-bg)", boxShadow: "var(--shadow-md)", fontFamily: "var(--font-ui)", color: "var(--sidebar-text-active)" }}>
          <div style={{ fontWeight: 600 }}>{pares[hover].dimension}</div>
          <div style={{ color: colorIzq }}>{splitLabels[0]}: {fmtNumero(pares[hover].izquierda)}</div>
          <div style={{ color: colorDer }}>{splitLabels[1]}: {fmtNumero(pares[hover].derecha)}</div>
          <div style={{ color: "var(--sidebar-text)", opacity: 0.7 }}>{ejeYLabel}</div>
        </div>
      )}
    </div>
  );
}

type GeometriaMapa = { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] };
type FeatureMapa = { type: "Feature"; properties: { estado: string }; geometry: GeometriaMapa };
type GeoMapa = { type: "FeatureCollection"; features: FeatureMapa[] };

/** Mapa coroplético de estados de México: agrupa el texto libre de "dimension" al nombre de estado del GeoJSON (con alias) y colorea por magnitud. */
function BiMapa({ datos, dark, hover, setHover, ejeYLabel, width, height }: { datos: BiDato[]; dark: boolean; hover: number | null; setHover: (i: number | null) => void; ejeYLabel: string; width: number; height: number }) {
  const [geo, setGeo] = useState<GeoMapa | null>(null);

  useEffect(() => {
    let activo = true;
    import("@/lib/bi/mexico-estados.json").then((mod) => {
      const cargado = (mod as { default?: GeoMapa }).default ?? (mod as unknown as GeoMapa);
      if (activo) setGeo(cargado);
    });
    return () => {
      activo = false;
    };
  }, []);

  const valorPorEstado = new Map<string, number>();
  const noReconocidos: string[] = [];
  for (const d of datos) {
    const estado = resolverEstado(d.dimension);
    if (estado) valorPorEstado.set(estado, (valorPorEstado.get(estado) ?? 0) + d.valor);
    else noReconocidos.push(d.dimension);
  }

  if (!geo) {
    return (
      <div className="flex h-full items-center justify-center" style={{ color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
        Cargando mapa…
      </div>
    );
  }

  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const f of geo.features) {
    const anillos = f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.coordinates.flat();
    for (const anillo of anillos) {
      for (const [lon, lat] of anillo) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  const corrX = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const anchoGeo = (maxLon - minLon) * corrX;
  const altoGeo = maxLat - minLat;
  const pad = 10;
  const escala = Math.min((width - pad * 2) / anchoGeo, (height - pad * 2) / altoGeo);
  const offX = (width - anchoGeo * escala) / 2;
  const offY = (height - altoGeo * escala) / 2;

  function proyectar([lon, lat]: number[]): [number, number] {
    return [offX + (lon - minLon) * corrX * escala, offY + (maxLat - lat) * escala];
  }

  function trazo(geom: GeometriaMapa): string {
    const poligonos = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    return poligonos
      .map((poligono) =>
        poligono
          .map((anillo) => anillo.map(proyectar).map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + " Z")
          .join(" ")
      )
      .join(" ");
  }

  const max = Math.max(...Array.from(valorPorEstado.values()), 0) || 1;
  const rampa = dark ? SECUENCIAL_DARK : SECUENCIAL_LIGHT;
  const sinDato = dark ? "#2c2c2a" : "#e1e0d9";
  const contorno = dark ? "#0d0d0d" : "#fcfcfb";
  const ink = dark ? "#c3c2b7" : "#52514e";
  const estadoHover = hover !== null ? geo.features[hover]?.properties.estado : undefined;

  return (
    <div className="relative h-full w-full">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {geo.features.map((f, i) => {
          const valor = valorPorEstado.get(f.properties.estado);
          const intensidad = valor === undefined ? -1 : Math.min(rampa.length - 1, Math.round((valor / max) * (rampa.length - 1)));
          return (
            <path
              key={f.properties.estado}
              d={trazo(f.geometry)}
              fill={intensidad === -1 ? sinDato : rampa[intensidad]}
              stroke={contorno}
              strokeWidth={0.75}
              opacity={hover === null || hover === i ? 1 : 0.55}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      {estadoHover && (
        <div className="pointer-events-none absolute rounded-md px-3 py-2 text-xs" style={{ left: 8, top: 8, background: "var(--panel-bg)", boxShadow: "var(--shadow-md)", fontFamily: "var(--font-ui)", color: "var(--sidebar-text-active)" }}>
          <div style={{ fontWeight: 600 }}>{estadoHover}</div>
          <div style={{ color: "var(--sidebar-text)" }}>{ejeYLabel}: {valorPorEstado.has(estadoHover) ? fmtNumero(valorPorEstado.get(estadoHover)!) : "Sin datos"}</div>
        </div>
      )}
      {noReconocidos.length > 0 && (
        <div className="absolute bottom-1 left-1 right-1 truncate rounded-md px-2 py-1 text-xs" style={{ background: "var(--panel-bg)", color: ink, fontFamily: "var(--font-ui)", opacity: 0.85 }} title={noReconocidos.join(", ")}>
          Sin ubicar en el mapa: {noReconocidos.join(", ")}
        </div>
      )}
    </div>
  );
}
