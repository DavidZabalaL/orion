"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, X, ArrowUpRight, ArrowDownRight, Play, Table2, BarChart3, Save, Trash2, FileSpreadsheet, Palette } from "lucide-react";
import { BiChart } from "@/components/bi/bi-chart";
import { ReglasColorEditor } from "@/components/bi/reglas-color-editor";
import { colorParaValor, promedioDe } from "@/lib/bi/reglas-color";
import { exportarExcel, type HojaExcel } from "@/lib/exportar-excel";
import { registrarAccesoBI } from "@/app/(app)/reportes/bi/actions";
import { obtenerDataset, obtenerCampo, agregacionesDisponibles, AGREGACION_LABEL, type TipoAgregacion, type FiltroGuardable } from "@/lib/bi/metadata";
import { fieldStyle, labelStyle, AlcanceProyecto, FiltrosCombinacion, type CombinacionBI, type ProyectoDisponible } from "@/components/bi/selectores-combinacion";
import type { MetricaDisponible } from "@/components/bi/bi-explorer";
import { formatearValorBI } from "@/lib/bi/formato-valor";
import { ZONA_HORARIA_MX } from "@/lib/timezone";
import {
  DATASETS_COMPARABLES,
  ATAJO_LABEL,
  ATAJOS_RELATIVOS,
  MAX_METRICAS,
  MIN_PERIODOS,
  MAX_PERIODOS,
  MAX_FILAS_DESGLOSE,
  DESGLOSE_LABEL,
  NOMBRE_SLA,
  resolverPeriodos,
  variacion,
  cambioParaRegla,
  diasDelRango,
  etiquetaRango,
  nombreMetrica,
  type AtajoPeriodo,
  type ConfigComparador,
  type Desglose,
  type MetricaComparador,
  type PeriodoComparador,
  type ResultadoMetricaComparador,
} from "@/lib/bi/comparador-tipos";
import { compararPeriodos, guardarComparacion, eliminarComparacion, type ComparacionGuardadaVista } from "@/app/(app)/dashboards/comparador-actions";

const textoSecundario: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" };
const tarjeta: React.CSSProperties = { background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" };
const chip: React.CSSProperties = { background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" };

/** "YYYY-MM-DD" de hoy en México, sin importar la zona del navegador. */
function hoyMx(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: ZONA_HORARIA_MX });
}

/** Identidad de la métrica sin sus reglas de color (para saber si el último resultado sigue siendo de esa métrica). */
const sinReglas = (m: MetricaComparador) => JSON.stringify({ ...m, reglasValor: undefined, reglasCambio: undefined });

const PERIODOS_INICIALES: PeriodoComparador[] = [
  { desde: "", hasta: "", atajo: "mes_actual" },
  { desde: "", hasta: "", atajo: "periodo_anterior" },
];

