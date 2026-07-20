export function fmtMoney(v: unknown) {
  const n = typeof v === "string" || typeof v === "number" ? Number(v) : Number(v ?? 0);
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

export function fmtFecha(v: string | Date | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
}

export function fmtFechaHora(v: string | Date | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString("es-MX", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function diasPara(v: string | Date | null | undefined) {
  if (!v) return null;
  return Math.ceil((new Date(v).getTime() - Date.now()) / 86_400_000);
}
