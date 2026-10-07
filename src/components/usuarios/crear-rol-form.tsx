"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { crearRol } from "@/app/(app)/usuarios/actions";

export function CrearRolForm() {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("nombre", nombre);
    startTransition(async () => {
      const resultado = await crearRol(fd);
      if (resultado.ok) {
        setNombre("");
        setAbierto(false);
      } else {
        setError(resultado.error);
      }
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-md px-4 h-10 w-fit"
        style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", boxShadow: "var(--shadow-sm)" }}
      >
        <Plus size={16} /> Crear rol
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div>
        <label style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", marginBottom: 4 }}>Nombre del rol</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Compras"
          autoFocus
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", borderRadius: "var(--radius-md)", padding: "0 12px" }}
        />
      </div>
      <button type="submit" disabled={pending} className="rounded-md px-4 h-10 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
        {pending ? "Creando…" : "Crear"}
      </button>
      <button type="button" onClick={() => { setAbierto(false); setError(null); }} className="rounded-md px-4 h-10" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}>
        Cancelar
      </button>
      {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-error)" }}>{error}</p>}
    </form>
  );
}
