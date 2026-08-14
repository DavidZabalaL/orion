"use client";

import { useState, type RefObject } from "react";
import { Download } from "lucide-react";
import { exportarDatosBI, exportarSvgComoImagen } from "@/lib/bi/exportar-cliente";
import { registrarAccesoBI } from "@/app/(app)/reportes/bi/actions";

const itemStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--sidebar-text-active)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  whiteSpace: "nowrap",
};

/**
 * Menú de exportación de una gráfica ya renderizada: Excel/PDF pasan por
 * /api/bi/exportar (revalida permiso + registra auditoría); Imagen rasteriza
 * el <svg> ya presente en `contenedorRef` enteramente en el cliente.
 */
export function ExportarMenu({
  dataset,
  ejeXLabel,
  ejeYLabel,
  datos,
  proyectoIds,
  contenedorRef,
  tipoRecurso,
  recursoId,
}: {
  dataset: string;
  ejeXLabel: string;
  ejeYLabel: string;
  datos: { dimension: string; valor: number }[];
  proyectoIds?: string[];
  contenedorRef: RefObject<HTMLElement | null>;
  tipoRecurso: "vista_dashboard" | "explorador";
  recursoId?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, setPendiente] = useState(false);

  async function exportar(formato: "excel" | "pdf") {
    setPendiente(true);
    setAbierto(false);
    try {
      await exportarDatosBI({ dataset, formato, ejeXLabel, ejeYLabel, datos, proyectoIds });
    } catch {
      // silencioso: el menú vuelve a estar disponible para reintentar
    }
    setPendiente(false);
  }

  async function exportarImagen() {
    setAbierto(false);
    const svg = contenedorRef.current?.querySelector("svg");
    if (!svg) return;
    try {
      await exportarSvgComoImagen(svg, dataset);
      void registrarAccesoBI({ tipoRecurso, accion: "exporto_imagen", recursoId, datasetIds: [dataset], proyectoIds });
    } catch {
      // silencioso
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={pendiente}
        className="flex h-6 w-6 items-center justify-center rounded-md"
        style={{ background: "var(--chip)", color: "var(--sidebar-text-active)" }}
        title="Exportar"
      >
        <Download size={12} />
      </button>
      {abierto && (
        <div className="absolute right-0 top-7 z-10 flex flex-col gap-0.5 rounded-md p-1" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)", minWidth: 140, border: "1px solid var(--field-border)" }}>
          {datos.length > 0 && (
            <>
              <button type="button" disabled={pendiente} onClick={() => exportar("excel")} className="rounded px-2 py-1.5 text-left" style={itemStyle}>
                Excel
              </button>
              <button type="button" disabled={pendiente} onClick={() => exportar("pdf")} className="rounded px-2 py-1.5 text-left" style={itemStyle}>
                PDF
              </button>
            </>
          )}
          <button type="button" onClick={exportarImagen} className="rounded px-2 py-1.5 text-left" style={itemStyle}>
            Imagen (PNG)
          </button>
        </div>
      )}
    </div>
  );
}
