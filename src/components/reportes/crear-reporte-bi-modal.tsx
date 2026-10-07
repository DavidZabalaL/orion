"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SelectorTablaFilas } from "@/components/bi/selector-tabla-filas";
import { AlcanceProyecto, FiltrosCombinacion, type CombinacionBI, type ProyectoDisponible } from "@/components/bi/selectores-combinacion";
import { BI_DATASETS } from "@/lib/bi/metadata";
import { guardarReporteBiTabla } from "@/app/(app)/reportes/programados/actions";
import type { FrecuenciaReporte, FormatoReporte } from "@/generated/prisma/enums";

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

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function CrearReporteBiModal({ proyectosDisponibles, onCerrar, onGuardado }: { proyectosDisponibles: ProyectoDisponible[]; onCerrar: () => void; onGuardado: () => void }) {
  const [nombre, setNombre] = useState("");
  const [combinacion, setCombinacion] = useState<CombinacionBI>({
    datasetId: BI_DATASETS[0].id,
    ejeX: BI_DATASETS[0].campos[0].id,
    ejeY: BI_DATASETS[0].campos[0].id,
    agregacion: "conteo",
    tipoGrafica: "barras",
  });
  const [columnas, setColumnas] = useState<string[]>([BI_DATASETS[0].campos[0].id]);
  const [destinatarios, setDestinatarios] = useState("");
  const [frecuencia, setFrecuencia] = useState<FrecuenciaReporte>("SEMANAL");
  const [hora, setHora] = useState("08:00");
  const [diaSemana, setDiaSemana] = useState(1);
  const [diaMes, setDiaMes] = useState(1);
  const [formato, setFormato] = useState<FormatoReporte>("EXCEL");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setCargando(true);
    setError(null);
    const lista = destinatarios.split(",").map((d) => d.trim()).filter(Boolean);
    const resultado = await guardarReporteBiTabla({
      nombre,
      datasetId: combinacion.datasetId,
      columnas,
      filtros: combinacion.filtros,
      proyectoIds: combinacion.proyectoIds,
      destinatarios: lista,
      frecuencia,
      hora,
      diaSemana,
      diaMes,
      formato,
    });
    setCargando(false);
    if (resultado.ok) onGuardado();
    else setError(resultado.error);
  }

  return (
    <Modal title="Nuevo reporte programado" onClose={onCerrar} maxWidth={560}>
      <div className="flex flex-col gap-4">
        <div>
          <label style={labelStyle}>Nombre del reporte</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Mantenimientos con apoyo de pagos" style={fieldStyle} />
        </div>

        <SelectorTablaFilas
          datasetId={combinacion.datasetId}
          columnas={columnas}
          onChangeDataset={(datasetId) => setCombinacion({ ...combinacion, datasetId, filtros: [] })}
          onChangeColumnas={setColumnas}
        />

        <AlcanceProyecto combinacion={combinacion} onChange={setCombinacion} proyectosDisponibles={proyectosDisponibles} />
        <FiltrosCombinacion combinacion={combinacion} onChange={setCombinacion} dataset={BI_DATASETS.find((d) => d.id === combinacion.datasetId)!} proyectosDisponibles={proyectosDisponibles} />

        <div>
          <label style={labelStyle}>Destinatarios (separados por coma)</label>
          <input value={destinatarios} onChange={(e) => setDestinatarios(e.target.value)} placeholder="correo1@grupokabat.com, correo2@grupokabat.com" style={fieldStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Frecuencia</label>
            <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as FrecuenciaReporte)} style={fieldStyle}>
              <option value="DIARIO">Diario</option>
              <option value="SEMANAL">Semanal</option>
              <option value="MENSUAL">Mensual</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Hora de envío</label>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
        </div>

        {frecuencia === "SEMANAL" && (
          <div>
            <label style={labelStyle}>Día de la semana</label>
            <select value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))} style={fieldStyle}>
              {DIAS_SEMANA.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
        )}
        {frecuencia === "MENSUAL" && (
          <div>
            <label style={labelStyle}>Día del mes</label>
            <input type="number" min={1} max={31} value={diaMes} onChange={(e) => setDiaMes(Number(e.target.value))} style={fieldStyle} />
          </div>
        )}

        <div>
          <label style={labelStyle}>Formato</label>
          <div className="flex gap-2">
            {(["EXCEL", "PDF"] as FormatoReporte[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormato(f)}
                className="flex-1 rounded-md px-3 h-9 font-semibold"
                style={{ background: formato === f ? "var(--color-primary)" : "var(--chip)", color: formato === f ? "#fff" : "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
              >
                {f === "EXCEL" ? "Excel" : "PDF"}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-error)" }}>{error}</p>}

        <button
          type="button"
          onClick={guardar}
          disabled={cargando}
          className="rounded-md h-10 font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {cargando ? "Guardando…" : "Guardar reporte"}
        </button>
      </div>
    </Modal>
  );
}
