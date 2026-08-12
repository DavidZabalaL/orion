"use client";

import Link from "next/link";
import { ChevronLeft, Printer } from "lucide-react";

export function TarjetaPrintButton() {
  return (
    <div className="flex items-center justify-between">
      <Link href="/seguros" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
        <ChevronLeft size={15} /> Volver
      </Link>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded-md px-4 h-10"
        style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      >
        <Printer size={16} /> Exportar / Imprimir
      </button>
    </div>
  );
}
