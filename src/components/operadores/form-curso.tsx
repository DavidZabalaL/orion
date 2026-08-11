"use client";

import { useState, useTransition } from "react";
import { Plus, X, Camera, Loader2 } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { registrarCurso } from "@/app/(app)/accidentes/actions";

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
  height: "var(--h-lg)",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  display: "block",
  marginBottom: 4,
};

type Props = {
  operadorId: string;
};

export function FormCurso({ operadorId }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [evidenciaUrl, setEvidenciaUrl] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function alSeleccionarArchivo(file: File | undefined) {
    if (!file) return;
    setSubiendoFoto(true);
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/checklist-upload" });
      setEvidenciaUrl(blob.url);
    } catch {
      setError("No se pudo subir el archivo.");
    } finally {
      setSubiendoFoto(false);
    }
  }

  function enviar() {
    setError(null);
    if (!nombre.trim() || !fecha) {
      setError("Nombre del curso y fecha son obligatorios.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("operadorId", operadorId);
      fd.set("nombre", nombre);
      fd.set("fecha", fecha);
      if (evidenciaUrl) fd.set("evidenciaUrl", evidenciaUrl);
      const res = await registrarCurso(fd);
      if (!res.ok) { setError(res.error); return; }
      setAbierto(false);
      setNombre("");
      setFecha("");
      setEvidenciaUrl(null);
      router.refresh();
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-md px-3 h-9 font-semibold"
        style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
      >
        <Plus size={14} /> Agregar curso
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl p-4" style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)" }}>
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Agregar curso / capacitación
        </span>
        <button type="button" onClick={() => setAbierto(false)}>
          <X size={16} color="var(--sidebar-text)" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label style={labelStyle}>Nombre del curso *</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Manejo defensivo, Primeros auxilios…"
            style={fieldStyle}
            className="rounded-md"
          />
        </div>
        <div>
          <label style={labelStyle}>Fecha *</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={fieldStyle} className="rounded-md" />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Evidencia (constancia / diploma)</label>
        <label
          className="flex items-center gap-2 rounded-md px-3 cursor-pointer"
          style={{
            background: evidenciaUrl ? "var(--status-cerrado-bg)" : "var(--field-bg)",
            color: evidenciaUrl ? "var(--color-status-cerrado)" : "var(--sidebar-text)",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-sm)",
            border: "1px solid var(--field-border)",
            height: "var(--h-lg)",
            width: "fit-content",
          }}
        >
          {subiendoFoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {subiendoFoto ? "Subiendo…" : evidenciaUrl ? "Evidencia adjunta ✓" : "Subir evidencia"}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => alSeleccionarArchivo(e.target.files?.[0])}
          />
        </label>
        {evidenciaUrl && (
          <button
            type="button"
            onClick={() => setEvidenciaUrl(null)}
            className="mt-1 flex items-center gap-1"
            style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}
          >
            <X size={11} /> Quitar evidencia
          </button>
        )}
      </div>

      {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={enviar}
          disabled={pending || subiendoFoto}
          className="flex items-center gap-2 rounded-md px-4 h-9 font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {pending ? "Guardando…" : "Guardar curso"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="flex items-center gap-2 rounded-md px-4 h-9"
          style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
