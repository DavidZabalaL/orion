"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export function CopiarEnlaceRegistro() {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    const url = `${window.location.origin}/registro-operador`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copia el enlace:", url);
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="flex items-center gap-2 rounded-md px-4 h-10"
      style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", boxShadow: "var(--shadow-sm)" }}
    >
      {copiado ? <Check size={16} color="var(--color-status-cerrado)" /> : <Link2 size={16} />}
      {copiado ? "¡Enlace copiado!" : "Copiar enlace de autorregistro"}
    </button>
  );
}
