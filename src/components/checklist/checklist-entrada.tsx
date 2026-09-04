"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardCheck, Fuel } from "lucide-react";
import { WizardDiario } from "@/components/checklist/wizard-diario";
import { WizardSemanal } from "@/components/checklist/wizard-semanal";
import { WizardCargaCombustible } from "@/components/checklist/wizard-carga-combustible";

type UnidadWizard = {
  numeroEconomico: string;
  marca: string;
  unidadModelo: string;
  tipoVehiculo: string;
  proyectoId: string | null;
  proyectoNombre: string | null;
  responsableActivo: string | null;
};

type Props = {
  unidades: UnidadWizard[];
  proyectos: { id: string; nombre: string }[];
  esAdmin: boolean;
  fechaHoraActual: string;
};

export function ChecklistEntrada({ unidades, proyectos, esAdmin, fechaHoraActual }: Props) {
  const router = useRouter();
  const [activo, setActivo] = useState<null | "diario" | "semanal" | "carga_combustible">(null);

  function alTerminar() {
    setActivo(null);
    router.refresh();
  }

  if (activo === "diario") {
    return (
      <WizardDiario
        unidades={unidades}
        proyectos={proyectos}
        esAdmin={esAdmin}
        fechaHoraActual={fechaHoraActual}
        onTerminar={alTerminar}
        onCancelar={() => setActivo(null)}
      />
    );
  }

  if (activo === "semanal") {
    return (
      <WizardSemanal
        unidades={unidades}
        proyectos={proyectos}
        esAdmin={esAdmin}
        fechaHoraActual={fechaHoraActual}
        onTerminar={alTerminar}
        onCancelar={() => setActivo(null)}
      />
    );
  }

  if (activo === "carga_combustible") {
    return (
      <WizardCargaCombustible
        unidades={unidades}
        onTerminar={alTerminar}
        onCancelar={() => setActivo(null)}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <TarjetaIniciar
        titulo="Checklist Diario"
        descripcion="Odómetro, 6 puntos de inspección y evidencia fotográfica. Reemplaza el formulario de Fast Field."
        onClick={() => setActivo("diario")}
        icono={<ClipboardCheck size={28} color="var(--color-primary)" />}
      />
      <TarjetaIniciar
        titulo="Checklist Semanal"
        descripcion="Inspección completa de 59 puntos: niveles, exterior, interior y herramientas."
        onClick={() => setActivo("semanal")}
        icono={<ClipboardCheck size={28} color="var(--color-primary)" />}
      />
      <TarjetaIniciar
        titulo="Carga de Combustible"
        descripcion="Registro de carga con zona, responsable, vehículo, evidencia fotográfica y firma digital."
        onClick={() => setActivo("carga_combustible")}
        icono={<Fuel size={28} color="var(--color-status-revision)" />}
      />
    </div>
  );
}

function TarjetaIniciar({
  titulo,
  descripcion,
  onClick,
  icono,
}: {
  titulo: string;
  descripcion: string;
  onClick: () => void;
  icono?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-4 rounded-xl p-6 text-left transition-opacity hover:opacity-80 active:opacity-70"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
    >
      {icono ?? <ClipboardCheck size={28} color="var(--color-primary)" />}
      <div className="flex-1">
        <h3
          style={{
            fontFamily: "var(--font)",
            fontSize: "var(--text-lg)",
            fontWeight: 700,
            color: "var(--sidebar-text-active)",
          }}
        >
          {titulo}
        </h3>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-sm)",
            color: "var(--sidebar-text)",
            marginTop: 4,
          }}
        >
          {descripcion}
        </p>
      </div>
      <div
        className="flex items-center gap-2 rounded-md px-4 h-9 font-semibold"
        style={{
          background: "var(--color-primary)",
          color: "#fff",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--text-sm)",
        }}
      >
        <ArrowRight size={15} /> Iniciar
      </div>
    </button>
  );
}
