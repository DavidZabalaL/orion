"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, TriangleAlert } from "lucide-react";
import { eliminarChecklist } from "@/app/(app)/checklist/actions";
import { Modal } from "@/components/ui/modal";

const botonStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
};

export function BotonEliminarChecklist({ id }: { id: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function eliminar() {
    setError(null);
    startTransition(async () => {
      const res = await eliminarChecklist(id);
      if (res.ok) router.push(`/unidades/${res.numeroEconomico}`);
      else setError(res.error);
    });
  }

  function cerrar() {
    if (pending) return; // no cerrar a medio borrado
    setConfirmando(false);
    setError(null);
  }

  return (
    <div data-no-print>
      <button
        onClick={() => setConfirmando(true)}
        className="flex items-center gap-1.5 rounded-md px-3 h-10"
        style={{ ...botonStyle, background: "var(--panel-bg)", color: "var(--color-status-escena)", boxShadow: "var(--shadow-sm)" }}
      >
        <Trash2 size={14} /> Borrar checklist
      </button>

      {confirmando && (
        <Modal title="Borrar checklist" onClose={cerrar} maxWidth={420}>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <TriangleAlert size={22} className="shrink-0" style={{ color: "var(--color-status-escena)" }} />
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                ¿Borrar este checklist? <strong>No se puede deshacer.</strong> Se borra también su evidencia; quedará registrado en la bitácora de actividad.
              </p>
            </div>
            {error && (
              <p role="alert" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-error)" }}>
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={cerrar}
                disabled={pending}
                className="rounded-md px-4 h-9 disabled:opacity-50"
                style={{ ...botonStyle, background: "var(--chip)", color: "var(--sidebar-text-active)" }}
              >
                Cancelar
              </button>
              <button
                onClick={eliminar}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-md px-4 h-9 disabled:opacity-50"
                style={{ ...botonStyle, background: "var(--color-status-escena)", color: "#fff" }}
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Sí, borrar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
