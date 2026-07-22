"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Bell, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserMenu } from "@/components/shell/user-menu";
import type { Notificacion } from "@/lib/notificaciones";

type Usuario = { name?: string | null; email?: string | null; rol?: string | null };

const COLOR_SEVERIDAD: Record<Notificacion["severidad"], string> = {
  alta: "var(--priority-alta)",
  media: "var(--priority-media)",
  baja: "var(--priority-baja)",
};

function NotificacionesBell({ notificaciones }: { notificaciones: Notificacion[] }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function alClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", alClickFuera);
    return () => document.removeEventListener("mousedown", alClickFuera);
  }, [abierto]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className="relative flex items-center justify-center rounded-md"
        style={{ height: "var(--h-md)", width: "var(--h-md)", color: "var(--sidebar-text)" }}
        aria-label="Notificaciones"
      >
        <Bell size={18} />
        {notificaciones.length > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 rounded-full"
            style={{ width: 8, height: 8, background: "var(--priority-alta)" }}
          />
        )}
      </button>

      {abierto && (
        <div
          className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] rounded-xl overflow-hidden z-50"
          style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-panel)", border: "1px solid var(--field-border)" }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--field-border)" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
              Notificaciones
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="px-4 py-6 text-center" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                No hay notificaciones.
              </div>
            ) : (
              notificaciones.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setAbierto(false)}
                  className="flex items-start gap-2.5 px-4 py-3"
                  style={{ borderBottom: "1px solid var(--field-border)" }}
                >
                  <span className="mt-1.5 rounded-full shrink-0" style={{ width: 7, height: 7, background: COLOR_SEVERIDAD[n.severidad] }} />
                  <div className="min-w-0">
                    <div className="truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                      {n.titulo}
                    </div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                      {n.descripcion}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link
            href="/usuarios/notificaciones"
            onClick={() => setAbierto(false)}
            className="block px-4 py-2.5 text-center"
            style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-primary)", borderTop: "1px solid var(--field-border)" }}
          >
            Configurar alertas
          </Link>
        </div>
      )}
    </div>
  );
}

export function Header({
  onMenuClick,
  user,
  notificaciones,
}: {
  onMenuClick?: () => void;
  user: Usuario;
  notificaciones: Notificacion[];
}) {
  return (
    <header
      className="flex items-center justify-between gap-4 border-b px-4 md:px-6 shrink-0"
      style={{
        height: "var(--header-height)",
        background: "var(--header-bg)",
        borderColor: "var(--header-border)",
      }}
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onMenuClick}
          className="md:hidden flex items-center justify-center rounded-md shrink-0"
          style={{ height: "var(--h-md)", width: "var(--h-md)", color: "var(--sidebar-text-active)" }}
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        <div
          className="flex items-center gap-2 rounded-md px-3 flex-1 max-w-md"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", height: "var(--h-md)" }}
        >
          <Search size={16} color="var(--sidebar-text)" />
          <input
            placeholder="Buscar por número económico, placa u operador…"
            className="bg-transparent outline-none flex-1 min-w-0"
            style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <NotificacionesBell notificaciones={notificaciones} />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
