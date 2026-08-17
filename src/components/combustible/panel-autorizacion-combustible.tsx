"use client";

import { useState, useTransition } from "react";
import { Check, X, Plus, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { crearSolicitudAutorizacion, responderSolicitud } from "@/app/(app)/combustible/autorizacion/actions";

type ProyectoResumen = {
  id: string;
  nombre: string;
  presupuesto: number;
  gastado: number;
};

type Solicitud = {
  id: string;
  proyectoId: string;
  proyecto: { nombre: string };
  numeroEconomico: string | null;
  monto: string | number;
  litros: string | number | null;
  motivo: string;
  excedente: string | number | null;
  periodoPresupuesto: string | null;
  estatus: string;
  solicitadoPor: { nombre: string };
  aprobadoPor: { nombre: string } | null;
  fechaRespuesta: string | null;
  observacionesAprobador: string | null;
  createdAt: string;
};

const fmtMoney = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const fmtFecha = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
  height: "var(--h-lg)",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.03em",
  display: "block",
  marginBottom: 4,
};

function EstatusChip({ estatus }: { estatus: string }) {
  if (estatus === "APROBADA")
    return (
      <span className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "var(--status-cerrado-bg)", color: "var(--color-status-cerrado)", fontFamily: "var(--font-ui)" }}>
        <CheckCircle2 size={12} /> Aprobada
      </span>
    );
  if (estatus === "RECHAZADA")
    return (
      <span className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "var(--status-escena-bg, #fef2f2)", color: "var(--color-status-escena)", fontFamily: "var(--font-ui)" }}>
        <X size={12} /> Rechazada
      </span>
    );
  return (
    <span className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "var(--status-revision-bg)", color: "var(--color-status-revision)", fontFamily: "var(--font-ui)" }}>
      <Clock size={12} /> Pendiente
    </span>
  );
}

