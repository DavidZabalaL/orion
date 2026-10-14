// Formato de valores numéricos del BI (gráficas, tablas, KPIs y reportes).
// Los campos de dinero se declaran en metadata.ts con sufijo " MXN"; en vez
// de mostrarlos como "12345.6 MXN" se formatean como moneda ("$12,345.60").
// Sin dependencias de servidor: lo usan tanto componentes cliente como el
// HTML/PDF de reportes.

const FMT_NUMERO = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });
const FMT_MONEDA = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function esSufijoMoneda(sufijo: string | null | undefined): boolean {
  return sufijo?.trim() === "MXN";
}

export function formatearValorBI(valor: number, sufijo = ""): string {
  if (!Number.isFinite(valor)) return "—";
  if (esSufijoMoneda(sufijo)) return FMT_MONEDA.format(valor);
  return FMT_NUMERO.format(valor) + sufijo;
}

/** Celda de una tabla de registros: los números (o Decimal serializado como texto) se formatean; el resto se muestra tal cual. */
export function formatearCeldaBI(valor: string | number | null | undefined, tipo: string | undefined, sufijo = ""): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (tipo !== "numero") return String(valor);
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? formatearValorBI(n, sufijo) : String(valor);
}
