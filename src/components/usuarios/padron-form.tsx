"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, TriangleAlert } from "lucide-react";
import { actualizarPadronPersonal } from "@/app/(app)/usuarios/padron/actions";
import { FileInput } from "@/components/ui/file-input";

export function PadronForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ ok: boolean; error?: string; total?: number; omitidas?: number } | null>(null);

  return (
    <form
      className="rounded-xl p-6 flex flex-col items-center gap-4"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      action={(formData) => {
        setResultado(null);
        startTransition(async () => {
          const res = await actualizarPadronPersonal(formData);
          setResultado(res);
          if (res.ok) router.refresh();
        });
      }}
    >
      <Upload size={28} color="var(--color-primary)" />
      <FileInput name="archivo" accept=".xlsx,.xls,.csv" required helpText="Ningún archivo seleccionado" />

      {resultado?.ok && (
        <div className="flex items-start gap-2 rounded-md px-3 py-2.5 w-full" style={{ background: "var(--status-cerrado-bg)" }}>
          <CheckCircle2 size={15} color="var(--color-status-cerrado)" className="shrink-0 mt-0.5" />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-cerrado)" }}>
            Padrón actualizado: {resultado.total} personas cargadas{resultado.omitidas ? `, ${resultado.omitidas} filas omitidas por datos incompletos o CURP repetido` : ""}.
          </span>
        </div>
      )}
      {resultado && !resultado.ok && (
        <div className="flex items-start gap-2 rounded-md px-3 py-2.5 w-full" style={{ background: "var(--status-escena-bg)" }}>
          <TriangleAlert size={15} color="var(--color-status-escena)" className="shrink-0 mt-0.5" />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{resultado.error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md px-5 h-10 font-semibold disabled:opacity-60"
        style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      >
        {pending ? "Actualizando…" : "Actualizar padrón"}
      </button>
    </form>
  );
}
