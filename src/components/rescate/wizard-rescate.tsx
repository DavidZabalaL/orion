"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ChevronRight, Siren } from "lucide-react";
import { crearTicket } from "@/app/(app)/rescate/actions";

type Unidad = { numeroEconomico: string; tipoVehiculo: string; proyectoNombre: string | null };
type Motivo = { id: string; nombre: string; categoria: string; prioridadDefault: string };

const CATEGORIA_LABEL: Record<string, string> = {
  MECANICO: "Mecánico",
  ELECTRICO: "Eléctrico",
  NEUMATICO: "Neumático",
  ACCIDENTE: "Accidente",
  SEGURIDAD: "Seguridad (SEG)",
  COMBUSTIBLE: "Combustible",
  OTRO: "Otro",
};

const PRIORIDAD_COLOR: Record<string, string> = {
  BAJA: "#22c55e",
  MEDIA: "#f59e0b",
  ALTA: "#f97316",
  URGENTE: "#ef4444",
};

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
  textTransform: "uppercase" as const,
  letterSpacing: "0.03em",
  display: "block",
  marginBottom: 6,
};

type Fase = "unidad" | "motivo" | "detalle" | "exito";

export function WizardRescate({ unidades, motivos }: { unidades: Unidad[]; motivos: Motivo[] }) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>("unidad");
  const [unidadSel, setUnidadSel] = useState("");
  const [motivoSel, setMotivoSel] = useState<Motivo | null>(null);
  const [prioridad, setPrioridad] = useState("MEDIA");
  const [descripcion, setDescripcion] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [error, setError] = useState("");
  const [folioCreado, setFolioCreado] = useState("");
  const [pending, start] = useTransition();

  const unidadObj = unidades.find((u) => u.numeroEconomico === unidadSel);

  function seleccionarMotivo(m: Motivo) {
    setMotivoSel(m);
    const p = m.categoria === "SEGURIDAD" ? "URGENTE" : m.prioridadDefault;
    setPrioridad(p);
    setFase("detalle");
  }

  async function submitTicket() {
    if (!unidadSel || !motivoSel) return;
    setError("");
    const fd = new FormData();
    fd.set("numeroEconomico", unidadSel);
    fd.set("motivoId", motivoSel.id);
    fd.set("descripcion", descripcion);
    fd.set("ubicacion", ubicacion);
    fd.set("prioridad", prioridad);

    const res = await crearTicket(fd);
    if (!res.ok) {
      setError(res.error ?? "Error al crear el ticket.");
    } else {
      setFolioCreado(res.folio ?? "");
      setFase("exito");
    }
  }

  const panelStyle: React.CSSProperties = { background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)", borderRadius: "var(--radius-xl, 16px)", padding: "24px" };

  // FASE: exito
  if (fase === "exito") {
    return (
      <div style={panelStyle} className="flex flex-col items-center gap-4 text-center">
        <CheckCircle size={48} color="#22c55e" />
        <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>Ticket creado</h2>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-lg)", color: "var(--color-primary)", fontWeight: 700 }}>{folioCreado}</p>
        <div className="flex gap-3">
          <button onClick={() => router.push("/rescate")} className="rounded-md px-5 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            Ver todos los tickets
          </button>
          <button
            onClick={() => {
              setFase("unidad"); setUnidadSel(""); setMotivoSel(null); setDescripcion(""); setUbicacion(""); setFolioCreado("");
            }}
            className="rounded-md px-5 h-10"
            style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}
          >
            Nuevo ticket
          </button>
        </div>
      </div>
    );
  }

  // Barra de progreso
  const pasos = ["Unidad", "Motivo", "Detalle"];
  const idx = fase === "unidad" ? 0 : fase === "motivo" ? 1 : 2;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {pasos.map((p, i) => (
          <div key={p} className="flex items-center gap-2 flex-1">
            <div
              className="flex items-center justify-center rounded-full shrink-0"
              style={{ width: 28, height: 28, background: i <= idx ? "var(--color-primary)" : "var(--chip)", color: i <= idx ? "#fff" : "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
            >
              {i < idx ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: i === idx ? "var(--sidebar-text-active)" : "var(--sidebar-text)", fontWeight: i === idx ? 600 : 400 }}>{p}</span>
            {i < pasos.length - 1 && <div className="flex-1 h-px ml-2" style={{ background: "var(--field-border)" }} />}
          </div>
        ))}
      </div>

      {/* FASE unidad */}
      {fase === "unidad" && (
        <div style={panelStyle} className="flex flex-col gap-4">
          <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>¿Cuál unidad requiere rescate?</h2>
          <div>
            <label style={labelStyle}>Número económico *</label>
            <select value={unidadSel} onChange={(e) => setUnidadSel(e.target.value)} style={fieldStyle}>
              <option value="">Seleccionar unidad…</option>
              {unidades.map((u) => (
                <option key={u.numeroEconomico} value={u.numeroEconomico}>
                  {u.numeroEconomico}{u.proyectoNombre ? ` — ${u.proyectoNombre}` : ""}
                </option>
              ))}
            </select>
          </div>
          {unidadObj && (
            <div className="rounded-md px-4 py-3" style={{ background: "var(--field-bg)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
              Proyecto: <strong>{unidadObj.proyectoNombre ?? "—"}</strong> · Tipo: <strong>{unidadObj.tipoVehiculo}</strong>
            </div>
          )}
          <button
            disabled={!unidadSel}
            onClick={() => setFase("motivo")}
            className="flex items-center gap-2 rounded-md px-5 h-10 font-semibold self-start disabled:opacity-40"
            style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            Continuar <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* FASE motivo */}
      {fase === "motivo" && (
        <div style={panelStyle} className="flex flex-col gap-4">
          <div>
            <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
              ¿Cuál es el motivo del rescate?
            </h2>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Unidad: <strong style={{ fontFamily: "var(--font-mono)" }}>{unidadSel}</strong></p>
          </div>
          {Object.entries(CATEGORIA_LABEL).map(([cat, catLabel]) => {
            const motivosCat = motivos.filter((m) => m.categoria === cat);
            if (motivosCat.length === 0) return null;
            return (
              <div key={cat}>
                <div className="mb-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {catLabel}
                </div>
                <div className="flex flex-col gap-1">
                  {motivosCat.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => seleccionarMotivo(m)}
                      className="flex items-center justify-between rounded-md px-4 py-3 text-left transition-colors"
                      style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--field-border)"; }}
                    >
                      <span>{m.nombre}</span>
                      <span className="rounded-full px-2 py-0.5 text-white shrink-0" style={{ background: PRIORIDAD_COLOR[m.categoria === "SEGURIDAD" ? "URGENTE" : m.prioridadDefault] ?? "#6b7280", fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600 }}>
                        {m.categoria === "SEGURIDAD" ? "URGENTE" : m.prioridadDefault}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <button onClick={() => setFase("unidad")} className="self-start" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
            ← Cambiar unidad
          </button>
        </div>
      )}

      {/* FASE detalle */}
      {fase === "detalle" && motivoSel && (
        <div style={panelStyle} className="flex flex-col gap-4">
          <div>
            <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>Detalle del ticket</h2>
            <div className="flex items-center gap-2 mt-1">
              <Siren size={14} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)", fontWeight: 600 }}>{unidadSel}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>·</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{motivoSel.nombre}</span>
              <span
                className="rounded-full px-2 py-0.5 text-white ml-auto"
                style={{ background: PRIORIDAD_COLOR[prioridad] ?? "#6b7280", fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600 }}
              >
                {prioridad}
              </span>
            </div>
          </div>

          {motivoSel.categoria !== "SEGURIDAD" && (
            <div>
              <label style={labelStyle}>Prioridad</label>
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} style={fieldStyle}>
                {["BAJA", "MEDIA", "ALTA", "URGENTE"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
          {motivoSel.categoria === "SEGURIDAD" && (
            <div className="rounded-md px-4 py-3" style={{ background: "#fef2f2", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#ef4444", fontWeight: 600 }}>
              Situación de Seguridad — prioridad forzada a URGENTE.
            </div>
          )}
          <div>
            <label style={labelStyle}>Descripción adicional</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Describe brevemente la situación…"
              style={{ ...fieldStyle, height: "auto", padding: "10px 12px", resize: "vertical" }}
            />
          </div>
          <div>
            <label style={labelStyle}>Ubicación / referencia</label>
            <input
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ej. Km 45 carretera Morelia-Lázaro, frente a gasolinera"
              style={fieldStyle}
            />
          </div>

          {error && <p style={{ color: "#ef4444", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>{error}</p>}

          <div className="flex items-center gap-3">
            <button
              disabled={pending}
              onClick={() => start(() => submitTicket())}
              className="rounded-md px-5 h-10 font-semibold disabled:opacity-60"
              style={{ background: prioridad === "URGENTE" ? "#ef4444" : "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
            >
              {pending ? "Creando…" : prioridad === "URGENTE" ? "Crear ticket URGENTE" : "Crear ticket"}
            </button>
            <button onClick={() => setFase("motivo")} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              ← Cambiar motivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
