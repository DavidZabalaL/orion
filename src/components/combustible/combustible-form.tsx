"use client";

import { useRef, useState, useTransition } from "react";
import { crearCombustible } from "@/app/(app)/combustible/actions";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { CampoAyuda } from "@/components/ui/campo-ayuda";
import { ComboboxUnidad } from "@/components/ui/combobox-unidad";

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

type Estado = { tipo: "idle" } | { tipo: "ok" } | { tipo: "alerta" } | { tipo: "error"; mensaje: string };

export function CombustibleForm({
  unidades,
  proyectos = [],
  numeroEconomicoFijo,
  onExito,
}: {
  unidades: { numeroEconomico: string }[];
  proyectos?: { id: string; nombre: string }[];
  numeroEconomicoFijo?: string;
  onExito?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<Estado>({ tipo: "idle" });
  const [aplicaAUnidad, setAplicaAUnidad] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className={numeroEconomicoFijo ? "" : "rounded-xl p-5"} style={numeroEconomicoFijo ? undefined : { background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      {!numeroEconomicoFijo && (
        <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Captura manual de transacción
        </h3>
      )}
      {estado.tipo === "error" && (
        <div className="flex items-start gap-2 rounded-md px-3 py-2.5 mb-4" style={{ background: "var(--status-escena-bg)" }}>
          <TriangleAlert size={15} color="var(--color-status-escena)" className="shrink-0 mt-0.5" />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{estado.mensaje}</span>
        </div>
      )}
      {estado.tipo === "alerta" && (
        <div className="flex items-start gap-2 rounded-md px-3 py-2.5 mb-4" style={{ background: "var(--status-revision-bg)" }}>
          <TriangleAlert size={15} color="var(--color-status-revision)" className="shrink-0 mt-0.5" />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-revision)" }}>
            La transacción se guardó, pero el nivel estimado de tanque excede la capacidad máxima registrada de la unidad. Verifica la carga.
          </span>
        </div>
      )}
      <form
        ref={formRef}
        className="grid grid-cols-2 gap-4 md:grid-cols-5 items-end"
        action={(formData) => {
          startTransition(async () => {
            const res = await crearCombustible(formData);
            if (!res.ok) {
              setEstado({ tipo: "error", mensaje: res.error ?? "No se pudo registrar la transacción." });
              return;
            }
            if (res.alertaSobrellenado) {
              // No se cierra el modal aquí a propósito: hay que dejar ver la alerta
              // de sobrellenado antes de que el usuario decida cerrar.
              setEstado({ tipo: "alerta" });
            } else {
              setEstado({ tipo: "ok" });
              formRef.current?.reset();
              setTimeout(() => setEstado({ tipo: "idle" }), 2500);
              onExito?.();
            }
          });
        }}
      >
        {numeroEconomicoFijo ? (
          <div>
            <CampoAyuda style={labelStyle} texto="Unidad que recibió la carga de combustible.">Unidad *</CampoAyuda>
            <input type="hidden" name="numeroEconomico" value={numeroEconomicoFijo} />
            <div style={{ ...fieldStyle, display: "flex", alignItems: "center", fontFamily: "var(--font-mono)" }}>{numeroEconomicoFijo}</div>
          </div>
        ) : (
          <>
            <div>
              <CampoAyuda style={labelStyle} texto="Los gastos operativos que no corresponden a un económico específico se asignan directamente a un proyecto.">¿Aplica a una unidad? *</CampoAyuda>
              <select value={aplicaAUnidad ? "SI" : "NO"} onChange={(e) => setAplicaAUnidad(e.target.value === "SI")} style={fieldStyle}>
                <option value="SI">Sí, a una unidad</option>
                <option value="NO">No, gasto operativo del proyecto</option>
              </select>
            </div>
            {aplicaAUnidad ? (
              <div>
                <CampoAyuda style={labelStyle} texto="Unidad que recibió la carga de combustible.">Unidad *</CampoAyuda>
                <ComboboxUnidad name="numeroEconomico" unidades={unidades} required style={fieldStyle} />
              </div>
            ) : (
              <div>
                <CampoAyuda style={labelStyle} texto="Proyecto que reporta este gasto, ya que no se liga a una unidad.">Proyecto *</CampoAyuda>
                <select name="proyectoReportanteId" required style={fieldStyle}>
                  <option value="">Seleccionar…</option>
                  {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            )}
          </>
        )}
        <div>
          <CampoAyuda style={labelStyle} texto="Fecha en la que se realizó la carga.">Fecha *</CampoAyuda>
          <input name="fecha" type="date" required max={new Date().toISOString().slice(0, 10)} style={fieldStyle} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Cantidad de combustible cargado, en litros.">Litros *</CampoAyuda>
          <input name="litros" type="number" step="0.1" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Monto total pagado por la carga.">Costo *</CampoAyuda>
          <input name="costo" type="number" step="0.01" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        {(numeroEconomicoFijo || aplicaAUnidad) && (
          <div>
            <CampoAyuda style={labelStyle} texto="Kilometraje de la unidad al momento de la carga.">Kilometraje *</CampoAyuda>
            <input name="kmActual" type="number" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
        )}
        <div className="col-span-2 md:col-span-4">
          <CampoAyuda style={labelStyle} texto="Gasolinera o estación donde se cargó combustible.">Estación</CampoAyuda>
          <input name="estacion" style={fieldStyle} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-md h-10 font-semibold disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {estado.tipo === "ok" ? <><CheckCircle2 size={16} /> Guardado</> : pending ? "Guardando…" : "Registrar"}
        </button>
      </form>
    </div>
  );
}
