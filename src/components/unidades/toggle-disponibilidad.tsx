"use client";

import { useState, useTransition } from "react";
import { Power, PowerOff, Loader2 } from "lucide-react";
import { alternarDisponibilidad } from "@/app/(app)/unidades/actions";

type Props = {
  numeroEconomico: string;
  disponibleInicial: boolean;
  deshabilitado?: boolean;
  variante?: "compacto" | "completo";
};

export function ToggleDisponibilidad({ numeroEconomico, disponibleInicial, deshabilitado, variante = "compacto" }: Props) {
  const [disponible, setDisponible] = useState(disponibleInicial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function alternar() {
    if (deshabilitado || pending) return;
    setError(null);
    const formData = new FormData();
    formData.set("numeroEconomico", numeroEconomico);
    formData.set("disponibilidad", String(!disponible));
    startTransition(async () => {
      const res = await alternarDisponibilidad(formData);
      if (res.ok) setDisponible((v) => !v);
      else setError(res.error ?? "No se pudo actualizar.");
    });
  }

  const Icono = pending ? Loader2 : disponible ? Power : PowerOff;
  const color = disponible ? "var(--resource-disponible)" : "var(--sidebar-text)";
  const titulo = deshabilitado
    ? "No disponible para unidades dadas de baja"
    : disponible
      ? "Encendida — clic para apagar"
      : "Apagada — clic para encender";

  if (variante === "completo") {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={alternar}
          disabled={deshabilitado || pending}
          title={titulo}
          className="flex items-center gap-2 rounded-md px-3 h-9 disabled:opacity-50"
          style={{
            background: disponible ? "var(--status-cerrado-bg)" : "var(--panel-bg)",
            boxShadow: "var(--shadow-sm)",
            color,
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-base)",
          }}
        >
          <Icono size={15} className={pending ? "animate-spin" : undefined} />
          {disponible ? "Apagar unidad" : "Encender unidad"}
        </button>
        {error && <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={alternar}
        disabled={deshabilitado || pending}
        title={titulo}
        aria-label={titulo}
        className="flex items-center justify-center rounded-md disabled:opacity-40"
        style={{ width: 26, height: 26, color }}
      >
        <Icono size={16} className={pending ? "animate-spin" : undefined} />
      </button>
      {error && <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>!</span>}
    </div>
  );
}
