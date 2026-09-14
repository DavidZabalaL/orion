"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarRealizado } from "@/app/(app)/mantenimiento/actions";

export function MarcarRealizadoButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await marcarRealizado(formData);
          if (res.ok) {
            router.refresh();
          } else {
            setError(res.error ?? "No se pudo marcar como realizado.");
          }
        });
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md px-2.5 py-1 disabled:opacity-60"
        style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
      >
        {pending ? "…" : "Marcar realizado"}
      </button>
      {error && (
        <p className="mt-1" style={{ color: "var(--color-error)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
