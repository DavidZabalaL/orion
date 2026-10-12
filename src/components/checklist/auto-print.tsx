"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/** Si la URL trae ?print=1 (ej. un botón "PDF" en una lista que abre la ficha en pestaña nueva), dispara el diálogo de impresión/PDF del navegador automáticamente — misma ruta ya usada por PrintButton (@media print de esta página). */
export function AutoPrint() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("print") !== "1") return;
    let cancelado = false;
    // Las fotos de evidencia que no han terminado de cargar salen en blanco en el PDF.
    const fotos = Array.from(document.images).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((r) => {
            img.addEventListener("load", () => r(), { once: true });
            img.addEventListener("error", () => r(), { once: true });
          })
    );
    const limite = new Promise<void>((r) => setTimeout(r, 15000));
    Promise.race([Promise.all(fotos), limite]).then(() => {
      if (!cancelado) setTimeout(() => window.print(), 200);
    });
    return () => {
      cancelado = true;
    };
  }, [searchParams]);

  return null;
}
