"use client";

import { useState } from "react";
import type { Session } from "next-auth";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { Notificacion } from "@/lib/notificaciones";

export function AppShell({
  children,
  session,
  notificaciones,
  modulosVisibles,
  esDevAdmin = false,
}: {
  children: React.ReactNode;
  session: Session;
  notificaciones: Notificacion[];
  modulosVisibles: string[];
  esDevAdmin?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <div data-no-print>
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} user={session.user} modulosVisibles={modulosVisibles} esDevAdmin={esDevAdmin} />
      </div>
      <div className="flex flex-1 flex-col min-w-0">
        <div data-no-print>
          <Header onMenuClick={() => setMobileOpen(true)} user={session.user} notificaciones={notificaciones} esDevAdmin={esDevAdmin} />
        </div>
        <main className="flex-1 overflow-y-auto" data-print-area>{children}</main>
      </div>
    </div>
  );
}
