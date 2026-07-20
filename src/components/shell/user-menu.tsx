"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut } from "lucide-react";
import { cerrarSesion } from "@/lib/auth-actions";

type Usuario = { name?: string | null; email?: string | null; rol?: string | null };

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function UserMenu({ user }: { user: Usuario }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nombre = user.name || user.email || "Usuario";

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setAbierto((v) => !v)} className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: "var(--brand-navy)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
        >
          {iniciales(nombre)}
        </div>
        <div className="hidden sm:block leading-tight text-left">
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            {nombre}
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
            {user.rol ?? user.email}
          </div>
        </div>
      </button>

      {abierto && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-md py-1 z-50"
          style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-lg)", border: "1px solid var(--field-border)" }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: "var(--field-border)" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{nombre}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{user.email}</div>
          </div>
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2"
              style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}
            >
              <LogOut size={14} /> Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
