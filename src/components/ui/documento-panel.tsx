import { FileText } from "lucide-react";
import { blobProxy } from "@/lib/blob";

const ES_PDF = /\.pdf(\?|$)/i;

/** Chip semáforo para el valor de un campo de checklist (bueno/malo/medio) — compartido entre la vista de detalle y la lista expandible. */
export function ColorChip({ value }: { value: string }) {
  const v = value?.toUpperCase() ?? "";
  let bg = "var(--chip)";
  let color = "var(--sidebar-text)";
  if (["BUEN ESTADO", "MAXIMO", "Y", "OK", "SÍ", "CON VIGENCIA", "100% (NUEVA)", "75%"].includes(v)) { bg = "var(--status-cerrado-bg)"; color = "var(--color-status-cerrado)"; }
  else if (["MAL ESTADO", "MINIMO", "N", "REVISAR", "FALLA", "NO", "SIN VIGENCIA", "ROTO", "ESTRELLADO", "25%", "0% (REEMPLAZAR)"].includes(v)) { bg = "var(--status-escena-bg, #fef2f2)"; color = "var(--color-status-escena)"; }
  else if (v === "MEDIO" || v === "50%") { bg = "var(--status-revision-bg)"; color = "var(--color-status-revision)"; }
  return (
    <span
      className="inline-block rounded-full whitespace-nowrap"
      style={{ background: bg, color, fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 700, padding: "3px 10px", letterSpacing: "0.03em" }}
    >
      {value}
    </span>
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

/** Foto grande de evidencia, paso a paso: recorte generoso en vez de miniatura, o ícono de PDF si el archivo no es una imagen. */
function FotoGrande({ url, label }: { url: string; label: string }) {
  const src = blobProxy(url);
  if (ES_PDF.test(url)) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 self-start"
        title={`Ver documento: ${label}`}
        style={{ width: 220, height: 160, borderRadius: 10, border: "1px solid var(--field-border)", background: "var(--field-bg)" }}
      >
        <FileText size={32} color="var(--sidebar-text)" />
      </a>
    );
  }
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="self-start" title={`Ver foto completa: ${label}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        style={{ maxWidth: 320, maxHeight: 320, width: "auto", height: "auto", objectFit: "contain", borderRadius: 10, border: "1px solid var(--field-border)", display: "block" }}
      />
    </a>
  );
}

/** Paso: etiqueta + valor/chip arriba, foto grande debajo (si tiene) — un campo por bloque, como en la captura original. */
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
      className="print-row flex flex-col gap-2.5 px-4 py-3"
      style={{ borderBottom: "1px solid var(--field-border)" }}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
          {label}
        </div>
        <div className="shrink-0">{badge}</div>
      </div>
      {foto && <FotoGrande url={foto} label={typeof label === "string" ? label : "foto"} />}
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
