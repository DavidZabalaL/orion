"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, X, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { crearSiniestro, actualizarSiniestro } from "@/app/(app)/siniestros/actions";

const TIPOS = [
  { value: "COLISION", label: "Colisión" },
  { value: "ROBO_TOTAL", label: "Robo total" },
  { value: "ROBO_PARCIAL", label: "Robo parcial" },
  { value: "VANDALISMO", label: "Vandalismo" },
  { value: "INCENDIO", label: "Incendio" },
  { value: "FENOMENO_NATURAL", label: "Fenómeno natural" },
  { value: "OTRO", label: "Otro" },
];

const ESTATUS_OPTS = [
  { value: "ABIERTO", label: "Abierto" },
  { value: "EN_PROCESO", label: "En proceso" },
  { value: "CERRADO", label: "Cerrado" },
  { value: "CERRADO_SIN_INDEMNIZACION", label: "Cerrado sin indemnización" },
];

const ESTATUS_STYLE: Record<string, { color: string; bg: string }> = {
  ABIERTO:                    { color: "#f97316", bg: "#fff7ed" },
  EN_PROCESO:                 { color: "#3b82f6", bg: "#eff6ff" },
  CERRADO:                    { color: "#22c55e", bg: "#f0fdf4" },
  CERRADO_SIN_INDEMNIZACION:  { color: "#6b7280", bg: "#f3f4f6" },
};

type SiniestroRow = {
  id: string;
  folio: string;
  numeroEconomico: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  ubicacion: string | null;
  aseguradora: string | null;
  noSiniestroAseguradora: string | null;
  noReporte: string | null;
  personasInvolucradas: string | null;
  danosTerceros: string | null;
  danosUnidad: string | null;
  estimacionDanos: string | null;
  estatus: string;
  unidad: { numeroEconomico: string; marca: string; unidadModelo: string; proyecto: { nombre: string } | null };
  operador: { id: string; nombre: string } | null;
  reportadoPor: { nombre: string };
};

const selectStyle: React.CSSProperties = {
  background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)",
  fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", height: "var(--h-md)",
  borderRadius: "var(--radius-md)", padding: "0 10px",
};

const inputStyle: React.CSSProperties = {
  background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)",
  fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", height: 36,
  borderRadius: "var(--radius-md)", padding: "0 10px", width: "100%",
};

const textareaStyle: React.CSSProperties = {
  background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)",
  fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", borderRadius: "var(--radius-md)",
  padding: "8px 10px", width: "100%", resize: "vertical" as const, minHeight: 72,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600,
  color: "var(--sidebar-text)", textTransform: "uppercase" as const, display: "block", marginBottom: 4,
};

const hoy = new Date().toISOString().slice(0, 10);

