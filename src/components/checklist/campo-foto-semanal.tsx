"use client";

import { useState } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { subirFotoChecklist } from "@/app/(app)/checklist/actions";
import { comprimirImagen } from "@/lib/comprimir-imagen";

export function CampoFotoSemanal({
  name,
  label,
  requerido,
  initialUrl,
  permitirGaleria = false,
  bloqueado = false,
  onSubiendoChange,
}: {
  name: string;
  label: string;
  requerido: boolean;
  initialUrl?: string;
  /** Solo para la licencia: permite elegir de la galería, no solo tomar una foto nueva. */
  permitirGaleria?: boolean;
  /** true si OTRA foto del mismo checklist se está subiendo ahora mismo — bloquea este campo mientras tanto, para no acumular varias subidas al mismo tiempo. */
  bloqueado?: boolean;
  /** Avisa al wizard cuándo esta foto empieza/termina de subir, para que bloquee las demás mientras tanto. */
  onSubiendoChange?: (subiendo: boolean) => void;
}) {
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(initialUrl ? "foto anterior" : null);
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alSeleccionar(file: File | undefined) {
    if (!file) {
      setNombreArchivo(null);
      setUrl(null);
      return;
    }
    setNombreArchivo(file.name);
    setUrl(null);
    setSubiendo(true);
    onSubiendoChange?.(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", await comprimirImagen(file));
      const result = await subirFotoChecklist(fd);
      if (!result.ok) throw new Error(result.error);
      setUrl(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
      setNombreArchivo(null);
    } finally {
      setSubiendo(false);
      onSubiendoChange?.(false);
    }
  }

  const deshabilitado = bloqueado && !subiendo;

  return (
    <div>
      <input type="hidden" name={name} value={url ?? ""} />
      <label
        className="flex items-center gap-2 rounded-md px-3 py-2.5"
        style={{
          background: url ? "var(--status-cerrado-bg)" : "var(--field-bg)",
          color: url ? "var(--color-status-cerrado)" : "var(--sidebar-text)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--text-sm)",
          opacity: deshabilitado ? 0.5 : 1,
          cursor: deshabilitado ? "not-allowed" : "pointer",
        }}
      >
        {subiendo ? (
          <Loader2 size={15} className="animate-spin shrink-0" />
        ) : url ? (
          <CheckCircle2 size={15} className="shrink-0" />
        ) : (
          <Camera size={15} className="shrink-0" />
        )}
        <span className="truncate">
          {subiendo ? `Subiendo ${nombreArchivo}…` : url ? `${label} — completa` : `${label}${requerido ? " *" : ""}`}
        </span>
        <input
          type="file"
          accept="image/*"
          {...(permitirGaleria ? {} : { capture: "environment" as const })}
          className="hidden"
          disabled={deshabilitado}
          onChange={(e) => alSeleccionar(e.target.files?.[0])}
        />
      </label>
      {deshabilitado && (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
          Espera a que termine la foto anterior…
        </p>
      )}
      {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>{error}</p>}
    </div>
  );
}
