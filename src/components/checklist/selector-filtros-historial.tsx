import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";

const TIPO_CHECKLIST_LABEL: Record<string, string> = {
  DIARIO: "Diario",
  SEMANAL: "Semanal",
  CARGA_COMBUSTIBLE: "Carga de combustible",
  REPORTE_FALLA: "Reporte de falla",
};

const labelStyle: React.CSSProperties = { display: "block", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", marginBottom: 4 };
const fieldStyle: React.CSSProperties = { background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" };

export function SelectorFiltrosHistorial({
  desde,
  hasta,
  tipo,
  proyectoId,
  tipoVehiculo,
  soloAlertas,
  proyectos,
}: {
  desde: string;
  hasta: string;
  tipo: string;
  proyectoId: string;
  tipoVehiculo: string;
  soloAlertas: boolean;
  proyectos: { id: string; nombre: string }[];
}) {
  return (
    <form className="flex flex-wrap items-end gap-3 rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }} data-no-print>
      <div>
        <label style={labelStyle}>Desde</label>
        <input type="date" name="desde" defaultValue={desde} required className="rounded-md px-3" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
      </div>
      <div>
        <label style={labelStyle}>Hasta</label>
        <input type="date" name="hasta" defaultValue={hasta} required className="rounded-md px-3" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
      </div>
      <div>
        <label style={labelStyle}>Tipo de checklist</label>
        <select name="tipo" defaultValue={tipo} className="rounded-md px-3" style={fieldStyle}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_CHECKLIST_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Proyecto</label>
        <select name="proyectoId" defaultValue={proyectoId} className="rounded-md px-3" style={fieldStyle}>
          <option value="">Todos los proyectos</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Tipo de unidad</label>
        <select name="tipoVehiculo" defaultValue={tipoVehiculo} className="rounded-md px-3" style={fieldStyle}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_VEHICULO_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>{label}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 pb-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>
        <input type="checkbox" name="soloAlertas" value="1" defaultChecked={soloAlertas} />
        Solo con alertas
      </label>
      <button type="submit" className="rounded-md px-5 h-9 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
        Filtrar
      </button>
    </form>
  );
}
