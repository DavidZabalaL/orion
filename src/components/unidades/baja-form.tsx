"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Ban, TriangleAlert } from "lucide-react";

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

export function BajaForm({
  unidad,
  accion,
}: {
  unidad: { numeroEconomico: string; marca: string; unidadModelo: string; estatus: string };
  accion: (formData: FormData) => Promise<void>;
}) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<{ motivoBaja: string; fechaEfectiva: string; comentario: string }>({
    motivoBaja: "",
    fechaEfectiva: new Date().toISOString().slice(0, 10),
    comentario: "",
  });

  if (unidad.estatus === "BAJA") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-24 text-center">
        <TriangleAlert size={28} color="var(--color-status-revision)" />
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Esta unidad ya se encuentra dada de baja.
        </p>
        <Link href={`/unidades/${unidad.numeroEconomico}`} style={{ color: "var(--color-primary)" }}>Volver a la ficha</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
      <div>
        <Link href={`/unidades/${unidad.numeroEconomico}`} className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a la ficha
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Dar de baja — <span style={{ fontFamily: "var(--font-mono)" }}>{unidad.numeroEconomico}</span>
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          {unidad.marca} {unidad.unidadModelo}. Esta acción conserva íntegramente el historial de la unidad.
        </p>
      </div>

      {paso === 1 && (
        <form
          className="flex flex-col gap-5 rounded-xl p-5"
          style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
          onSubmit={(e) => {
            e.preventDefault();
            setPaso(2);
          }}
        >
          <div>
            <label style={labelStyle}>Motivo de baja *</label>
            <select
              required
              value={formData.motivoBaja}
              onChange={(e) => setFormData({ ...formData, motivoBaja: e.target.value })}
              style={fieldStyle}
            >
              <option value="">Seleccionar…</option>
              <option value="VENTA">Venta</option>
              <option value="SINIESTRO_TOTAL">Siniestro total</option>
              <option value="FIN_VIDA_UTIL">Fin de vida útil</option>
              <option value="DEVOLUCION">Devolución</option>
              <option value="CONSIGNACION_CERRADA">Consignación cerrada</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Fecha efectiva *</label>
            <input
              type="date"
              required
              value={formData.fechaEfectiva}
              onChange={(e) => setFormData({ ...formData, fechaEfectiva: e.target.value })}
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Comentario</label>
            <textarea
              value={formData.comentario}
              onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
              rows={3}
              style={{ ...fieldStyle, height: "auto", padding: "10px 12px" }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="flex items-center gap-2 rounded-md px-5 h-10 font-semibold" style={{ background: "var(--color-status-escena)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
              <Ban size={16} /> Continuar
            </button>
            <Link href={`/unidades/${unidad.numeroEconomico}`} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}>
              Cancelar
            </Link>
          </div>
        </form>
      )}

      {paso === 2 && (
        <form
          action={accion}
          className="flex flex-col gap-5 rounded-xl p-5"
          style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
        >
          <input type="hidden" name="motivoBaja" value={formData.motivoBaja} />
          <input type="hidden" name="fechaEfectiva" value={formData.fechaEfectiva} />
          <input type="hidden" name="comentario" value={formData.comentario} />

          <div className="flex items-start gap-3 rounded-md px-4 py-3" style={{ background: "var(--status-escena-bg)" }}>
            <TriangleAlert size={18} color="var(--color-status-escena)" className="shrink-0 mt-0.5" />
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>
              Confirma que deseas dar de baja la unidad <strong>{unidad.numeroEconomico}</strong> con motivo{" "}
              <strong>{formData.motivoBaja.replaceAll("_", " ")}</strong> a partir del <strong>{formData.fechaEfectiva}</strong>.
              Esta acción cierra la asignación de proyecto y resguardo vigentes. El historial se conserva íntegro.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className="flex items-center gap-2 rounded-md px-5 h-10 font-semibold" style={{ background: "var(--color-status-escena)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
              <Ban size={16} /> Confirmar baja definitiva
            </button>
            <button
              type="button"
              onClick={() => setPaso(1)}
              className="rounded-md px-5 h-10"
              style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}
            >
              Regresar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
