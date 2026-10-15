// Gráficas de la vista de dashboard incluida en un reporte, dibujadas como
// PNG en el servidor con next/og (satori + resvg, con fuente incluida — no
// depende de las fuentes del sistema, así que funciona igual en Vercel). Una
// sola imagen sirve para el PDF (data URI) y el correo (adjunto inline por
// CID): los clientes de correo no muestran SVG ni gráficas hechas con JS.
//
// Mismo estilo y colores que el dashboard (bi-chart.tsx, paleta compartida en
// src/lib/bi/paleta.ts). Satori exige `display: flex` en todo contenedor con
// más de un hijo; por eso todo se arma con flex y SVG simple (path/polyline).
import { ImageResponse } from "next/og";
import { formatearValorBI } from "@/lib/bi/formato-valor";
import { SERIES_LIGHT, nivelAvance } from "@/lib/bi/paleta";

export type DatoGrafica = { label: string; valor: number };

export type EspecGrafica =
  | { tipo: "barras"; orientacion: "vertical" | "horizontal"; datos: DatoGrafica[]; sufijo: string }
  | { tipo: "lineas"; datos: DatoGrafica[]; sufijo: string }
  | { tipo: "pie"; datos: DatoGrafica[]; sufijo: string }
  | { tipo: "agrupadas"; series: string[]; filas: { label: string; valores: Record<string, number> }[]; sufijo: string }
  | { tipo: "avance"; datos: (DatoGrafica & { meta: number })[]; sufijo: string; sufijoMeta: string; etiquetaMeta: string; etiquetaValor: string; colorimetria: "positivo" | "negativo" };

const ANCHO = 1200;
const NAVY = "#0f1b2d";
const SLATE = "#6b7785";
const REJILLA = "#e8ecef";
const FONDO_BARRA = "#eef1f4";
const COLOR_NIVEL = { bien: "#00b37a", atencion: "#f59e0b", mal: "#ff5263" } as const;
const MAX_CATEGORIAS = 16;

const corto = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const color = (i: number) => SERIES_LIGHT[i % SERIES_LIGHT.length];

function Leyenda({ items }: { items: { label: string; color: string; extra?: string }[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 14 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 20, color: NAVY }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, background: it.color }} />
          <div style={{ display: "flex" }}>{it.extra ? `${it.label} · ${it.extra}` : it.label}</div>
        </div>
      ))}
    </div>
  );
}

function BarrasVerticales({ datos, sufijo, alto }: { datos: DatoGrafica[]; sufijo: string; alto: number }) {
  const max = Math.max(...datos.map((d) => d.valor), 0) || 1;
  const altoBarras = alto - 90;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: alto, borderBottom: `2px solid ${REJILLA}`, paddingTop: 10 }}>
      {datos.map((d, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "flex-end", height: "100%" }}>
          <div style={{ display: "flex", fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 6 }}>{formatearValorBI(d.valor, sufijo)}</div>
          <div style={{ display: "flex", width: "70%", height: Math.max(2, (d.valor / max) * altoBarras), background: color(0), borderRadius: "6px 6px 0 0" }} />
          <div style={{ display: "flex", fontSize: 16, color: SLATE, marginTop: 8, height: 40, textAlign: "center" }}>{corto(d.label, 18)}</div>
        </div>
      ))}
    </div>
  );
}

function BarrasHorizontales({ datos, sufijo }: { datos: DatoGrafica[]; sufijo: string }) {
  const max = Math.max(...datos.map((d) => d.valor), 0) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {datos.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", width: 280, fontSize: 19, color: NAVY, justifyContent: "flex-end" }}>{corto(d.label, 28)}</div>
          <div style={{ display: "flex", flex: 1, height: 26, background: FONDO_BARRA, borderRadius: 6 }}>
            <div style={{ display: "flex", width: `${Math.max(0.5, (d.valor / max) * 100)}%`, height: "100%", background: color(0), borderRadius: 6 }} />
          </div>
          <div style={{ display: "flex", width: 190, fontSize: 19, fontWeight: 700, color: NAVY }}>{formatearValorBI(d.valor, sufijo)}</div>
        </div>
      ))}
    </div>
  );
}

