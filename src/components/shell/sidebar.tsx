"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { MODULOS } from "@/lib/modulos";
import { X } from "lucide-react";
import { OrionIcon } from "@/components/brand/orion-icon";
import packageJson from "../../../package.json";

export function Sidebar({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

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
          "flex flex-col w-64 shrink-0 border-r fixed inset-y-0 left-0 z-50 transition-transform md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--header-border)" }}
      >
      <div
        className="flex items-center gap-2 px-5 shrink-0"
        style={{ height: "var(--header-height)" }}
      >
        <OrionIcon size={32} />
        <div className="leading-tight">
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "var(--text-md)", color: "var(--sidebar-text-active)" }}>
            Orión
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
            Control Vehicular · Grupo Kabat
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden ml-auto flex items-center justify-center rounded-md"
          style={{ height: 32, width: 32, color: "var(--sidebar-text)" }}
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {MODULOS.map((m) => {
          const active = pathname === m.href || pathname.startsWith(m.href + "/");
          const Icon = m.icon;
          return (
            <Link
              key={m.id}
              href={m.href}
              onClick={onClose}
              className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors"
              style={{
                background: active ? "var(--sidebar-item-active)" : "transparent",
                color: active ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "var(--sidebar-item-hover)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon size={17} strokeWidth={active ? 2.25 : 1.75} className="shrink-0" />
              <span
                className={clsx("truncate")}
                style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: active ? 600 : 400 }}
              >
                {m.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div
        className="px-5 py-3 shrink-0"
        style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", opacity: 0.5 }}
      >
        v{packageJson.version}
      </div>
      </aside>
    </>
  );
}
