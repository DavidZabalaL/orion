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
  onSubidaPendienteChange,
  onUrlChange,
}: {
  name: string;
  label: string;
  requerido: boolean;
  initialUrl?: string;
  /** Solo para la licencia: permite elegir de la galería, no solo tomar una foto nueva. */
  permitirGaleria?: boolean;
  /** true si OTRA foto del mismo checklist se está comprimiendo ahora mismo — bloquea este campo mientras tanto, para no acumular varias compresiones al mismo tiempo. */
  bloqueado?: boolean;
  /** Avisa al wizard cuándo esta foto empieza/termina de comprimirse (rápido, sin red), para que bloquee las demás mientras tanto. */
  onSubiendoChange?: (subiendo: boolean) => void;
  /** Avisa al wizard cuándo esta foto empieza/termina de subirse EN SEGUNDO PLANO — el wizard usa esto para no dejar enviar el formulario mientras alguna subida siga en curso, sin bloquear la captura de más fotos mientras tanto. */
  onSubidaPendienteChange?: (pendiente: boolean) => void;
  /** Avisa al wizard la URL ya subida de este campo (o null si aún no hay/se quitó) — para poder guardarla en el borrador de localStorage y recuperarla si la página se recarga a medio checklist. */
  onUrlChange?: (url: string | null) => void;
}) {
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(initialUrl ? "foto anterior" : null);
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [listo, setListo] = useState(!!initialUrl);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function actualizarUrl(nuevaUrl: string | null) {
    setUrl(nuevaUrl);
    onUrlChange?.(nuevaUrl);
  }

  // La foto se comprime aquí (rápido, sin red) y de inmediato se marca el
  // campo como "listo" para poder avanzar — la subida real a Vercel Blob
  // corre después, en segundo plano, sin bloquear la captura de las demás
  // fotos. Solo el envío final del formulario espera a que no quede ninguna
  // subida pendiente (ver onSubidaPendienteChange, usado por el wizard).
  async function alSeleccionar(file: File | undefined) {
    if (!file) {
      setNombreArchivo(null);
      actualizarUrl(null);
      setListo(false);
      return;
    }
    setNombreArchivo(file.name);
    actualizarUrl(null);
    setProcesando(true);
    onSubiendoChange?.(true);
    setError(null);
    const comprimido = await comprimirImagen(file);
    setListo(true);
    setProcesando(false);
    onSubiendoChange?.(false);
    onSubidaPendienteChange?.(true);
    try {
      const fd = new FormData();
      fd.set("file", comprimido);
      const result = await subirFotoChecklist(fd);
      if (!result.ok) throw new Error(result.error);
      actualizarUrl(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
      setListo(false);
      setNombreArchivo(null);
    } finally {
      onSubidaPendienteChange?.(false);
    }
  }

  const deshabilitado = bloqueado && !procesando;

  return (
    <div>
      <input type="hidden" name={name} value={url ?? ""} />
      <label
        className="flex items-center gap-2 rounded-md px-3 py-2.5"
        style={{
          background: listo ? "var(--status-cerrado-bg)" : "var(--field-bg)",
          color: listo ? "var(--color-status-cerrado)" : "var(--sidebar-text)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--text-sm)",
          opacity: deshabilitado ? 0.5 : 1,
          cursor: deshabilitado ? "not-allowed" : "pointer",
        }}
      >
        {procesando ? (
          <Loader2 size={15} className="animate-spin shrink-0" />
        ) : listo ? (
          <CheckCircle2 size={15} className="shrink-0" />
        ) : (
          <Camera size={15} className="shrink-0" />
        )}
        <span className="truncate">
          {procesando ? `Procesando ${nombreArchivo}…` : listo ? `${label} — lista` : `${label}${requerido ? " *" : ""}`}
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
