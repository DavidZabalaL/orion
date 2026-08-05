"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { Camera, Loader2 } from "lucide-react";

export function CampoFotoSemanal({
  name,
  label,
  requerido,
}: {
  name: string;
  label: string;
  requerido: boolean;
}) {
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
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
    setError(null);
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/checklist-upload" });
      setUrl(blob.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
      setNombreArchivo(null);
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={url ?? ""} />
      <label
        className="flex items-center gap-2 rounded-md px-3 py-2.5 cursor-pointer"
        style={{
          background: url ? "var(--status-cerrado-bg)" : "var(--field-bg)",
          color: url ? "var(--color-status-cerrado)" : "var(--sidebar-text)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--text-sm)",
        }}
      >
        {subiendo ? <Loader2 size={15} className="animate-spin shrink-0" /> : <Camera size={15} className="shrink-0" />}
        <span className="truncate">
          {subiendo ? `Subiendo ${nombreArchivo}…` : url ? `${label} — adjuntada` : `${label}${requerido ? " *" : ""}`}
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => alSeleccionar(e.target.files?.[0])}
        />
      </label>
      {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>{error}</p>}
    </div>
  );
}
