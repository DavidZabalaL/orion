"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      data-no-print
      onClick={() => window.print()}
      className="flex items-center gap-2 rounded-md px-4 h-10 shrink-0"
      style={{
        background: "var(--panel-bg)",
        color: "var(--sidebar-text-active)",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-base)",
        border: "none",
        cursor: "pointer",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <Printer size={16} />
      Exportar / Imprimir
    </button>
  );
}
