"use client";

import { useTransition } from "react";
import { marcarRealizado } from "@/app/mantenimiento/actions";

export function MarcarRealizadoButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(() => marcarRealizado(formData));
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
    </form>
  );
}
