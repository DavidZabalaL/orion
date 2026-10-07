"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/** Si la URL trae ?print=1 (ej. un botón "PDF" en una lista que abre la ficha en pestaña nueva), dispara el diálogo de impresión/PDF del navegador automáticamente — misma ruta ya usada por PrintButton (@media print de esta página). */
export function AutoPrint() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("print") !== "1") return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [searchParams]);

  return null;
}
