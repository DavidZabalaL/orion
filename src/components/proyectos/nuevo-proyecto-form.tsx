"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { crearProyecto } from "@/app/(app)/proyectos/actions";
import { CampoAyuda } from "@/components/ui/campo-ayuda";

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
  width: "100%",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  display: "block",
  marginBottom: 6,
};

export function NuevoProyectoForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-4 rounded-xl p-5"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      action={(formData) => {
        startTransition(async () => {
          const resultado = await crearProyecto(formData);
          if (!resultado.ok) setError(resultado.error ?? "No se pudo crear el proyecto.");
        });
      }}
    >
      <div>
        <CampoAyuda style={labelStyle} texto="Nombre con el que se identifica el proyecto en la plataforma.">Nombre del proyecto *</CampoAyuda>
        <input name="nombre" required style={fieldStyle} />
      </div>
      <div>
        <CampoAyuda style={labelStyle} texto="Estado de la república donde opera principalmente el proyecto.">Estado de la república *</CampoAyuda>
        <input name="estadoRepublica" required style={fieldStyle} />
      </div>
      <div>
        <CampoAyuda style={labelStyle} texto="Fecha en la que arranca operaciones el proyecto.">Fecha de inicio *</CampoAyuda>
        <input name="fechaInicio" type="date" required style={fieldStyle} />
      </div>
      {error && (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md px-5 h-10 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          {pending ? "Creando…" : "Crear proyecto"}
        </button>
        <Link href="/proyectos" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}>Cancelar</Link>
      </div>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
        Al crear el proyecto podrás cargar, si quieres, el archivo de presupuesto por partida — es opcional y puedes hacerlo después.
      </p>
    </form>
  );
}
