import { FileText } from "lucide-react";
import { blobProxy } from "@/lib/blob";

const ES_PDF = /\.pdf(\?|$)/i;

/** Miniatura de evidencia: imagen recortada a cuadro, o ícono de PDF si el archivo no es una imagen. */
export function Thumb({ url, label }: { url: string; label: string }) {
  const src = blobProxy(url);
  if (ES_PDF.test(url)) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 flex items-center justify-center"
        title={`Ver documento: ${label}`}
        style={{ width: 56, height: 56, borderRadius: 6, border: "1px solid var(--field-border)", background: "var(--field-bg)" }}
      >
        <FileText size={22} color="var(--sidebar-text)" />
      </a>
    );
  }
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="shrink-0" title={`Ver foto: ${label}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid var(--field-border)", display: "block" }}
      />
    </a>
  );
}

/** Título de sección con línea de color */
export function SeccionTitulo({ titulo }: { titulo: string }) {
  return (
    <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--field-border)" }}>
      <span
        style={{
          fontFamily: "var(--font)",
          fontSize: "var(--text-xs)",
          fontWeight: 700,
          color: "var(--color-primary)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {titulo}
      </span>
    </div>
  );
}

/** Fila compacta: etiqueta | valor/chip | miniatura opcional */
export function FilaItem({
  label,
  badge,
  foto,
}: {
  label: React.ReactNode;
  badge: React.ReactNode;
  foto?: string;
}) {
  return (
    <div
      className="print-row flex items-center gap-3 px-4 py-2.5"
      style={{ borderBottom: "1px solid var(--field-border)", minHeight: 44 }}
    >
      <div className="flex-1 min-w-0" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
        {label}
      </div>
      <div className="shrink-0">{badge}</div>
      {foto && <Thumb url={foto} label={typeof label === "string" ? label : "foto"} />}
    </div>
  );
}

/** Panel con borde y sombra que agrupa filas */
export function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="print-section print-card rounded-xl overflow-hidden"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
    >
      {children}
    </div>
  );
}