function NuevoSiniestroForm({
  unidades,
  operadores,
  onCancel,
}: {
  unidades: { numeroEconomico: string; marca: string; unidadModelo: string }[];
  operadores: { id: string; nombre: string }[];
  onCancel: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <form
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--field-border)" }}
      action={(fd) => {
        start(async () => {
          setError("");
          const res = await crearSiniestro(fd);
          if (!res.ok) setError(res.error ?? "Error");
          else onCancel();
        });
      }}
    >
      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
        Registrar nuevo siniestro
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div>
          <label style={labelStyle}>Unidad *</label>
          <select name="numeroEconomico" required style={{ ...inputStyle, height: 36 }}>
            <option value="">Seleccionar…</option>
            {unidades.map((u) => (
              <option key={u.numeroEconomico} value={u.numeroEconomico}>
                {u.numeroEconomico} — {u.marca} {u.unidadModelo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Fecha del siniestro *</label>
          <input name="fecha" type="date" required max={hoy} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Tipo *</label>
          <select name="tipo" required style={{ ...inputStyle, height: 36 }}>
            <option value="">Seleccionar…</option>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Operador involucrado</label>
          <select name="operadorId" style={{ ...inputStyle, height: 36 }}>
            <option value="">Ninguno / No aplica</option>
            {operadores.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Ubicación</label>
          <input name="ubicacion" type="text" placeholder="Ciudad / calle…" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Estimación de daños ($)</label>
          <input name="estimacionDanos" type="number" step="0.01" min="0" style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Descripción *</label>
        <textarea name="descripcion" required placeholder="Describe lo ocurrido…" style={textareaStyle} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div>
          <label style={labelStyle}>Aseguradora</label>
          <input name="aseguradora" type="text" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>No. siniestro aseguradora</label>
          <input name="noSiniestroAseguradora" type="text" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>No. reporte / acta</label>
          <input name="noReporte" type="text" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Personas involucradas</label>
          <input name="personasInvolucradas" type="text" placeholder="Nombres / descripción" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Daños a terceros</label>
          <input name="danosTerceros" type="text" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Daños a la unidad</label>
          <input name="danosUnidad" type="text" style={inputStyle} />
        </div>
      </div>

      {error && <p style={{ color: "#ef4444", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>{error}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="rounded-md px-4 h-9 font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
          {pending ? "Guardando…" : "Registrar siniestro"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-4 h-9"
          style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function SiniestroDetalle({ s, onClose }: { s: SiniestroRow; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col gap-3 p-1">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
        <div><span style={{ color: "var(--sidebar-text)" }}>Proyecto</span><br /><strong>{s.unidad.proyecto?.nombre ?? "—"}</strong></div>
        <div><span style={{ color: "var(--sidebar-text)" }}>Operador</span><br /><strong>{s.operador?.nombre ?? "—"}</strong></div>
        <div><span style={{ color: "var(--sidebar-text)" }}>Ubicación</span><br /><strong>{s.ubicacion ?? "—"}</strong></div>
        <div><span style={{ color: "var(--sidebar-text)" }}>Reportado por</span><br /><strong>{s.reportadoPor.nombre}</strong></div>
        <div><span style={{ color: "var(--sidebar-text)" }}>Aseguradora</span><br /><strong>{s.aseguradora ?? "—"}</strong></div>
        <div><span style={{ color: "var(--sidebar-text)" }}>No. siniestro</span><br /><strong>{s.noSiniestroAseguradora ?? "—"}</strong></div>
        <div><span style={{ color: "var(--sidebar-text)" }}>No. reporte / acta</span><br /><strong>{s.noReporte ?? "—"}</strong></div>
        <div><span style={{ color: "var(--sidebar-text)" }}>Estimación daños</span><br /><strong style={{ fontFamily: "var(--font-mono)" }}>{s.estimacionDanos ? `$${Number(s.estimacionDanos).toLocaleString("es-MX")}` : "—"}</strong></div>
        <div className="col-span-2"><span style={{ color: "var(--sidebar-text)" }}>Personas involucradas</span><br /><strong>{s.personasInvolucradas ?? "—"}</strong></div>
        <div className="col-span-2"><span style={{ color: "var(--sidebar-text)" }}>Daños terceros</span><br /><strong>{s.danosTerceros ?? "—"}</strong></div>
        <div className="col-span-2"><span style={{ color: "var(--sidebar-text)" }}>Daños unidad</span><br /><strong>{s.danosUnidad ?? "—"}</strong></div>
        <div className="col-span-4"><span style={{ color: "var(--sidebar-text)" }}>Descripción</span><br /><strong>{s.descripcion}</strong></div>
      </div>

      <form
        className="flex items-center gap-2 pt-2 border-t"
        style={{ borderColor: "var(--field-border)" }}
        action={(fd) => {
          fd.set("id", s.id);
          start(async () => {
            setError("");
            const res = await actualizarSiniestro(fd);
            if (!res.ok) setError(res.error ?? "Error");
          });
        }}
      >
        <select name="estatus" defaultValue={s.estatus} style={{ ...selectStyle, height: 32, fontSize: "var(--text-sm)" }}>
          {ESTATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="submit" disabled={pending} className="rounded-md px-3 h-8 text-xs font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)" }}>
          {pending ? "…" : "Actualizar estatus"}
        </button>
      </form>
      {error && <p style={{ color: "#ef4444", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}>{error}</p>}
    </div>
  );
}

export function SiniestrosTabla({
  siniestros,
  unidades,
  operadores,
  tipoLabel,
}: {
  siniestros: SiniestroRow[];
  unidades: { numeroEconomico: string; marca: string; unidadModelo: string }[];
  operadores: { id: string; nombre: string }[];
  tipoLabel: Record<string, string>;
}) {
  const [mostrando, setMostrando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [filtroEstatus, setFiltroEstatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return siniestros.filter((s) => {
      if (filtroEstatus && s.estatus !== filtroEstatus) return false;
      if (filtroTipo && s.tipo !== filtroTipo) return false;
      if (q && !s.folio.includes(q) && !s.numeroEconomico.includes(q)) return false;
      return true;
    });
  }, [siniestros, filtroEstatus, filtroTipo, busqueda]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar folio o unidad…"
            style={{ ...selectStyle, minWidth: 200 }} />
          <select value={filtroEstatus} onChange={(e) => setFiltroEstatus(e.target.value)} style={selectStyle}>
            <option value="">Todos los estatus</option>
            {ESTATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={selectStyle}>
            <option value="">Todos los tipos</option>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <button
          onClick={() => setMostrando((m) => !m)}
          className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {mostrando ? <X size={15} /> : <Plus size={15} />}
          {mostrando ? "Cancelar" : "Registrar siniestro"}
        </button>
      </div>

      {mostrando && (
        <NuevoSiniestroForm unidades={unidades} operadores={operadores} onCancel={() => setMostrando(false)} />
      )}

      <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
              {["Folio", "Unidad", "Fecha", "Tipo", "Estatus", "Aseguradora", "Estimación", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 whitespace-nowrap"
                  style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center" style={{ fontFamily: "var(--font-ui)", color: "var(--sidebar-text)" }}>Sin siniestros registrados.</td></tr>
            ) : filtrados.map((s) => {
              const abierto = expandido === s.id;
              return (
                <>
                  <tr key={s.id} style={{ borderBottom: abierto ? "none" : "1px solid var(--field-border)" }}>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-primary)" }}>
                      {s.folio}
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--sidebar-text-active)", fontWeight: 600 }}>
                      {s.numeroEconomico}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                      {new Date(s.fecha).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                      {tipoLabel[s.tipo] ?? s.tipo}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={ESTATUS_OPTS.find((o) => o.value === s.estatus)?.label ?? s.estatus}
                        color={ESTATUS_STYLE[s.estatus]?.color} bg={ESTATUS_STYLE[s.estatus]?.bg} />
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                      {s.aseguradora ?? "—"}
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                      {s.estimacionDanos ? `$${Number(s.estimacionDanos).toLocaleString("es-MX")}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setExpandido((e) => e === s.id ? null : s.id)} style={{ color: "var(--sidebar-text)" }}>
                        <ChevronRight size={16} style={{ transform: abierto ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                      </button>
                    </td>
                  </tr>
                  {abierto && (
                    <tr key={`${s.id}-exp`} style={{ borderBottom: "1px solid var(--field-border)" }}>
                      <td colSpan={8} className="px-6 py-4" style={{ background: "var(--field-bg)" }}>
                        <SiniestroDetalle s={s} onClose={() => setExpandido(null)} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