function FormSolicitud({
  proyectos,
  periodoKey,
  onDone,
}: {
  proyectos: ProyectoResumen[];
  periodoKey: string;
  onDone: () => void;
}) {
  const [proyectoId, setProyectoId] = useState(proyectos[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await crearSolicitudAutorizacion(fd);
      if (!res.ok) { setError(res.error); return; }
      onDone();
    });
  }

  const proyecto = proyectos.find((p) => p.id === proyectoId);
  const excedente = proyecto ? Math.max(0, proyecto.gastado - proyecto.presupuesto) : 0;

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
        Nueva solicitud de autorización
      </h3>
      <input type="hidden" name="periodoPresupuesto" value={periodoKey} />
      {excedente > 0 && (
        <input type="hidden" name="excedente" value={excedente.toFixed(2)} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label style={labelStyle}>Proyecto *</label>
          <select name="proyectoId" value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} style={fieldStyle} required>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Número económico (opcional)</label>
          <input name="numeroEconomico" type="text" placeholder="Ej. A-001" style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Monto solicitado (MXN) *</label>
          <input name="monto" type="number" min={1} step="0.01" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <label style={labelStyle}>Litros (opcional)</label>
          <input name="litros" type="number" min={0} step="0.01" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
      </div>

      {excedente > 0 && (
        <div className="flex items-center gap-2 rounded-lg px-4 py-3" style={{ background: "var(--status-revision-bg)" }}>
          <AlertTriangle size={16} color="var(--color-status-revision)" />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-revision)" }}>
            El presupuesto de combustible de este proyecto está excedido en <strong>{fmtMoney(excedente)}</strong> este mes.
          </span>
        </div>
      )}

      <div>
        <label style={labelStyle}>Motivo de la solicitud *</label>
        <textarea
          name="motivo"
          required
          rows={3}
          placeholder="Describe por qué se requiere autorización adicional de combustible…"
          className="w-full rounded-md px-3 py-2"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        />
      </div>

      {error && (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md px-4 h-9 font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {pending ? "Enviando…" : "Enviar solicitud"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md px-4 h-9"
          style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function FilaRespuesta({ solicitud }: { solicitud: Solicitud }) {
  const [abierto, setAbierto] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (solicitud.estatus !== "PENDIENTE") return null;

  function responder(estatus: "APROBADA" | "RECHAZADA") {
    setError(null);
    startTransition(async () => {
      const res = await responderSolicitud(solicitud.id, estatus, observaciones);
      if (!res.ok) { setError(res.error); return; }
      setAbierto(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold"
        style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)" }}
      >
        Responder {abierto ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {abierto && (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Observaciones (opcional)…"
            rows={2}
            className="w-full rounded-md px-3 py-2"
            style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
          />
          {error && <p style={{ color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}>{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => responder("APROBADA")}
              disabled={pending}
              className="flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold disabled:opacity-60"
              style={{ background: "var(--status-cerrado-bg)", color: "var(--color-status-cerrado)", fontFamily: "var(--font-ui)" }}
            >
              <Check size={12} /> Aprobar
            </button>
            <button
              type="button"
              onClick={() => responder("RECHAZADA")}
              disabled={pending}
              className="flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold disabled:opacity-60"
              style={{ background: "var(--status-escena-bg, #fef2f2)", color: "var(--color-status-escena)", fontFamily: "var(--font-ui)" }}
            >
              <X size={12} /> Rechazar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function PanelAutorizacionCombustible({
  proyectos,
  solicitudes,
  mesPeriodo,
  periodoKey,
}: {
  proyectos: ProyectoResumen[];
  solicitudes: Solicitud[];
  mesPeriodo: string;
  periodoKey: string;
}) {
  const [creando, setCreando] = useState(false);

  const proyectosExcedidos = proyectos.filter((p) => p.presupuesto > 0 && p.gastado > p.presupuesto);

  return (
    <div className="flex flex-col gap-6">
      {/* Resumen de presupuesto por proyecto */}
      <div className="flex flex-col gap-3 rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Presupuesto de combustible — {mesPeriodo}
        </h2>
        {proyectos.length === 0 ? (
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Sin proyectos con presupuesto configurado.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {proyectos.map((p) => {
              const pct = p.presupuesto > 0 ? Math.min(100, (p.gastado / p.presupuesto) * 100) : 0;
              const excedido = p.gastado > p.presupuesto && p.presupuesto > 0;
              return (
                <div key={p.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--field-text)" }}>{p.nombre}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: excedido ? "var(--color-status-escena)" : "var(--sidebar-text)" }}>
                      {fmtMoney(p.gastado)} / {p.presupuesto > 0 ? fmtMoney(p.presupuesto) : "sin presupuesto"}
                    </span>
                  </div>
                  {p.presupuesto > 0 && (
                    <div className="w-full rounded-full h-2" style={{ background: "var(--field-border)" }}>
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: excedido ? "var(--color-status-escena)" : pct > 80 ? "var(--color-status-revision)" : "var(--color-status-cerrado)",
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  )}
                  {excedido && (
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>
                      Excedido en {fmtMoney(p.gastado - p.presupuesto)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!creando && (
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="flex items-center gap-2 rounded-md px-4 h-9 w-fit mt-2"
            style={{ background: proyectosExcedidos.length > 0 ? "var(--color-status-revision)" : "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
          >
            <Plus size={15} />
            {proyectosExcedidos.length > 0
              ? `Solicitar autorización (${proyectosExcedidos.length} proyecto${proyectosExcedidos.length > 1 ? "s" : ""} excedido${proyectosExcedidos.length > 1 ? "s" : ""})`
              : "Nueva solicitud de autorización"}
          </button>
        )}
      </div>

      {creando && (
        <FormSolicitud
          proyectos={proyectos}
          periodoKey={periodoKey}
          onDone={() => setCreando(false)}
        />
      )}

      {/* Lista de solicitudes */}
      <div className="flex flex-col gap-3 rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Solicitudes de autorización
        </h2>
        {solicitudes.length === 0 ? (
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Sin solicitudes registradas aún.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {solicitudes.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-2 rounded-lg p-4"
                style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                      {s.proyecto.nombre}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)", fontWeight: 700 }}>
                      {fmtMoney(Number(s.monto))}
                      {s.litros ? ` · ${Number(s.litros).toFixed(1)} L` : ""}
                    </span>
                    {s.excedente && (
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>
                        Excedente: {fmtMoney(Number(s.excedente))}
                      </span>
                    )}
                  </div>
                  <EstatusChip estatus={s.estatus} />
                </div>

                <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{s.motivo}</p>

                <div className="flex flex-wrap gap-4 text-xs" style={{ fontFamily: "var(--font-ui)", color: "var(--sidebar-text)" }}>
                  <span>Solicitado por: <strong style={{ color: "var(--field-text)" }}>{s.solicitadoPor.nombre}</strong></span>
                  <span>{fmtFecha(s.createdAt)}</span>
                  {s.numeroEconomico && <span>Unidad: <strong>{s.numeroEconomico}</strong></span>}
                  {s.periodoPresupuesto && <span>Período: {s.periodoPresupuesto}</span>}
                </div>

                {s.aprobadoPor && (
                  <div className="flex flex-wrap gap-4 text-xs" style={{ fontFamily: "var(--font-ui)", color: "var(--sidebar-text)" }}>
                    <span>Respondido por: <strong style={{ color: "var(--field-text)" }}>{s.aprobadoPor.nombre}</strong></span>
                    {s.fechaRespuesta && <span>{fmtFecha(s.fechaRespuesta)}</span>}
                    {s.observacionesAprobador && <span>Obs: {s.observacionesAprobador}</span>}
                  </div>
                )}

                <FilaRespuesta solicitud={s} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
