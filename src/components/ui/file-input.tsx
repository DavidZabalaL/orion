"use client";

import { useId, useState } from "react";
import { FileUp, FileCheck2 } from "lucide-react";

export function FileInput({
  name,
  accept,
  required,
  helpText,
}: {
  name: string;
  accept?: string;
  required?: boolean;
  helpText?: string;
}) {
  const id = useId();
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <label
        htmlFor={id}
        className="flex items-center gap-2 rounded-md px-5 h-10 font-semibold"
        style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      >
        <FileUp size={16} /> Seleccionar archivo
      </label>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        onChange={(e) => setNombreArchivo(e.target.files?.[0]?.name ?? null)}
        className="sr-only"
      />
      {nombreArchivo ? (
        <div className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-cerrado)" }}>
          <FileCheck2 size={14} /> {nombreArchivo}
        </div>
      ) : helpText ? (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>{helpText}</div>
      ) : null}
    </div>
  );
}
