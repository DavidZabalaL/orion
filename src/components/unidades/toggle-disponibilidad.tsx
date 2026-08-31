"use client";

import { useState, useTransition } from "react";
import { Power, PowerOff, Loader2, X } from "lucide-react";
import { alternarDisponibilidad } from "@/app/(app)/unidades/actions";

type Props = {
  numeroEconomico: string;
  /** Controlado: el padre es dueño del valor, para mantenerlo en sync con el badge de estatus y "días sin operar". */
  disponible: boolean;
  /** Se llama solo cuando el servidor confirma el cambio — el padre debe actualizar su estado con este valor. */
  onCambio: (nuevoDisponible: boolean) => void;
  deshabilitado?: boolean;
  variante?: "compacto" | "completo";
};

const MOTIVOS: { value: string; label: string }[] = [
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
  { value: "SINIESTRO", label: "Siniestro" },
  { value: "SIN_OPERADOR", label: "Sin operador asignado" },
  { value: "TRAMITE_DOCUMENTACION", label: "Trámite / documentación" },
  { value: "SIN_COMBUSTIBLE", label: "Falta de combustible" },
  { value: "OTRO", label: "Otro" },
];

export function ToggleDisponibilidad({ numeroEconomico, disponible, onCambio, deshabilitado, variante = "compacto" }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [motivoDetalle, setMotivoDetalle] = useState("");

  function enviar(nuevoValor: boolean, motivoSel?: string, motivoDetalleSel?: string) {
    setError(null);
    const formData = new FormData();
    formData.set("numeroEconomico", numeroEconomico);
    formData.set("disponibilidad", String(nuevoValor));
    if (motivoSel) formData.set("motivo", motivoSel);
    if (motivoDetalleSel) formData.set("motivoDetalle", motivoDetalleSel);
    startTransition(async () => {
      const res = await alternarDisponibilidad(formData);
      if (res.ok) {
        onCambio(nuevoValor);
        setPidiendoMotivo(false);
        setMotivo("");
        setMotivoDetalle("");
      } else {
        setError(res.error ?? "No se pudo actualizar.");
      }
    });
  }

  function alternar() {
    if (deshabilitado || pending) return;
    const nuevoValor = !disponible;
    if (nuevoValor) {
      enviar(true);
    } else {
      setError(null);
      setPidiendoMotivo(true);
    }
  }

  function confirmarApagado() {
    if (!motivo) {
      setError("Selecciona un motivo.");
      return;
    }
    enviar(false, motivo, motivoDetalle);
  }

  const Icono = pending ? Loader2 : disponible ? Power : PowerOff;
  const color = disponible ? "var(--resource-disponible)" : "var(--sidebar-text)";
  const titulo = deshabilitado
    ? "No disponible para unidades dadas de baja"
    : disponible
      ? "Encendida — clic para apagar"
      : "Apagada — clic para encender";

  const modalMotivo = pidiendoMotivo && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !pending && setPidiendoMotivo(false)}>
      <div
        className="w-full max-w-sm rounded-2xl shadow-xl p-5"
        style={{ background: "var(--panel-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-md)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Motivo de indisponibilidad
          </h3>
          <button onClick={() => setPidiendoMotivo(false)} style={{ color: "var(--sidebar-text)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mb-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Unidad {numeroEconomico} — indica por qué no está disponible.
        </p>
        <select
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full rounded-lg px-3 py-2 mb-2 outline-none"
          style={{ border: "1px solid var(--field-border)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}
        >
          <option value="">Selecciona un motivo…</option>
          {MOTIVOS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {motivo === "OTRO" && (
          <input
            value={motivoDetalle}
            onChange={(e) => setMotivoDetalle(e.target.value)}
            placeholder="Describe el motivo…"
            className="w-full rounded-lg px-3 py-2 mb-2 outline-none"
            style={{ border: "1px solid var(--field-border)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}
          />
        )}
        {error && <p className="mb-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>{error}</p>}
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={() => setPidiendoMotivo(false)} className="px-3 py-2 rounded-lg" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
            Cancelar
          </button>
          <button
            onClick={confirmarApagado}
            disabled={pending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg disabled:opacity-50"
            style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Apagar unidad
          </button>
        </div>
      </div>
    </div>
  );

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
        {error && !pidiendoMotivo && <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>{error}</span>}
        {modalMotivo}
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
      {error && !pidiendoMotivo && <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>!</span>}
      {modalMotivo}
    </div>
  );
}
