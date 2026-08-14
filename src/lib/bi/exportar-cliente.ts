// Helpers 100% cliente para exportar una gráfica del explorador/dashboard BI.
// Excel/PDF llaman a /api/bi/exportar (que revalida permisos y registra
// auditoría); la imagen se rasteriza enteramente en el navegador a partir del
// <svg> ya renderizado, sin ida y vuelta al servidor para generar el archivo
// (solo se notifica el acceso para gobernanza).

function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportarDatosBI(input: {
  dataset: string;
  formato: "excel" | "pdf";
  ejeXLabel: string;
  ejeYLabel: string;
  datos: { dimension: string; valor: number }[];
  proyectoIds?: string[];
}): Promise<void> {
  const res = await fetch("/api/bi/exportar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "No se pudo exportar.");
  }
  const blob = await res.blob();
  descargarBlob(blob, `${input.dataset}.${input.formato === "pdf" ? "pdf" : "xlsx"}`);
}

/** Serializa un <svg> ya renderizado a PNG (fondo blanco explícito) y dispara la descarga. */
export function exportarSvgComoImagen(svg: SVGSVGElement, nombreArchivo: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const bbox = svg.getBoundingClientRect();
    const ancho = Math.max(1, Math.round(bbox.width));
    const alto = Math.max(1, Math.round(bbox.height));
    const svgTexto = new XMLSerializer().serializeToString(svg);
    const svgUrl = URL.createObjectURL(new Blob([svgTexto], { type: "image/svg+xml;charset=utf-8" }));

    const img = new Image();
    img.onload = () => {
      const escala = 2; // 2x para nitidez en pantallas de alta densidad
      const canvas = document.createElement("canvas");
      canvas.width = ancho * escala;
      canvas.height = alto * escala;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        return reject(new Error("No se pudo preparar el lienzo de exportación."));
      }
      ctx.scale(escala, escala);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, ancho, alto);
      ctx.drawImage(img, 0, 0, ancho, alto);
      URL.revokeObjectURL(svgUrl);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("No se pudo generar la imagen."));
        descargarBlob(blob, `${nombreArchivo}.png`);
        resolve();
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error("No se pudo rasterizar la gráfica."));
    };
    img.src = svgUrl;
  });
}
