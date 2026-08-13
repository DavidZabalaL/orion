"use client";

import { useState, useTransition } from "react";
import { Plus, X, Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { registrarAccidente } from "@/app/(app)/accidentes/actions";
import { subirFotoChecklist } from "@/app/(app)/checklist/actions";

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

const TIPOS_ACCIDENTE = ["Choque frontal", "Choque lateral", "Choque trasero", "Raspón / rayón", "Robo parcial", "Volcadura", "Otro"];

type Props = {
  numeroEconomico: string;
  operadorId?: string;
};

export function FormAccidente({ numeroEconomico, operadorId }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState("");
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [evidencias, setEvidencias] = useState<string[]>([]);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function alSeleccionarFoto(file: File | undefined) {
    if (!file) return;
    setSubiendoFoto(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const result = await subirFotoChecklist(fd);
      if (!result.ok) throw new Error(result.error);
      setEvidencias((prev) => [...prev, result.url]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
    } finally {
      setSubiendoFoto(false);
    }
  }

  function enviar() {
    setError(null);
    if (!tipo || !fecha || !descripcion.trim()) {
      setError("Tipo, fecha y descripción son obligatorios.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("numeroEconomico", numeroEconomico);
      fd.set("fecha", fecha);
      fd.set("tipo", tipo);
      fd.set("descripcion", descripcion);
      if (operadorId) fd.set("operadorId", operadorId);
      for (const url of evidencias) fd.append("evidencias", url);
      const res = await registrarAccidente(fd);
      if (!res.ok) { setError(res.error); return; }
      setAbierto(false);
      setTipo("");
      setFecha("");
      setDescripcion("");
      setEvidencias([]);
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
        <Plus size={14} /> Registrar accidente
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl p-4" style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)" }}>
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Registrar accidente — {numeroEconomico}
        </span>
        <button type="button" onClick={() => setAbierto(false)}>
          <X size={16} color="var(--sidebar-text)" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label style={labelStyle}>Fecha *</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} max={new Date().toISOString().slice(0, 10)} style={fieldStyle} className="rounded-md" required />
        </div>
        <div>
          <label style={labelStyle}>Tipo *</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={fieldStyle} className="rounded-md">
            <option value="">Selecciona…</option>
            {TIPOS_ACCIDENTE.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Descripción *</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          placeholder="Describe lo sucedido, daños, circunstancias…"
          className="w-full rounded-md px-3 py-2"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        />
      </div>

      <div>
        <label style={labelStyle}>Evidencias fotográficas</label>
        <div className="flex flex-wrap gap-2">
          {evidencias.map((url, i) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`evidencia ${i + 1}`} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: "var(--radius-md)" }} />
              <button
                type="button"
                onClick={() => setEvidencias((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 rounded-full w-5 h-5 flex items-center justify-center"
                style={{ background: "var(--color-status-escena)", color: "#fff" }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <label
            className="flex items-center gap-1 rounded-md px-3 cursor-pointer"
            style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", height: 36 }}
          >
            {subiendoFoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            {subiendoFoto ? "Subiendo…" : "Agregar foto"}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => alSeleccionarFoto(e.target.files?.[0])} />
          </label>
        </div>
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
          {pending ? "Guardando…" : "Guardar accidente"}
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
