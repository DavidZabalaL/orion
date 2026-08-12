"use client";

import { useState, useTransition } from "react";
import { LogOut, TriangleAlert } from "lucide-react";
import { forzarCierreSesion } from "@/app/(app)/admin/actividad/actions";

export function BotonCerrarSesion({ usuarioId, nombre }: { usuarioId: string; nombre: string }) {
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleConfirmar(formData: FormData) {
    startTransition(async () => {
      const res = await forzarCierreSesion(formData);
      if (!res.ok) setError(res.error ?? "No se pudo cerrar la sesión.");
      setConfirmando(false);
    });
  }

  if (confirmando) {
    return (
      <div className="flex flex-wrap items-center gap-2" data-no-print>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
          ¿Cerrar la sesión de <strong>{nombre}</strong>?
        </span>
        <form action={handleConfirmar} className="flex items-center gap-2">
          <input type="hidden" name="usuarioId" value={usuarioId} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md px-2.5 py-1 font-semibold disabled:opacity-60"
            style={{ background: "var(--color-status-escena)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}
          >
            {pending ? "Cerrando…" : "Sí, cerrar"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="rounded-md px-2 py-1"
          style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2" data-no-print>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirmando(true);
        }}
        className="flex items-center gap-1 rounded-md px-2.5 py-1"
        style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
        title="Fuerza que este usuario tenga que iniciar sesión de nuevo"
      >
        <LogOut size={12} /> Cerrar sesión
      </button>
      {error && (
        <span className="flex items-center gap-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>
          <TriangleAlert size={12} /> {error}
        </span>
      )}
    </div>
  );
}