export function Comparador({
  proyectosDisponibles,
  metricasDisponibles,
  comparacionesGuardadas,
  puedeEditar,
}: {
  proyectosDisponibles: ProyectoDisponible[];
  metricasDisponibles: MetricaDisponible[];
  comparacionesGuardadas: ComparacionGuardadaVista[];
  puedeEditar: boolean;
}) {
  const [hoy] = useState(hoyMx);
  const [guardadas, setGuardadas] = useState(comparacionesGuardadas);
  const [cargadaId, setCargadaId] = useState("");
  const [nombre, setNombre] = useState("");
  const [avisoGuardado, setAvisoGuardado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, startGuardado] = useTransition();

  useEffect(() => {
    // Mismo registro de gobernanza que el Explorador: una vez por sesión del navegador.
    const clave = "bi-vio:comparador";
    if (sessionStorage.getItem(clave)) return;
    sessionStorage.setItem(clave, "1");
    void registrarAccesoBI({ tipoRecurso: "comparador", accion: "vio" });
  }, []);
  const [metricas, setMetricas] = useState<MetricaComparador[]>([]);
  /** Índice de la métrica cuyas reglas de color se están editando. */
  const [reglasDe, setReglasDe] = useState<number | null>(null);
  // Siempre guardado ya resuelto (desde/hasta concretos); los periodos con atajo se recalculan en cada cambio.
  const [periodos, setPeriodos] = useState<PeriodoComparador[]>(() => resolverPeriodos(PERIODOS_INICIALES, hoy));
  const [proyectoIds, setProyectoIds] = useState<string[] | undefined>(undefined);
  const [desglose, setDesglose] = useState<Desglose>("ninguno");
  const [comparado, setComparado] = useState<Comparado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const actualizarPeriodos = (siguientes: PeriodoComparador[]) => setPeriodos(resolverPeriodos(siguientes, hoy));
  const periodosInvalidos = periodos.some((p) => !p.desde || !p.hasta || p.desde > p.hasta);

  function cambiarAtajo(i: number, atajo: string) {
    const { desde, hasta } = periodos[i];
    actualizarPeriodos(periodos.map((p, idx) => (idx !== i ? p : atajo ? { desde, hasta, atajo: atajo as AtajoPeriodo } : { desde, hasta })));
  }

  function cambiarFecha(i: number, campo: "desde" | "hasta", valor: string) {
    // Editar una fecha a mano convierte el periodo en "Personalizado".
    actualizarPeriodos(periodos.map((p, idx) => (idx !== i ? p : { desde: p.desde, hasta: p.hasta, [campo]: valor })));
  }

  function quitarPeriodo(i: number) {
    const restantes = periodos.filter((_, idx) => idx !== i);
    // El nuevo periodo base no puede ser relativo a sí mismo: se queda con sus fechas como "Personalizado".
    if (restantes[0]?.atajo && ATAJOS_RELATIVOS.includes(restantes[0].atajo)) restantes[0] = { desde: restantes[0].desde, hasta: restantes[0].hasta };
    actualizarPeriodos(restantes);
  }

  function comparar(config: ConfigComparador = { metricas, periodos, desglose, proyectoIds }) {
    setError(null);
    startTransition(async () => {
      const r = await compararPeriodos(config);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setComparado({ resultados: r.resultados, config });
    });
  }

  /** Abre una comparación guardada (los periodos con atajo se recalculan a hoy) y la ejecuta. */
  function abrir(id: string) {
    setCargadaId(id);
    setAvisoGuardado(null);
    setReglasDe(null);
    const c = guardadas.find((g) => g.id === id);
    if (!c) {
      setNombre("");
      return;
    }
    const config = { ...c.config, periodos: resolverPeriodos(c.config.periodos, hoy) };
    setNombre(c.nombre);
    setMetricas(config.metricas);
    setPeriodos(config.periodos);
    setDesglose(config.desglose);
    setProyectoIds(config.proyectoIds);
    comparar(config);
  }

  function guardar() {
    // Con el mismo nombre se actualiza la comparación abierta; con otro nombre se guarda como nueva.
    const abierta = guardadas.find((g) => g.id === cargadaId);
    const id = abierta && abierta.nombre === nombre.trim() ? abierta.id : undefined;
    startGuardado(async () => {
      const r = await guardarComparacion({ id, nombre, config: { metricas, periodos, desglose, proyectoIds } });
      if (!r.ok) {
        setAvisoGuardado({ ok: false, texto: r.error });
        return;
      }
      setGuardadas((prev) => [...prev.filter((g) => g.id !== r.comparacion.id), r.comparacion].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setCargadaId(r.comparacion.id);
      setNombre(r.comparacion.nombre);
      setAvisoGuardado({ ok: true, texto: id ? "Cambios guardados." : "Comparación guardada." });
    });
  }

  function eliminar() {
    const abierta = guardadas.find((g) => g.id === cargadaId);
    if (!abierta || !confirm(`¿Eliminar la comparación "${abierta.nombre}"? No se puede deshacer.`)) return;
    startGuardado(async () => {
      const r = await eliminarComparacion(abierta.id);
      if (!r.ok) {
        setAvisoGuardado({ ok: false, texto: r.error });
        return;
      }
      setGuardadas((prev) => prev.filter((g) => g.id !== abierta.id));
      setCargadaId("");
      setNombre("");
      setAvisoGuardado({ ok: true, texto: "Comparación eliminada." });
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-2 rounded-xl p-4" style={tarjeta}>
        <div className="min-w-[200px] flex-1">
          <label htmlFor="comparacion-guardada" style={labelStyle}>
            Comparaciones guardadas
          </label>
          <select id="comparacion-guardada" value={cargadaId} onChange={(e) => abrir(e.target.value)} style={fieldStyle}>
            <option value="">{guardadas.length === 0 ? "Aún no hay comparaciones guardadas" : "Nueva comparación"}</option>
            {guardadas.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </div>
        {puedeEditar && (
          <>
            <div className="min-w-[200px] flex-1">
              <label htmlFor="comparacion-nombre" style={labelStyle}>
                Nombre
              </label>
              <input id="comparacion-nombre" value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Gasto mensual vs. año anterior" style={fieldStyle} />
            </div>
            <button
              type="button"
              onClick={guardar}
              disabled={guardando || !nombre.trim() || metricas.length === 0 || periodosInvalidos}
              className="flex items-center gap-1.5 rounded-md px-3 disabled:opacity-50"
              style={{ ...chip, height: "var(--h-md)", fontSize: "var(--text-sm)" }}
            >
              <Save size={14} /> {cargadaId && guardadas.find((g) => g.id === cargadaId)?.nombre === nombre.trim() ? "Guardar cambios" : "Guardar"}
            </button>
            {cargadaId && (
              <button type="button" onClick={eliminar} disabled={guardando} aria-label="Eliminar comparación" className="rounded-md p-2.5 disabled:opacity-50" style={{ ...chip, color: "var(--color-error)" }}>
                <Trash2 size={14} />
              </button>
            )}
          </>
        )}
        {avisoGuardado && (
          <p role="status" className="w-full" style={{ ...textoSecundario, color: avisoGuardado.ok ? "var(--sidebar-text)" : "var(--color-error)" }}>
            {avisoGuardado.texto}
          </p>
        )}
      </div>

      <div className="grid gap-5 rounded-xl p-5 lg:grid-cols-2" style={tarjeta}>
        <section className="flex flex-col gap-3">
          <label style={{ ...labelStyle, marginBottom: 0 }}>Métricas a comparar ({metricas.length}/{MAX_METRICAS})</label>
          {metricas.length === 0 ? (
            <p style={textoSecundario}>Agrega una o más métricas abajo.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {metricas.map((m, i) => (
                <li key={i} className="flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5" style={chip}>
                  {nombreMetrica(m)}
                  <button
                    type="button"
                    aria-label={`Reglas de color de ${nombreMetrica(m)}`}
                    aria-pressed={reglasDe === i}
                    onClick={() => setReglasDe(reglasDe === i ? null : i)}
                    className="rounded-full p-0.5"
                    // En color de marca cuando la métrica ya tiene reglas.
                    style={{ color: m.reglasValor?.length || m.reglasCambio?.length ? "var(--color-primary)" : undefined }}
                  >
                    <Palette size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Quitar ${nombreMetrica(m)}`}
                    onClick={() => {
                      setMetricas(metricas.filter((_, idx) => idx !== i));
                      setReglasDe(null);
                    }}
                    className="rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {reglasDe !== null && metricas[reglasDe] && (
            <ReglasMetrica metrica={metricas[reglasDe]} onChange={(m) => setMetricas(metricas.map((x, idx) => (idx === reglasDe ? m : x)))} onCerrar={() => setReglasDe(null)} />
          )}
          <AgregarMetrica
            metricasDisponibles={metricasDisponibles}
            proyectosDisponibles={proyectosDisponibles}
            deshabilitado={metricas.length >= MAX_METRICAS}
            onAgregar={(m) => setMetricas([...metricas, m])}
          />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label style={{ ...labelStyle, marginBottom: 0 }}>Periodos</label>
              <button
                type="button"
                disabled={periodos.length >= MAX_PERIODOS}
                onClick={() => actualizarPeriodos([...periodos, { ...periodos[0], atajo: "mismo_periodo_anio_anterior" }])}
                className="flex items-center gap-1 rounded-md px-2.5 disabled:opacity-50"
                style={{ ...chip, height: 28 }}
              >
                <Plus size={12} /> Agregar periodo
              </button>
            </div>
            {periodos.map((p, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[150px] flex-1">
                  <span style={textoSecundario}>{i === 0 ? "Periodo base" : `Periodo ${i + 1}`}</span>
                  <select aria-label={`Atajo del periodo ${i + 1}`} value={p.atajo ?? ""} onChange={(e) => cambiarAtajo(i, e.target.value)} style={fieldStyle}>
                    <option value="">Personalizado</option>
                    {(Object.keys(ATAJO_LABEL) as AtajoPeriodo[])
                      .filter((a) => i > 0 || !ATAJOS_RELATIVOS.includes(a))
                      .map((a) => (
                        <option key={a} value={a}>
                          {ATAJO_LABEL[a]}
                        </option>
                      ))}
                  </select>
                </div>
                <input type="date" aria-label={`Desde, periodo ${i + 1}`} value={p.desde} onChange={(e) => cambiarFecha(i, "desde", e.target.value)} style={{ ...fieldStyle, width: 150 }} />
                <input type="date" aria-label={`Hasta, periodo ${i + 1}`} value={p.hasta} onChange={(e) => cambiarFecha(i, "hasta", e.target.value)} style={{ ...fieldStyle, width: 150 }} />
                <button
                  type="button"
                  aria-label={`Quitar periodo ${i + 1}`}
                  disabled={periodos.length <= MIN_PERIODOS}
                  onClick={() => quitarPeriodo(i)}
                  className="rounded-md p-2 disabled:opacity-30"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {periodosInvalidos && <p style={{ ...textoSecundario, color: "var(--color-error)" }}>En cada periodo «desde» debe ser anterior o igual a «hasta».</p>}
          </div>

          <AlcanceProyecto
            combinacion={{ proyectoIds } as CombinacionBI}
            onChange={(c) => setProyectoIds(c.proyectoIds)}
            proyectosDisponibles={proyectosDisponibles}
          />

          <div>
            <label style={labelStyle}>Desglose</label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Desglose">
              {(Object.keys(DESGLOSE_LABEL) as Desglose[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={desglose === d}
                  onClick={() => setDesglose(d)}
                  className="rounded-md px-3"
                  style={{ height: "var(--h-md)", background: desglose === d ? "var(--color-primary)" : "var(--field-bg)", color: desglose === d ? "#fff" : "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
                >
                  {DESGLOSE_LABEL[d]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => comparar()}
            disabled={pendiente || metricas.length === 0 || periodosInvalidos}
            className="flex items-center justify-center gap-2 rounded-md px-4 disabled:opacity-50"
            style={{ height: "var(--h-md)", background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
          >
            <Play size={14} /> {pendiente ? "Comparando…" : "Comparar"}
          </button>
          {error && <p style={{ ...textoSecundario, color: "var(--color-error)" }}>{error}</p>}
        </section>
      </div>

      {comparado && (
        <Resultados
          comparado={{
            ...comparado,
            // Las reglas de color son solo de presentación: se ven al instante sobre el último resultado, sin volver a consultar.
            config: { ...comparado.config, metricas: comparado.config.metricas.map((m, i) => (metricas[i] && sinReglas(metricas[i]) === sinReglas(m) ? metricas[i] : m)) },
          }}
        />
      )}
    </div>
  );
}

// ───────────── Agregar métrica ─────────────

const CONTEO = "__conteo__";

function AgregarMetrica({
  metricasDisponibles,
  proyectosDisponibles,
  deshabilitado,
  onAgregar,
}: {
  metricasDisponibles: MetricaDisponible[];
  proyectosDisponibles: ProyectoDisponible[];
  deshabilitado: boolean;
  onAgregar: (m: MetricaComparador) => void;
}) {
  const [datasetId, setDatasetId] = useState(DATASETS_COMPARABLES[0].id);
  const [campoId, setCampoId] = useState(CONTEO);
  const [agregacion, setAgregacion] = useState<TipoAgregacion>("suma");
  const [filtros, setFiltros] = useState<FiltroGuardable[]>([]);

  const dataset = obtenerDataset(datasetId)!;
  const camposNumericos = dataset.campos.filter((c) => agregacionesDisponibles(c).some((a) => a !== "conteo"));
  const campo = campoId === CONTEO ? undefined : obtenerCampo(dataset, campoId);
  const agregacionesCampo: TipoAgregacion[] = campo ? agregacionesDisponibles(campo).filter((a) => a !== "conteo") : [];
  const agregacionEfectiva = campo ? (agregacionesCampo.includes(agregacion) ? agregacion : agregacionesCampo[0]) : "conteo";
  const guardadas = metricasDisponibles.filter((m) => DATASETS_COMPARABLES.some((d) => d.id === m.datasetId));

  function cambiarDataset(id: string) {
    setDatasetId(id);
    setCampoId(CONTEO);
    setFiltros([]);
  }

  function agregar() {
    onAgregar({
      tipo: "bi",
      datasetId,
      campoId: campo?.id ?? dataset.campos[0].id,
      agregacion: agregacionEfectiva,
      filtros: filtros.filter((f) => f.valores.length > 0),
    });
    setFiltros([]);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg p-3" style={{ border: "1px dashed var(--field-border)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <span style={textoSecundario}>Rápidas:</span>
        <button type="button" disabled={deshabilitado} onClick={() => onAgregar({ tipo: "sla" })} className="rounded-full px-3 py-1 disabled:opacity-50" style={{ ...chip, border: "1px solid var(--field-border)" }}>
          + {NOMBRE_SLA}
        </button>
        {/* Métricas de negocio guardadas en /reportes/metricas (solo las de fuentes con fecha). */}
        {guardadas.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={deshabilitado}
            onClick={() => onAgregar({ tipo: "bi", datasetId: m.datasetId, campoId: m.campoId, agregacion: m.agregacion, filtros: m.filtrosBase, nombre: m.nombre })}
            className="rounded-full px-3 py-1 disabled:opacity-50"
            style={{ ...chip, border: "1px solid var(--field-border)" }}
          >
            + {m.nombre}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <label style={labelStyle}>Fuente</label>
          <select value={datasetId} onChange={(e) => cambiarDataset(e.target.value)} style={fieldStyle}>
            {DATASETS_COMPARABLES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Dato</label>
          <select value={campoId} onChange={(e) => setCampoId(e.target.value)} style={fieldStyle}>
            <option value={CONTEO}>N° de registros</option>
            {camposNumericos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Cálculo</label>
          <select value={agregacionEfectiva} disabled={!campo} onChange={(e) => setAgregacion(e.target.value as TipoAgregacion)} style={fieldStyle}>
            {(campo ? agregacionesCampo : (["conteo"] as TipoAgregacion[])).map((a) => (
              <option key={a} value={a}>
                {AGREGACION_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <FiltrosCombinacion
        combinacion={{ filtros } as CombinacionBI}
        onChange={(c) => setFiltros(c.filtros ?? [])}
        dataset={dataset}
        proyectosDisponibles={proyectosDisponibles}
      />
      <button type="button" onClick={agregar} disabled={deshabilitado} className="flex w-fit items-center gap-1.5 rounded-md px-3 py-1.5 disabled:opacity-50" style={chip}>
        <Plus size={13} /> Agregar métrica
      </button>
    </div>
  );
}

// ───────────── Reglas de color ─────────────

/** Semáforo de una métrica con el mismo editor que los widgets del BI: una lista para el valor y otra para el cambio (flecha). */
function ReglasMetrica({ metrica, onChange, onCerrar }: { metrica: MetricaComparador; onChange: (m: MetricaComparador) => void; onCerrar: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg p-3" style={{ border: "1px solid var(--field-border)" }}>
      <div className="flex items-center justify-between gap-2">
        <span style={{ ...labelStyle, marginBottom: 0 }}>Colores · {nombreMetrica(metrica)}</span>
        <button type="button" aria-label="Cerrar reglas de color" onClick={onCerrar} className="rounded-md p-1" style={{ color: "var(--sidebar-text)" }}>
          <X size={14} />
        </button>
      </div>
      <ReglasColorEditor titulo="Color del valor" mostrarColumna={false} reglas={metrica.reglasValor ?? []} onChange={(reglasValor) => onChange({ ...metrica, reglasValor })} />
      <ReglasColorEditor titulo="Color del cambio (flecha)" mostrarColumna={false} reglas={metrica.reglasCambio ?? []} onChange={(reglasCambio) => onChange({ ...metrica, reglasCambio })} />
      <p style={textoSecundario}>
        El cambio se mide en % contra el periodo base (en puntos si la métrica ya es un %, como la disponibilidad). Ej.: «Mayor que 10» en rojo marca alzas de más de 10%; «Menor que 0» en verde, cualquier baja. «Promedio» es el de los periodos de esa misma fila. Si varias reglas aplican, gana la primera. Las reglas se guardan con la comparación.
      </p>
    </div>
  );
}

// ───────────── Resultados ─────────────

const fmt = (v: number | null, sufijo: string) => (v === null ? "—" : formatearValorBI(v, sufijo));

/** Cambio contra el periodo base: % (o puntos porcentuales si la métrica ya es un %) y diferencia absoluta. Color solo si lo pide una regla de la métrica: subir no es bueno ni malo en general (gasto vs. disponibilidad). */
function Delta({ base, valor, sufijo, color }: { base: number | null; valor: number | null; sufijo: string; color: string | null }) {
  const { diferencia, pct } = variacion(base, valor);
  if (diferencia === null) return null;
  const signo = diferencia > 0 ? "+" : "";
  const esPorcentaje = sufijo.trim() === "%";
  const texto = esPorcentaje
    ? `${signo}${formatearValorBI(diferencia)} pp`
    : [pct === null ? null : `${signo}${(pct * 100).toFixed(1)}%`, `${signo}${formatearValorBI(diferencia, sufijo)}`].filter(Boolean).join(" · ");
  const Icono = diferencia > 0 ? ArrowUpRight : diferencia < 0 ? ArrowDownRight : null;
  return (
    <span className="flex items-center justify-end gap-0.5" style={color ? { ...textoSecundario, color, fontWeight: 600 } : textoSecundario}>
      {Icono && <Icono size={12} aria-hidden />}
      {texto}
    </span>
  );
}

function EncabezadoPeriodos({ periodos }: { periodos: PeriodoComparador[] }) {
  return (
    <>
      {periodos.map((p, i) => (
        <th key={i} className="px-3 py-2 text-right align-bottom" style={{ fontWeight: 600 }}>
          <div style={{ color: "var(--sidebar-text-active)" }}>{i === 0 ? "Base" : `Periodo ${i + 1}`}</div>
          <div style={{ fontWeight: 400 }}>{etiquetaRango(p)}</div>
          <div style={{ fontWeight: 400 }}>
            {diasDelRango(p)} días{p.atajo ? ` · ${ATAJO_LABEL[p.atajo]}` : ""}
          </div>
        </th>
      ))}
    </>
  );
}

function CeldasValores({ valores, sufijo, metrica }: { valores: (number | null)[]; sufijo: string; metrica: MetricaComparador }) {
  const cambios = valores.map((v) => cambioParaRegla(valores[0], v, sufijo.trim() === "%"));
  // «Por arriba/debajo del promedio» compara contra los demás periodos de la misma fila.
  const promedioValores = promedioDe(valores.filter((v): v is number => v !== null));
  const promedioCambios = promedioDe(cambios.slice(1).filter((c): c is number => c !== null && Number.isFinite(c)));
  return (
    <>
      {valores.map((v, i) => {
        const cambio = cambios[i];
        const colorValor = v === null ? null : colorParaValor(v, "", metrica.reglasValor, promedioValores);
        const colorCambio = i === 0 || cambio === null ? null : colorParaValor(cambio, "", metrica.reglasCambio, promedioCambios);
        return (
          <td key={i} className="px-3 py-2 text-right align-top">
            <div style={{ fontVariantNumeric: "tabular-nums", color: colorValor ?? undefined }}>{fmt(v, sufijo)}</div>
            {i > 0 && <Delta base={valores[0]} valor={v} sufijo={sufijo} color={colorCambio} />}
          </td>
        );
      })}
    </>
  );
}

/** Resultado junto con la configuración exacta con que se calculó (los controles pueden cambiar después). */
type Comparado = { resultados: ResultadoMetricaComparador[]; config: ConfigComparador };

const estiloTabla: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" };
/** Grupos que se grafican al desglosar (la tabla muestra hasta MAX_FILAS_DESGLOSE): más barras agrupadas no se alcanzan a leer. */
const MAX_GRUPOS_GRAFICA = 12;

/** "P2: 1 oct – 31 oct 2026" — único aunque se repita un rango, para usarlo como serie/categoría de la gráfica. */
const etiquetaSerie = (p: PeriodoComparador, i: number) => `P${i + 1}: ${etiquetaRango(p)}`;

/** Una columna por periodo con su valor; a partir del 2º, además la diferencia y el % contra la base (números, no texto, para poder operar en Excel). */
function filaExcel(label: string, valores: (number | null)[], sufijo: string): (string | number)[] {
  // En métricas que ya son % (SLA) el cambio va solo en puntos (columna Dif.), igual que en pantalla.
  const esPorcentaje = sufijo.trim() === "%";
  return [
    label,
    ...valores.flatMap((v, i) => {
      if (i === 0) return [v ?? ""];
      const { diferencia, pct } = variacion(valores[0], v);
      return [v ?? "", diferencia === null ? "" : Math.round(diferencia * 100) / 100, pct === null || esPorcentaje ? "" : Math.round(pct * 1000) / 10];
    }),
  ];
}

function exportarComparacion({ resultados, config }: Comparado) {
  const columnasPeriodo = config.periodos.flatMap((p, i) => (i === 0 ? [`Base ${etiquetaRango(p)}`] : [`P${i + 1} ${etiquetaRango(p)}`, `Dif. P${i + 1}`, `% P${i + 1}`]));
  const conUnidad = (r: ResultadoMetricaComparador) => (r.sufijo.trim() && !r.nombre.includes(r.sufijo.trim()) ? `${r.nombre} (${r.sufijo.trim()})` : r.nombre);
  const hojas: HojaExcel[] =
    config.desglose === "ninguno"
      ? [{ nombre: "Comparación", headers: ["Métrica", ...columnasPeriodo], filas: resultados.map((r) => filaExcel(conUnidad(r), r.total, r.sufijo)) }]
      : resultados.map((r, i) => ({
          // El número evita nombres de hoja repetidos: Excel los corta a 31 caracteres y rechaza duplicados.
          nombre: `${i + 1}. ${r.nombre}`,
          headers: [`${config.desglose === "unidad" ? "Unidad" : "Proyecto"} — ${conUnidad(r)}`, ...columnasPeriodo],
          filas: [filaExcel("Total", r.total, r.sufijo), ...r.filas.map((f) => filaExcel(f.label, f.valores, r.sufijo))],
        }));
  exportarExcel("comparador", hojas);
  const datasetIds = [...new Set(config.metricas.map((m) => (m.tipo === "bi" ? m.datasetId : "unidades")))];
  void registrarAccesoBI({ tipoRecurso: "comparador", accion: "exporto_excel", datasetIds, proyectoIds: config.proyectoIds ?? [] });
}

function Resultados({ comparado }: { comparado: Comparado }) {
  const { resultados, config } = comparado;
  const { periodos, desglose } = config;
  const [vista, setVista] = useState<"tabla" | "grafica">("tabla");
  // Solo avisa con diferencias reales (mes vs. trimestre, "lo que va del mes" vs. mes completo), no por 30 vs. 31 días.
  const dias = periodos.map(diasDelRango);
  const duracionDistinta = Math.max(...dias) / Math.min(...dias) > 1.15;

  return (
    <div className="flex flex-col gap-4 rounded-xl p-5" style={tarjeta}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Resultado · {DESGLOSE_LABEL[desglose].toLowerCase()}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <div className="flex gap-1.5" role="group" aria-label="Vista">
            {(["tabla", "grafica"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={vista === v} onClick={() => setVista(v)} className="flex items-center gap-1.5 rounded-md px-3 py-1.5" style={{ ...chip, background: vista === v ? "var(--color-primary)" : "var(--chip)", color: vista === v ? "#fff" : "var(--sidebar-text)" }}>
                {v === "tabla" ? <Table2 size={13} /> : <BarChart3 size={13} />} {v === "tabla" ? "Tabla" : "Gráfica"}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => exportarComparacion(comparado)} className="flex items-center gap-1.5 rounded-md px-3 py-1.5" style={chip}>
            <FileSpreadsheet size={13} /> Excel
          </button>
        </div>
      </div>
      {duracionDistinta && <p style={textoSecundario}>Los periodos tienen distinta duración: compara sumas y conteos con cuidado.</p>}

      {desglose === "ninguno" && vista === "tabla" && (
        <div className="overflow-x-auto">
          <table className="w-full" style={estiloTabla}>
            <thead>
              <tr style={{ ...textoSecundario, textAlign: "left" }}>
                <th className="py-2 pr-3" style={{ fontWeight: 600 }}>
                  Métrica
                </th>
                <EncabezadoPeriodos periodos={periodos} />
              </tr>
            </thead>
            <tbody>
              {resultados.map((r, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--field-border)" }}>
                  <td className="py-2 pr-3 align-top">{r.nombre}</td>
                  <CeldasValores valores={r.total} sufijo={r.sufijo} metrica={config.metricas[i]} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(desglose !== "ninguno" || vista === "grafica") && (
        <div className={desglose === "ninguno" ? "grid gap-4 md:grid-cols-2" : "flex flex-col gap-6"}>
          {resultados.map((r, i) => (
            <section key={i} className="flex flex-col gap-2">
              <h4 style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{r.nombre}</h4>
              {r.aviso && <p style={textoSecundario}>{r.aviso}</p>}
              {vista === "grafica" ? <GraficaMetrica r={r} periodos={periodos} /> : <TablaDesglose r={r} metrica={config.metricas[i]} periodos={periodos} desglose={desglose} />}
            </section>
          ))}
        </div>
      )}

      <p style={textoSecundario}>«—» = sin registros en ese periodo. Los cambios se calculan contra el periodo base.</p>
    </div>
  );
}

function TablaDesglose({ r, metrica, periodos, desglose }: { r: ResultadoMetricaComparador; metrica: MetricaComparador; periodos: PeriodoComparador[]; desglose: Desglose }) {
  const ordenSla = r.sufijo === "%";
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={estiloTabla}>
        <thead>
          <tr style={{ ...textoSecundario, textAlign: "left" }}>
            <th className="py-2 pr-3" style={{ fontWeight: 600 }}>
              {desglose === "unidad" ? "Unidad" : "Proyecto"}
            </th>
            <EncabezadoPeriodos periodos={periodos} />
          </tr>
        </thead>
        <tbody>
          <tr style={{ fontWeight: 700 }}>
            <td className="py-2 pr-3 align-top">Total</td>
            <CeldasValores valores={r.total} sufijo={r.sufijo} metrica={metrica} />
          </tr>
          {r.filas.map((f) => (
            <tr key={f.label} style={{ borderTop: "1px solid var(--field-border)" }}>
              <td className="py-2 pr-3 align-top">{f.label}</td>
              <CeldasValores valores={f.valores} sufijo={r.sufijo} metrica={metrica} />
            </tr>
          ))}
        </tbody>
      </table>
      {r.truncado && (
        <p className="mt-1" style={textoSecundario}>
          Se muestran los {MAX_FILAS_DESGLOSE} con {ordenSla ? "menor disponibilidad" : "mayor valor"} en el periodo base.
        </p>
      )}
    </div>
  );
}

/** Sin desglose: una barra por periodo. Con desglose: barras agrupadas (grupo = proyecto/unidad, serie = periodo). */
function GraficaMetrica({ r, periodos }: { r: ResultadoMetricaComparador; periodos: PeriodoComparador[] }) {
  const series = periodos.map(etiquetaSerie);
  const cruzado =
    r.filas.length === 0
      ? null
      : {
          series,
          filas: r.filas.slice(0, MAX_GRUPOS_GRAFICA).map((f) => ({ dimension: f.label, valores: Object.fromEntries(series.map((s, i) => [s, f.valores[i] ?? 0])) })),
          truncado: r.filas.length > MAX_GRUPOS_GRAFICA,
        };
  return (
    <div className="flex flex-col gap-1">
      {cruzado?.truncado && <p style={textoSecundario}>Se grafican los primeros {MAX_GRUPOS_GRAFICA}; la tabla muestra hasta {MAX_FILAS_DESGLOSE}.</p>}
      {/* Alto fijo: BiChart se dimensiona según su contenedor, con min-height crecería sin tope. */}
      <div style={{ height: 340 }}>
        <BiChart datos={series.map((s, i) => ({ dimension: s, valor: r.total[i] ?? 0 }))} cruzado={cruzado} tipoGrafica="barras" ejeYLabel={r.nombre} ejeYSufijo={r.sufijo} />
      </div>
    </div>
  );
}