function Agrupadas({ series, filas, sufijo, alto }: { series: string[]; filas: { label: string; valores: Record<string, number> }[]; sufijo: string; alto: number }) {
  const max = Math.max(...filas.flatMap((f) => series.map((s) => f.valores[s] ?? 0)), 0) || 1;
  const altoBarras = alto - 60;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: alto, borderBottom: `2px solid ${REJILLA}` }}>
        {filas.map((f, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, width: "90%", height: altoBarras }}>
              {series.map((s, j) => (
                <div key={j} style={{ display: "flex", flex: 1, height: Math.max(1, ((f.valores[s] ?? 0) / max) * altoBarras), background: color(j), borderRadius: "4px 4px 0 0" }} />
              ))}
            </div>
            <div style={{ display: "flex", fontSize: 16, color: SLATE, marginTop: 8, height: 40, textAlign: "center" }}>{corto(f.label, 16)}</div>
          </div>
        ))}
      </div>
      <Leyenda items={series.map((s, j) => ({ label: s, color: color(j), extra: formatearValorBI(filas.reduce((a, f) => a + (f.valores[s] ?? 0), 0), sufijo) }))} />
    </div>
  );
}

function Lineas({ datos, sufijo, alto }: { datos: DatoGrafica[]; sufijo: string; alto: number }) {
  const ancho = ANCHO - 80;
  const altoSvg = alto - 70;
  const max = Math.max(...datos.map((d) => d.valor), 0) || 1;
  const x = (i: number) => (datos.length === 1 ? ancho / 2 : 20 + (i * (ancho - 40)) / (datos.length - 1));
  const y = (v: number) => 10 + (1 - v / max) * (altoSvg - 20);
  const puntos = datos.map((d, i) => `${x(i)},${y(d.valor)}`).join(" ");
  const cadaCuanto = Math.ceil(datos.length / 10);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, color: SLATE }}>
        <div style={{ display: "flex" }}>Máx. {formatearValorBI(max, sufijo)}</div>
        <div style={{ display: "flex" }}>Último: {formatearValorBI(datos[datos.length - 1]?.valor ?? 0, sufijo)}</div>
      </div>
      <svg width={ancho} height={altoSvg} viewBox={`0 0 ${ancho} ${altoSvg}`}>
        <line x1="0" y1={altoSvg - 1} x2={ancho} y2={altoSvg - 1} stroke={REJILLA} strokeWidth="2" />
        <polyline points={puntos} fill="none" stroke={color(0)} strokeWidth="4" />
        {datos.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.valor)} r="6" fill={color(0)} />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, color: SLATE, marginTop: 6 }}>
        {datos.filter((_, i) => i % cadaCuanto === 0).map((d, i) => (
          <div key={i} style={{ display: "flex" }}>{corto(d.label, 12)}</div>
        ))}
      </div>
    </div>
  );
}

function Pie({ datos, sufijo, alto }: { datos: DatoGrafica[]; sufijo: string; alto: number }) {
  const total = datos.reduce((a, d) => a + d.valor, 0) || 1;
  const r = Math.min(alto / 2 - 10, 200);
  const c = r + 10;
  // Ángulo acumulado al inicio de cada porción (sin mutar variables durante el render).
  const inicios = datos.map((_, i) => -Math.PI / 2 + (datos.slice(0, i).reduce((acc, d) => acc + d.valor, 0) / total) * Math.PI * 2);
  const porciones = datos.map((d, i) => {
    const frac = d.valor / total;
    const inicio = inicios[i];
    const fin = inicio + frac * Math.PI * 2;
    if (frac >= 0.9999) return <circle key={i} cx={c} cy={c} r={r} fill={color(i)} />;
    const largo = fin - inicio > Math.PI ? 1 : 0;
    const p = `M ${c} ${c} L ${c + r * Math.cos(inicio)} ${c + r * Math.sin(inicio)} A ${r} ${r} 0 ${largo} 1 ${c + r * Math.cos(fin)} ${c + r * Math.sin(fin)} Z`;
    return <path key={i} d={p} fill={color(i)} stroke="#ffffff" strokeWidth="3" />;
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 50 }}>
      <svg width={c * 2} height={c * 2} viewBox={`0 0 ${c * 2} ${c * 2}`}>
        {porciones}
        <circle cx={c} cy={c} r={r * 0.55} fill="#ffffff" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        {datos.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, color: NAVY }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: color(i) }} />
            <div style={{ display: "flex", flex: 1 }}>{corto(d.label, 34)}</div>
            <div style={{ display: "flex", fontWeight: 700 }}>{formatearValorBI(d.valor, sufijo)}</div>
            <div style={{ display: "flex", width: 90, justifyContent: "flex-end", color: SLATE }}>{`${Math.round((d.valor / total) * 1000) / 10}%`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilaAvance({ label, valor, meta, sufijo, sufijoMeta, etiquetaMeta, colorimetria, destacado }: { label: string; valor: number; meta: number; sufijo: string; sufijoMeta: string; etiquetaMeta: string; colorimetria: "positivo" | "negativo"; destacado?: boolean }) {
  const pct = meta > 0 ? Math.round((valor / meta) * 1000) / 10 : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: destacado ? 8 : 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ display: "flex", fontSize: destacado ? 24 : 20, fontWeight: destacado ? 700 : 600, color: NAVY }}>{corto(label, 50)}</div>
        <div style={{ display: "flex", fontSize: destacado ? 30 : 22, fontWeight: 700, color: NAVY }}>{formatearValorBI(valor, sufijo)}</div>
      </div>
      <div style={{ display: "flex", height: destacado ? 18 : 12, background: FONDO_BARRA, borderRadius: 999 }}>
        <div style={{ display: "flex", width: `${Math.min(100, Math.max(0.5, pct))}%`, height: "100%", background: COLOR_NIVEL[nivelAvance(pct, colorimetria)], borderRadius: 999 }} />
      </div>
      <div style={{ display: "flex", fontSize: 17, color: SLATE }}>{`${etiquetaMeta || "Meta"}: ${formatearValorBI(meta, sufijoMeta)} (${pct.toLocaleString("es-MX")}%)`}</div>
    </div>
  );
}

