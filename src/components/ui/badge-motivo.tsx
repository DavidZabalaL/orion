"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";

/**
 * Badge que al pasar el mouse (o enfocar / tocar) muestra en una burbuja la
 * razón breve de la alerta. La burbuja va en un portal con posición fija para
 * que no la recorte el contenedor con scroll de la tabla.
 */
export function BadgeMotivo({ label, motivo, color, bg }: { label: string; motivo: string | null; color: string; bg: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  if (!motivo) return <Badge label={label} color={color} bg={bg} />;

  function mostrar(el: HTMLElement) {
    const r = el.getBoundingClientRect();
    setPos({ x: Math.min(Math.max(r.left + r.width / 2, 150), window.innerWidth - 150), y: r.bottom + 6 });
  }

  return (
    <span
      tabIndex={0}
      role="button"
      aria-label={`${label}: ${motivo}`}
      className="cursor-help outline-none"
      onMouseEnter={(e) => mostrar(e.currentTarget)}
      onMouseLeave={() => setPos(null)}
      onFocus={(e) => mostrar(e.currentTarget)}
      onBlur={() => setPos(null)}
      onClick={(e) => (pos ? setPos(null) : mostrar(e.currentTarget))}
    >
      <Badge label={label} color={color} bg={bg} />
      {pos &&
        createPortal(
          <div
            role="tooltip"
            // Posición y capa en estilo propio (no en clases): la burbuja vive
            // en <body> vía portal y debe quedar encima de tablas con scroll,
            // modales y encabezados sin depender del CSS de la página.
            style={{
              position: "fixed",
              zIndex: 1000,
              pointerEvents: "none",
              left: pos.x,
              top: pos.y,
              transform: "translateX(-50%)",
              maxWidth: 280,
              padding: "8px 12px",
              borderRadius: 8,
              background: "var(--sidebar-text-active, #0f1b2d)",
              color: "var(--panel-bg, #ffffff)",
              fontFamily: "var(--font-ui, system-ui, sans-serif)",
              fontSize: "var(--text-xs, 12px)",
              lineHeight: 1.4,
              boxShadow: "0 4px 14px rgba(15, 27, 45, 0.25)",
            }}
          >
            {motivo}
          </div>,
          document.body
        )}
    </span>
  );
}
