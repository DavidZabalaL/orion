import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { crearProyecto } from "../actions";

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

export default function NuevoProyectoPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-xl">
      <div>
        <Link href="/proyectos" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Nuevo proyecto
        </h1>
      </div>

      <form action={crearProyecto} className="flex flex-col gap-4 rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <div>
          <label style={labelStyle}>Nombre del proyecto *</label>
          <input name="nombre" required style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Estado de la república *</label>
          <input name="estadoRepublica" required style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Fecha de inicio *</label>
          <input name="fechaInicio" type="date" required style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Presupuesto aprobado anual (MXN)</label>
          <input name="presupuestoAprobadoAnual" type="number" step="0.01" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-md px-5 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            Crear proyecto
          </button>
          <Link href="/proyectos" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}>Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
