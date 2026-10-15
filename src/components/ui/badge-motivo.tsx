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
            className="pointer-events-none fixed z-[60] rounded-md px-3 py-2"
            style={{
              left: pos.x,
              top: pos.y,
              transform: "translateX(-50%)",
              maxWidth: 280,
              background: "var(--sidebar-text-active)",
              color: "var(--panel-bg)",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--text-xs)",
              lineHeight: 1.4,
              boxShadow: "var(--shadow-md, var(--shadow-sm))",
            }}
          >
            {motivo}
          </div>,
          document.body
        )}
    </span>
  );
}
