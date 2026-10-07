"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { obtenerChecklistsParaExportar, type ChecklistParaExportar } from "@/app/(app)/checklist/actions";
import { TIPO_CHECKLIST_LABEL, COLUMNAS_POR_TIPO } from "@/lib/checklist-exportar";
import { exportarExcel, type HojaExcel } from "@/lib/exportar-excel";
import { fmtFechaHora } from "@/lib/formato";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import type { TipoChecklist } from "@/generated/prisma/enums";

const TODOS_LOS_TIPOS = Object.keys(TIPO_CHECKLIST_LABEL) as TipoChecklist[];

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
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  marginBottom: 6,
};

function construirHojas(checklists: ChecklistParaExportar[]): HojaExcel[] {
  const encabezadoBase = ["Fecha", "Unidad", "Marca", "Modelo", "Capturado por", "Alerta"];
  return TODOS_LOS_TIPOS.map((tipo) => {
    const filasTipo = checklists.filter((c) => c.tipo === tipo);
    if (filasTipo.length === 0) return null;

    const columnasExtra = COLUMNAS_POR_TIPO[tipo];
    const encabezadoExtra = tipo === "DIARIO" ? ["Odómetro", "Horómetro", ...columnasExtra.map((c) => c.label)] : columnasExtra.map((c) => c.label);

    const filas = filasTipo.map((c) => {
      const datos = tipo === "DIARIO" ? { ...(c.puntosInspeccion ?? {}), ...c.respuestasSemanal } : c.respuestasSemanal;
      const base = [fmtFechaHora(c.fecha), c.unidad.numeroEconomico, c.unidad.marca, c.unidad.unidadModelo, c.capturadoPor?.nombre ?? "—", c.alerta ? "Sí" : "No"];
      const extra = tipo === "DIARIO" ? [c.odometro ?? "", c.horometro ?? "", ...columnasExtra.map((col) => datos[col.key] ?? "")] : columnasExtra.map((col) => datos[col.key] ?? "");
      return [...base, ...extra];
    });

    return { nombre: TIPO_CHECKLIST_LABEL[tipo], headers: [...encabezadoBase, ...encabezadoExtra], filas };
  }).filter((h): h is HojaExcel => h !== null);
}

export function ExportarChecklistModal({ proyectos }: { proyectos: { id: string; nombre: string }[] }) {
  const [abierto, setAbierto] = useState(false);
  const [tipos, setTipos] = useState<Set<TipoChecklist>>(new Set(TODOS_LOS_TIPOS));
  const hoy = new Date().toISOString().slice(0, 10);
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [proyectoId, setProyectoId] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function alternarTipo(tipo: TipoChecklist) {
    setTipos((actual) => {
      const copia = new Set(actual);
      if (copia.has(tipo)) copia.delete(tipo);
      else copia.add(tipo);
      return copia;
    });
  }

  async function exportar() {
    if (tipos.size === 0) {
      setError("Selecciona al menos un tipo de checklist.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const checklists = await obtenerChecklistsParaExportar({
        tipos: [...tipos],
        desde,
        hasta,
        proyectoId: proyectoId || undefined,
        tipoVehiculo: tipoVehiculo || undefined,
      });
      const hojas = construirHojas(checklists);
      if (hojas.length === 0) {
        setError("No hay checklists para los filtros elegidos.");
        return;
      }
      exportarExcel(`checklists-${desde}_${hasta}`, hojas);
      setAbierto(false);
    } catch {
      setError("No se pudo generar la exportación. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-md px-4 h-10"
        style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      >
        <Download size={16} /> Exportar checklist
      </button>

      {abierto && (
        <Modal title="Exportar checklist a Excel" onClose={() => setAbierto(false)} maxWidth={520}>
          <div className="flex flex-col gap-4">
            <div>
              <label style={labelStyle}>Tipos de checklist (elige uno o varios)</label>
              <div className="flex flex-col gap-1.5">
                {TODOS_LOS_TIPOS.map((tipo) => (
                  <label key={tipo} className="flex items-center gap-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>
                    <input type="checkbox" checked={tipos.has(tipo)} onChange={() => alternarTipo(tipo)} />
                    {TIPO_CHECKLIST_LABEL[tipo]}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Desde</label>
                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
              </div>
              <div>
                <label style={labelStyle}>Hasta</label>
                <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Proyecto</label>
                <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} style={fieldStyle}>
                  <option value="">Todos los proyectos</option>
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tipo de unidad</label>
                <select value={tipoVehiculo} onChange={(e) => setTipoVehiculo(e.target.value)} style={fieldStyle}>
                  <option value="">Todos los tipos</option>
                  {Object.entries(TIPO_VEHICULO_LABEL).map(([valor, label]) => (
                    <option key={valor} value={valor}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-error)" }}>{error}</p>
            )}

            <button
              type="button"
              onClick={exportar}
              disabled={cargando}
              className="flex items-center justify-center gap-2 rounded-md h-10 font-semibold disabled:opacity-60"
              style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
            >
              <Download size={15} /> {cargando ? "Generando…" : "Exportar a Excel"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
