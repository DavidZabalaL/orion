import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  onClick,
  seleccionado,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent: string;
  onClick?: () => void;
  seleccionado?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className="flex items-center gap-4 rounded-xl p-4 text-left w-full"
      style={{
        background: "var(--panel-bg)",
        boxShadow: "var(--shadow-sm)",
        border: seleccionado ? "2px solid var(--color-primary)" : "2px solid transparent",
        cursor: onClick ? "pointer" : "default",
        // Permite que clamp(...cqw...) de abajo escale con el ancho real de
        // esta tarjeta (cuánto le tocó del grid), no con el viewport —
        // así el número no se desborda cuando el widget queda angosto.
        containerType: "inline-size",
      }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${accent}1f` }}
      >
        <Icon size={20} color={accent} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="truncate"
          style={{
            fontFamily: "var(--font-mono)",
            // clamp entre un piso legible y el tamaño normal — cuando el
            // contenedor es angosto, cqw lo encoge antes de que desborde;
            // "truncate" (arriba) cubre el caso extremo con "…".
            fontSize: "clamp(15px, 9cqw, var(--text-2xl))",
            fontWeight: 700,
            color: "var(--sidebar-text-active)",
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-sm)",
            color: "var(--sidebar-text)",
            // Etiquetas cortas (2-3 palabras): que hagan wrap a una segunda
            // línea en vez de truncarse con "…" — el ancho de la tarjeta
            // varía según cuántas quepan por fila, y wrap nunca pierde
            // información. line-clamp de respaldo por si algún label llega a
            // ser inusualmente largo.
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {label}
        </div>
      </div>
    </Tag>
  );
}
