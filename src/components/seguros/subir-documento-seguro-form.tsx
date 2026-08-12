"use client";

import { useState, useTransition } from "react";
import { Upload, CheckCircle2 } from "lucide-react";
import { subirDocumentoSeguro } from "@/app/(app)/seguros/actions";

export function SubirDocumentoSeguroForm({ id, tieneDocumento }: { id: string; tieneDocumento: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-md px-4 h-10 w-fit"
        style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", boxShadow: "var(--shadow-sm)" }}
      >
        <Upload size={15} /> {tieneDocumento ? "Reemplazar PDF de la póliza" : "Subir PDF de la póliza"}
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl p-5"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await subirDocumentoSeguro(formData);
            setOk(true);
            setTimeout(() => { setOk(false); setAbierto(false); }, 1500);
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo subir el archivo.");
          }
        });
      }}
    >
      <input type="hidden" name="id" value={id} />
      <div>
        <label className="block mb-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>
          Archivo PDF *
        </label>
        <input name="archivo" type="file" accept="application/pdf" required style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }} />
      </div>
      <button type="submit" disabled={pending} className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
        {ok ? <><CheckCircle2 size={16} /> Subido</> : pending ? "Subiendo…" : "Guardar archivo"}
      </button>
      {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}
    </form>
  );
}