function altoDe(e: EspecGrafica): number {
  if (e.tipo === "avance") return 50 + (e.datos.length > 1 ? 110 : 0) + e.datos.length * (e.datos.length > 1 ? 74 : 110);
  if (e.tipo === "barras" && e.orientacion === "horizontal") return 40 + e.datos.length * 38;
  if (e.tipo === "pie") return Math.max(440, 60 + e.datos.length * 38);
  if (e.tipo === "agrupadas") return 520;
  return 440;
}

function Contenido({ e, alto }: { e: EspecGrafica; alto: number }) {
  if (e.tipo === "barras") return e.orientacion === "horizontal" ? <BarrasHorizontales datos={e.datos} sufijo={e.sufijo} /> : <BarrasVerticales datos={e.datos} sufijo={e.sufijo} alto={alto - 40} />;
  if (e.tipo === "lineas") return <Lineas datos={e.datos} sufijo={e.sufijo} alto={alto - 40} />;
  if (e.tipo === "pie") return <Pie datos={e.datos} sufijo={e.sufijo} alto={alto - 40} />;
  if (e.tipo === "agrupadas") return <Agrupadas series={e.series} filas={e.filas} sufijo={e.sufijo} alto={alto - 140} />;
  const totalValor = e.datos.reduce((a, d) => a + d.valor, 0);
  const totalMeta = e.datos.reduce((a, d) => a + d.meta, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: e.datos.length > 1 ? 14 : 22 }}>
      {e.datos.length > 1 && <FilaAvance label={`Total — ${e.etiquetaValor}`} valor={totalValor} meta={totalMeta} sufijo={e.sufijo} sufijoMeta={e.sufijoMeta} etiquetaMeta={e.etiquetaMeta} colorimetria={e.colorimetria} destacado />}
      {e.datos.map((d, i) => (
        <FilaAvance key={i} label={d.label} valor={d.valor} meta={d.meta} sufijo={e.sufijo} sufijoMeta={e.sufijoMeta} etiquetaMeta={e.etiquetaMeta} colorimetria={e.colorimetria} destacado={e.datos.length === 1} />
      ))}
    </div>
  );
}

/** Recorta a las categorías que caben legibles en una imagen (las de mayor valor primero salvo en series de tiempo). */
export function recortarCategorias<T extends { valor: number }>(datos: T[], esSerieTiempo: boolean): T[] {
  if (datos.length <= MAX_CATEGORIAS) return datos;
  return esSerieTiempo ? datos.slice(-MAX_CATEGORIAS) : [...datos].sort((a, b) => b.valor - a.valor).slice(0, MAX_CATEGORIAS);
}

/** PNG (base64, sin prefijo) de la gráfica, a 1200 px de ancho; `alto` en px para maquetarla con su proporción real. */
export async function graficaPng(e: EspecGrafica): Promise<{ base64: string; ancho: number; alto: number }> {
  const alto = altoDe(e);
  const imagen = new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#ffffff", padding: "20px 40px" }}>
        <Contenido e={e} alto={alto - 40} />
      </div>
    ),
    { width: ANCHO, height: alto }
  );
  const base64 = Buffer.from(await imagen.arrayBuffer()).toString("base64");
  return { base64, ancho: ANCHO, alto };
}
