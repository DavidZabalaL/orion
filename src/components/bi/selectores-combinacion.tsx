"use client";

import { useState } from "react";
import { BarChart3, LineChart, PieChart, Hash, Circle, SplitSquareHorizontal, BarChart2, ScatterChart, CalendarDays, Boxes, Users, MapPinned, Plus, X } from "lucide-react";
import {
  BI_DATASETS,
  obtenerDataset,
  obtenerCampo,
  agregacionesDisponibles,
  campoValidoParaEje,
  REQUISITOS_TIPO_GRAFICA,
  TIPO_GRAFICA_LABEL,
  AGREGACION_LABEL,
  type TipoGrafica,
  type TipoAgregacion,
  type TipoOrden,
  type FiltroGuardable,
  type DatasetMeta,
} from "@/lib/bi/metadata";

export const fieldStyle: React.CSSProperties = {
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

export const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  display: "block",
  marginBottom: 6,
};

const TIPOS_GRAFICA: { value: TipoGrafica; icon: typeof BarChart3 }[] = [
  { value: "barras", icon: BarChart3 },
  { value: "lineas", icon: LineChart },
  { value: "pie", icon: PieChart },
  { value: "contador", icon: Hash },
  { value: "puntos", icon: Circle },
  { value: "divergente", icon: SplitSquareHorizontal },
  { value: "histograma", icon: BarChart2 },
  { value: "dispersion", icon: ScatterChart },
  { value: "calendario", icon: CalendarDays },
  { value: "caja", icon: Boxes },
  { value: "piramide", icon: Users },
  { value: "mapa", icon: MapPinned },
];

const ORDEN_LABEL: Record<TipoOrden, string> = {
  dimension: "Natural (nombre / fecha)",
  valor_desc: "Mayor a menor",
  valor_asc: "Menor a mayor",
};

const TIPO_CAMPO_LABEL: Record<string, string> = {
  texto: "texto",
  numero: "numérico",
  fecha_mes: "mes",
  fecha_dia: "día",
  geografico: "estado",
};

function sufijoRequisito(requisito: string[] | "cualquiera" | "ninguno"): string {
  if (requisito === "cualquiera" || requisito === "ninguno") return "";
  return ` (${requisito.map((t) => TIPO_CAMPO_LABEL[t] ?? t).join("/")})`;
}

export type CombinacionBI = {
  datasetId: string;
  ejeX: string;
  ejeY: string;
  agregacion: TipoAgregacion;
  tipoGrafica: TipoGrafica;
  ejeSplit?: string;
  orden?: TipoOrden;
  filtros?: FiltroGuardable[];
  proyectoIds?: string[];
};

export type ProyectoDisponible = { id: string; nombre: string };

/**
 * Selectores de dataset + eje X + eje Y + agregación + tipo de gráfica.
 * Eje X y eje Y comparten exactamente el mismo catálogo de campos por
 * dataset; qué tipos de campo acepta cada eje (y si hace falta un segundo
 * campo de agrupación u orden) depende del tipo de gráfica elegido.
 */
