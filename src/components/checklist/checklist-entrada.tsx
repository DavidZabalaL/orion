"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardCheck, Fuel, AlertTriangle } from "lucide-react";
import { WizardDiario } from "@/components/checklist/wizard-diario";
import { WizardSemanal } from "@/components/checklist/wizard-semanal";
import { WizardCargaCombustible } from "@/components/checklist/wizard-carga-combustible";
import { WizardReporteFalla } from "@/components/checklist/wizard-reporte-falla";
import { leerBorrador } from "@/lib/borrador-checklist";

// Cada valor es también la clave de borrador de su wizard (CLAVE_BORRADOR en wizard-*.tsx).
type TipoChecklist = "diario" | "semanal" | "carga_combustible" | "reporte_falla";

// Android puede matar la pestaña mientras la app de Cámara está al frente y recargarla al volver, lo que
// regresaba al operador a estas tarjetas. sessionStorage (sobrevive la recarga, muere con la pestaña)
// recuerda qué wizard estaba abierto para reabrirlo solo; su borrador restaura el paso.
const CLAVE_EN_CURSO = "orion-checklist-en-curso";

function leerEnCurso(): TipoChecklist | null {
  try {
    const tipo = window.sessionStorage.getItem(CLAVE_EN_CURSO) as TipoChecklist | null;
    return tipo && leerBorrador(tipo) !== null ? tipo : null;
  } catch {
    return null;
  }
}

const sinSuscripcion = () => () => {};

type UnidadWizard = {
  numeroEconomico: string;
  placas: string;
  marca: string;
  unidadModelo: string;
  tipoVehiculo: string;
  proyectoId: string | null;
  proyectoNombre: string | null;
  disponibilidad: boolean;
  motivoIndisponibilidad: string | null;
  responsableActivo: string | null;
  esResponsableActual: boolean;
};

type Props = {
  unidades: UnidadWizard[];
  proyectos: { id: string; nombre: string }[];
  esAdmin: boolean;
  fechaHoraActual: string;
  permitirGaleriaFotos: boolean;
  permitirApoyoOperador: boolean;
};

export function ChecklistEntrada({ unidades, proyectos, esAdmin, fechaHoraActual, permitirGaleriaFotos, permitirApoyoOperador }: Props) {
  const router = useRouter();
  // El servidor pinta siempre las tarjetas (null); el wizard en curso se lee ya en el cliente, sin desajuste de hidratación.
  const enCurso = useSyncExternalStore(sinSuscripcion, leerEnCurso, () => null);
  // undefined = aún sin decidir; se fija una sola vez para que borrar el borrador al terminar no cierre el wizard.
  const [activo, setActivo] = useState<TipoChecklist | null | undefined>(undefined);
  if (activo === undefined && enCurso) setActivo(enCurso);

  function abrir(tipo: TipoChecklist | null) {
    try {
      if (tipo) window.sessionStorage.setItem(CLAVE_EN_CURSO, tipo);
      else window.sessionStorage.removeItem(CLAVE_EN_CURSO);
    } catch {
      // Sin sessionStorage solo se pierde la reapertura automática tras una recarga.
    }
    setActivo(tipo);
  }

  function alTerminar() {
    abrir(null);
    router.refresh();
  }

  if (activo === "diario") {
    return (
      <WizardDiario
        unidades={unidades}
        proyectos={proyectos}
        esAdmin={esAdmin}
        fechaHoraActual={fechaHoraActual}
        permitirGaleriaFotos={permitirGaleriaFotos}
        onTerminar={alTerminar}
        onCancelar={() => abrir(null)}
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
        permitirGaleriaFotos={permitirGaleriaFotos}
        permitirApoyoOperador={permitirApoyoOperador}
        onTerminar={alTerminar}
        onCancelar={() => abrir(null)}
      />
    );
  }

  if (activo === "carga_combustible") {
    return (
      <WizardCargaCombustible
        unidades={unidades}
        permitirGaleriaFotos={permitirGaleriaFotos}
        permitirApoyoOperador={permitirApoyoOperador}
        onTerminar={alTerminar}
        onCancelar={() => abrir(null)}
      />
    );
  }

  if (activo === "reporte_falla") {
    return (
      <WizardReporteFalla
        unidades={unidades}
        permitirGaleriaFotos={permitirGaleriaFotos}
        onTerminar={alTerminar}
        onCancelar={() => abrir(null)}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <TarjetaIniciar
        titulo="Checklist Diario"
        descripcion="Odómetro, 6 puntos de inspección y evidencia fotográfica. Reemplaza el formulario de Fast Field."
        onClick={() => abrir("diario")}
        icono={<ClipboardCheck size={28} color="var(--color-primary)" />}
      />
      <TarjetaIniciar
        titulo="Checklist Semanal"
        descripcion="Inspección completa de 59 puntos: niveles, exterior, interior y herramientas."
        onClick={() => abrir("semanal")}
        icono={<ClipboardCheck size={28} color="var(--color-primary)" />}
      />
      <TarjetaIniciar
        titulo="Carga de Combustible"
        descripcion="Registro de carga con zona, responsable, vehículo, evidencia fotográfica y firma digital."
        onClick={() => abrir("carga_combustible")}
        icono={<Fuel size={28} color="var(--color-status-revision)" />}
      />
      <TarjetaIniciar
        titulo="Reporte de Falla"
        descripcion="Reporta una falla del vehículo — notifica de inmediato al Gerente administrativo del proyecto."
        onClick={() => abrir("reporte_falla")}
        icono={<AlertTriangle size={28} color="var(--color-status-escena)" />}
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
