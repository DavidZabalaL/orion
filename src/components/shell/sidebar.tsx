"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { GRUPOS, MODULOS } from "@/lib/modulos";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { OrionIcon } from "@/components/brand/orion-icon";
import { UserMenu } from "@/components/shell/user-menu";
import packageJson from "../../../package.json";

const CLAVE_COLAPSADO = "orion-sidebar-colapsado";

type Usuario = { name?: string | null; email?: string | null; rol?: string | null };

export function Sidebar({
  mobileOpen = false,
  onClose,
  user,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
  user: Usuario;
}) {
  const pathname = usePathname();
  const [colapsado, setColapsado] = useState(false);

  useEffect(() => {
    // Se lee después del montaje (no en el render) porque localStorage no existe en el servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem(CLAVE_COLAPSADO) === "1") setColapsado(true);
  }, []);

  function alternarColapso() {
    setColapsado((actual) => {
      const siguiente = !actual;
      localStorage.setItem(CLAVE_COLAPSADO, siguiente ? "1" : "0");
      return siguiente;
    });
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "var(--overlay-bg)" }}
          onClick={onClose}
        />
      )}
      <aside
        className={clsx(
          "flex flex-col w-64 shrink-0 border-r fixed inset-y-0 left-0 z-50 transition-all md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          colapsado ? "md:w-20" : "md:w-64"
        )}
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--header-border)" }}
      >
        <button
          onClick={alternarColapso}
          className="hidden md:flex absolute -right-3 top-6 items-center justify-center rounded-full"
          style={{
            width: 24,
            height: 24,
            background: "var(--panel-bg)",
            border: "1px solid var(--field-border)",
            color: "var(--sidebar-text)",
          }}
          aria-label={colapsado ? "Expandir barra lateral" : "Colapsar barra lateral"}
        >
          {colapsado ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div
          className={clsx("flex items-center gap-2 shrink-0", colapsado ? "md:justify-center md:px-0 px-5" : "px-5")}
          style={{ height: "var(--header-height)" }}
        >
          <OrionIcon size={32} />
          <div className={clsx("leading-tight overflow-hidden", colapsado && "md:hidden")}>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "var(--text-md)", color: "var(--sidebar-text-active)" }}>
              Orión
            </div>
            <div className="whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
              Control Vehicular · Grupo Kabat
            </div>
          </div>
          <button
            onClick={onClose}
            className={clsx("md:hidden ml-auto flex items-center justify-center rounded-md", colapsado && "md:ml-0")}
            style={{ height: 32, width: 32, color: "var(--sidebar-text)" }}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
          {GRUPOS.map((grupo) => (
            <div key={grupo} className="mb-3">
              <div
                className={clsx("px-3 pb-1 pt-2 uppercase truncate", colapsado && "md:hidden")}
                style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "var(--sidebar-text)", opacity: 0.6 }}
              >
                {grupo}
              </div>
              <div className="space-y-0.5">
                {MODULOS.filter((m) => m.grupo === grupo).map((m) => {
                  const active = pathname === m.href || pathname.startsWith(m.href + "/");
                  const Icon = m.icon;
                  return (
                    <Link
                      key={m.id}
                      href={m.href}
                      onClick={onClose}
                      title={m.label}
                      className={clsx(
                        "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
                        colapsado && "md:justify-center md:px-0"
                      )}
                      style={{
                        background: active ? "var(--sidebar-item-active)" : "transparent",
                        color: active ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                        border: "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (active) return;
                        e.currentTarget.style.background = "var(--sidebar-item-hover)";
                        e.currentTarget.style.borderColor = "var(--field-border)";
                        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                      }}
                      onMouseLeave={(e) => {
                        if (active) return;
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <Icon size={17} strokeWidth={active ? 2.25 : 1.75} className="shrink-0" />
                      <span
                        className={clsx("truncate", colapsado && "md:hidden")}
                        style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: active ? 600 : 400 }}
                      >
                        {m.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t px-3 pt-3 shrink-0" style={{ borderColor: "var(--header-border)" }}>
          <UserMenu user={user} colapsado={colapsado} />
        </div>

        <div
          className={clsx("px-5 pt-1.5 pb-3 shrink-0", colapsado && "md:hidden")}
          style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", opacity: 0.5 }}
        >
          v{packageJson.version}
        </div>
      </aside>
    </>
  );
}