export function SelectoresCombinacion({
  combinacion,
  onChange,
  proyectosDisponibles,
  compacto = false,
}: {
  combinacion: CombinacionBI;
  onChange: (siguiente: CombinacionBI) => void;
  proyectosDisponibles: ProyectoDisponible[];
  /** Fuerza una sola columna — para cuando el selector vive en un panel angosto (p. ej. la barra lateral de edición del dashboard) en vez de a lo ancho de la página. */
  compacto?: boolean;
}) {
  const dataset = obtenerDataset(combinacion.datasetId)!;
  const requisitos = REQUISITOS_TIPO_GRAFICA[combinacion.tipoGrafica];
  const campoY = obtenerCampo(dataset, combinacion.ejeY);
  const agregacionesValidas = campoY ? agregacionesDisponibles(campoY) : ["conteo"];

  const camposEjeX = dataset.campos.filter((c) => campoValidoParaEje(c, requisitos.ejeX));
  const camposEjeY = dataset.campos.filter((c) => campoValidoParaEje(c, requisitos.ejeY));

  function cambiarDataset(datasetId: string) {
    const ds = obtenerDataset(datasetId)!;
    const req = REQUISITOS_TIPO_GRAFICA[combinacion.tipoGrafica];
    onChange({
      ...combinacion,
      datasetId,
      ejeX: ds.campos[0].id,
      ejeY: ds.campos[0].id,
      agregacion: "conteo",
      ejeSplit: req.ejeSplit?.obligatorio ? ds.campos[0].id : undefined,
      filtros: [],
    });
  }

  function cambiarTipoGrafica(tipoGrafica: TipoGrafica) {
    const req = REQUISITOS_TIPO_GRAFICA[tipoGrafica];
    const nuevoEjeX = campoValidoParaEje(obtenerCampo(dataset, combinacion.ejeX)!, req.ejeX) ? combinacion.ejeX : dataset.campos.find((c) => campoValidoParaEje(c, req.ejeX))?.id ?? combinacion.ejeX;
    const nuevoEjeY = campoValidoParaEje(obtenerCampo(dataset, combinacion.ejeY)!, req.ejeY) ? combinacion.ejeY : dataset.campos.find((c) => campoValidoParaEje(c, req.ejeY))?.id ?? combinacion.ejeY;
    const nuevoEjeSplit = !req.ejeSplit ? undefined : req.ejeSplit.obligatorio ? combinacion.ejeSplit ?? dataset.campos[0].id : combinacion.ejeSplit;
    onChange({ ...combinacion, tipoGrafica, ejeX: nuevoEjeX, ejeY: nuevoEjeY, ejeSplit: nuevoEjeSplit });
  }

  function cambiarEjeY(ejeY: string) {
    const campo = obtenerCampo(dataset, ejeY)!;
    const valida = agregacionesDisponibles(campo);
    onChange({ ...combinacion, ejeY, agregacion: valida.includes(combinacion.agregacion) ? combinacion.agregacion : valida[0] });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`grid grid-cols-1 gap-4 ${compacto ? "" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        <div>
          <label style={labelStyle}>Dataset</label>
          <select value={combinacion.datasetId} onChange={(e) => cambiarDataset(e.target.value)} style={fieldStyle}>
            {BI_DATASETS.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Eje X{sufijoRequisito(requisitos.ejeX)}</label>
          <select value={combinacion.ejeX} onChange={(e) => onChange({ ...combinacion, ejeX: e.target.value })} style={fieldStyle}>
            {camposEjeX.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        {requisitos.ejeY !== "ninguno" && (
          <div>
            <label style={labelStyle}>Eje Y{sufijoRequisito(requisitos.ejeY)}</label>
            <select value={combinacion.ejeY} onChange={(e) => cambiarEjeY(e.target.value)} style={fieldStyle}>
              {camposEjeY.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        )}
        {requisitos.ejeY !== "ninguno" && combinacion.tipoGrafica !== "dispersion" && combinacion.tipoGrafica !== "caja" && (
          <div>
            <label style={labelStyle}>Agregación</label>
            <select value={combinacion.agregacion} onChange={(e) => onChange({ ...combinacion, agregacion: e.target.value as TipoAgregacion })} style={fieldStyle}>
              {(["conteo", "suma", "promedio"] as const).map((a) => (
                <option key={a} value={a} disabled={!agregacionesValidas.includes(a)}>{AGREGACION_LABEL[a]}</option>
              ))}
            </select>
          </div>
        )}
        {requisitos.ejeSplit?.obligatorio && (
          <div>
            <label style={labelStyle}>Segundo grupo (máx. 2 categorías)</label>
            <select value={combinacion.ejeSplit ?? dataset.campos[0].id} onChange={(e) => onChange({ ...combinacion, ejeSplit: e.target.value })} style={fieldStyle}>
              {dataset.campos.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        )}
        {requisitos.ejeSplit && !requisitos.ejeSplit.obligatorio && (
          <div>
            <label style={labelStyle}>Segundo grupo (cruce)</label>
            <div className="flex items-center gap-2" style={{ height: "var(--h-md)" }}>
              <input
                type="checkbox"
                id="bi-cruzar"
                checked={combinacion.ejeSplit !== undefined}
                onChange={(e) => onChange({ ...combinacion, ejeSplit: e.target.checked ? dataset.campos[0].id : undefined })}
              />
              <label htmlFor="bi-cruzar" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                Cruzar con un segundo campo
              </label>
            </div>
            {combinacion.ejeSplit !== undefined && (
              <select value={combinacion.ejeSplit} onChange={(e) => onChange({ ...combinacion, ejeSplit: e.target.value })} style={{ ...fieldStyle, marginTop: 6 }}>
                {dataset.campos.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            )}
          </div>
        )}
        {(combinacion.tipoGrafica === "barras" || combinacion.tipoGrafica === "puntos" || combinacion.tipoGrafica === "divergente") && (
          <div>
            <label style={labelStyle}>Orden</label>
            <select value={combinacion.orden ?? "dimension"} onChange={(e) => onChange({ ...combinacion, orden: e.target.value as TipoOrden })} style={fieldStyle}>
              {(["dimension", "valor_desc", "valor_asc"] as const).map((o) => (
                <option key={o} value={o}>{ORDEN_LABEL[o]}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <AlcanceProyecto combinacion={combinacion} onChange={onChange} proyectosDisponibles={proyectosDisponibles} />
      <FiltrosCombinacion combinacion={combinacion} onChange={onChange} dataset={dataset} />

      <div>
        <label style={labelStyle}>Tipo de gráfica</label>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_GRAFICA.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => cambiarTipoGrafica(t.value)}
              className="flex items-center gap-1.5 rounded-md px-3"
              style={{
                height: "var(--h-md)",
                background: combinacion.tipoGrafica === t.value ? "var(--color-primary)" : "var(--field-bg)",
                color: combinacion.tipoGrafica === t.value ? "#fff" : "var(--sidebar-text)",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-sm)",
              }}
              title={TIPO_GRAFICA_LABEL[t.value]}
            >
              <t.icon size={14} /> {TIPO_GRAFICA_LABEL[t.value]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "var(--chip)",
  color: "var(--sidebar-text-active)",
  borderRadius: 999,
  padding: "3px 6px 3px 10px",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
};

/** Nacional (todos los proyectos permitidos por el rol) o una selección específica — el servidor siempre intersecta esto con lo que el rol realmente puede ver. */
function AlcanceProyecto({
  combinacion,
  onChange,
  proyectosDisponibles,
}: {
  combinacion: CombinacionBI;
  onChange: (siguiente: CombinacionBI) => void;
  proyectosDisponibles: ProyectoDisponible[];
}) {
  const especifico = combinacion.proyectoIds !== undefined;

  function alternar(especificoSiguiente: boolean) {
    onChange({ ...combinacion, proyectoIds: especificoSiguiente ? [] : undefined });
  }

  function alternarProyecto(id: string, marcado: boolean) {
    const actuales = combinacion.proyectoIds ?? [];
    onChange({ ...combinacion, proyectoIds: marcado ? [...actuales, id] : actuales.filter((p) => p !== id) });
  }

  return (
    <div>
      <label style={labelStyle}>Alcance de proyecto</label>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => alternar(false)}
          className="rounded-md px-3"
          style={{ height: "var(--h-md)", background: !especifico ? "var(--color-primary)" : "var(--field-bg)", color: !especifico ? "#fff" : "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
        >
          Nacional (todos)
        </button>
        <button
          type="button"
          onClick={() => alternar(true)}
          className="rounded-md px-3"
          style={{ height: "var(--h-md)", background: especifico ? "var(--color-primary)" : "var(--field-bg)", color: especifico ? "#fff" : "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
        >
          Proyectos específicos
        </button>
      </div>
      {especifico && (
        <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md p-2" style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)" }}>
          {proyectosDisponibles.length === 0 && (
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>No tienes proyectos asignados.</span>
          )}
          {proyectosDisponibles.map((p) => (
            <label key={p.id} className="flex items-center gap-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>
              <input type="checkbox" checked={(combinacion.proyectoIds ?? []).includes(p.id)} onChange={(e) => alternarProyecto(p.id, e.target.checked)} />
              {p.nombre}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Filtros multi-valor: OR entre valores del mismo campo, AND entre filtros distintos — narrows el conjunto de filas antes de agrupar por eje X / segundo grupo. */
function FiltrosCombinacion({
  combinacion,
  onChange,
  dataset,
}: {
  combinacion: CombinacionBI;
  onChange: (siguiente: CombinacionBI) => void;
  dataset: DatasetMeta;
}) {
  const filtros = combinacion.filtros ?? [];

  function actualizar(siguientes: FiltroGuardable[]) {
    onChange({ ...combinacion, filtros: siguientes });
  }

  function agregarFiltro() {
    actualizar([...filtros, { campoId: dataset.campos[0].id, valores: [] }]);
  }

  function cambiarCampo(i: number, campoId: string) {
    actualizar(filtros.map((f, idx) => (idx === i ? { campoId, valores: [] } : f)));
  }

  function cambiarValores(i: number, valores: string[]) {
    actualizar(filtros.map((f, idx) => (idx === i ? { ...f, valores } : f)));
  }

  function quitarFiltro(i: number) {
    actualizar(filtros.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label style={{ ...labelStyle, marginBottom: 0 }}>Filtros</label>
        <button
          type="button"
          onClick={agregarFiltro}
          className="flex items-center gap-1 rounded-md px-2.5"
          style={{ height: 28, background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}
        >
          <Plus size={12} /> Agregar filtro
        </button>
      </div>
      {filtros.length === 0 ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>Sin filtros — se usan todos los registros del dataset.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtros.map((f, i) => (
            <FilaFiltro key={i} filtro={f} dataset={dataset} onCambiarCampo={(campoId) => cambiarCampo(i, campoId)} onCambiarValores={(v) => cambiarValores(i, v)} onQuitar={() => quitarFiltro(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilaFiltro({
  filtro,
  dataset,
  onCambiarCampo,
  onCambiarValores,
  onQuitar,
}: {
  filtro: FiltroGuardable;
  dataset: DatasetMeta;
  onCambiarCampo: (campoId: string) => void;
  onCambiarValores: (valores: string[]) => void;
  onQuitar: () => void;
}) {
  const campo = obtenerCampo(dataset, filtro.campoId) ?? dataset.campos[0];
  const [textoNuevo, setTextoNuevo] = useState("");

  function agregarChip() {
    const valor = textoNuevo.trim();
    if (valor && !filtro.valores.includes(valor)) onCambiarValores([...filtro.valores, valor]);
    setTextoNuevo("");
  }

  return (
    <div className="rounded-md p-3" style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)" }}>
      <div className="mb-2 flex items-center gap-2">
        <select value={campo.id} onChange={(e) => onCambiarCampo(e.target.value)} style={{ ...fieldStyle, flex: 1 }}>
          {dataset.campos.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <button type="button" onClick={onQuitar} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)" }} title="Quitar filtro">
          <X size={14} />
        </button>
      </div>
      {campo.opciones ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {campo.opciones.map((o) => (
            <label key={o.valor} className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>
              <input
                type="checkbox"
                checked={filtro.valores.includes(o.valor)}
                onChange={(e) => onCambiarValores(e.target.checked ? [...filtro.valores, o.valor] : filtro.valores.filter((v) => v !== o.valor))}
              />
              {o.label}
            </label>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {filtro.valores.map((v) => (
              <span key={v} style={chipStyle}>
                {v}
                <button type="button" onClick={() => onCambiarValores(filtro.valores.filter((x) => x !== v))} style={{ display: "flex" }}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <input
            value={textoNuevo}
            onChange={(e) => setTextoNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                agregarChip();
              }
            }}
            onBlur={agregarChip}
            placeholder="Escribe un valor y presiona Enter…"
            style={fieldStyle}
          />
        </div>
      )}
    </div>
  );
}
