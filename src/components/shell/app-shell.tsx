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
}: {
  children: React.ReactNode;
  session: Session;
  notificaciones: Notificacion[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} user={session.user} />
      <div className="flex flex-1 flex-col min-w-0">
        <Header onMenuClick={() => setMobileOpen(true)} notificaciones={notificaciones} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
