// Paleta categórica de las gráficas del BI — compartida entre el dashboard
// (bi-chart.tsx, cliente) y las gráficas de los reportes (servidor), para que
// el PDF/correo usen exactamente los mismos colores que la pantalla.
// Validada (contraste + separación CVD) — orden fijo, nunca se reasigna por
// rango. Ver skill dataviz/references/palette.md.
export const SERIES_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
export const SERIES_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

/** Semáforo de la barra de avance (mismos umbrales que el dashboard); `colorimetria` "positivo" = un % alto es bueno. */
export function nivelAvance(pct: number, colorimetria: "positivo" | "negativo"): "bien" | "atencion" | "mal" {
  if (colorimetria === "positivo") return pct >= 90 ? "bien" : pct >= 70 ? "atencion" : "mal";
  return pct > 100 ? "mal" : pct >= 85 ? "atencion" : "bien";
}
