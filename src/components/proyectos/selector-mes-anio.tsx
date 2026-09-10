"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const MESES_LABEL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const selectStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
};

export function SelectorMesAnio({ anio, mes }: { anio: number; mes: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function cambiar(campo: "anio" | "mes", valor: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(campo, String(valor));
    router.push(`${pathname}?${params.toString()}`);
  }

  const anioActual = new Date().getFullYear();
  const anios = Array.from({ length: 3 }, (_, i) => anioActual - i);

  return (
    <div className="flex items-center gap-2">
      <select value={mes} onChange={(e) => cambiar("mes", Number(e.target.value))} style={selectStyle}>
        {MESES_LABEL.map((label, i) => (
          <option key={label} value={i + 1}>{label}</option>
        ))}
      </select>
      <select value={anio} onChange={(e) => cambiar("anio", Number(e.target.value))} style={selectStyle}>
        {anios.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  );
}
