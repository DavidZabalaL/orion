"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { crearGasto } from "@/app/(app)/mantenimiento/actions";
import { CamposCategoriaGasto } from "@/components/mantenimiento/campos-categoria-gasto";
import { CampoAyuda } from "@/components/ui/campo-ayuda";

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

export function NuevaOrdenForm({
  unidades,
  proyectos,
  numeroEconomicoFijo,
  onExito,
}: {
  unidades: { numeroEconomico: string }[];
  proyectos: { id: string; nombre: string }[];
  numeroEconomicoFijo?: string;
  onExito?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-5"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await crearGasto(formData);
          if (!res.ok) {
            setError(res.error ?? "No se pudo guardar la orden.");
            return;
          }
          if (onExito) onExito();
          else router.push("/mantenimiento");
        });
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CamposCategoriaGasto unidades={unidades} proyectos={proyectos} fieldStyle={fieldStyle} labelStyle={labelStyle} numeroEconomicoFijo={numeroEconomicoFijo} />
        <div className="md:col-span-2">
          <CampoAyuda style={labelStyle} texto="Detalle libre de qué se hizo o qué se va a hacer.">Descripción</CampoAyuda>
          <input name="descripcion" style={fieldStyle} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Fecha en la que se realizó o se programó el gasto. A diferencia de otros módulos, aquí sí se puede agendar a futuro.">Fecha *</CampoAyuda>
          <input name="fecha" type="date" required style={fieldStyle} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Monto total del gasto en pesos mexicanos.">Costo (MXN) *</CampoAyuda>
          <input name="costo" type="number" step="0.01" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Kilometraje de la unidad al momento del servicio.">Km al momento</CampoAyuda>
          <input name="kmAlMomento" type="number" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Nombre del taller o proveedor que hizo el trabajo.">Taller / proveedor</CampoAyuda>
          <input name="proveedor" style={fieldStyle} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Folio de la solicitud de compra en SAP, si ya existe.">SC (Solicitud de compra)</CampoAyuda>
          <input name="sc" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Folio de la orden de compra en SAP, si ya existe.">ODC (Orden de compra)</CampoAyuda>
          <input name="odc" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Etapa administrativa en la que se encuentra este gasto.">Estatus</CampoAyuda>
          <select name="estatus" style={fieldStyle} defaultValue="PROGRAMADO">
            <option value="PROGRAMADO">Programado</option>
            <option value="REALIZADO">Realizado</option>
            <option value="PAGADO">Pagado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Fecha en que la unidad entró (o entrará) al taller. Se usa para el temporizador de tiempo en taller.">Fecha ingreso taller</CampoAyuda>
          <input name="fechaIngresoTaller" type="date" style={fieldStyle} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Fecha estimada de entrega del taller. Si se supera, se genera alerta.">Fecha estimada de salida</CampoAyuda>
          <input name="fechaEstimadaSalida" type="date" style={fieldStyle} />
        </div>
      </div>

      {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md px-5 h-10 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          {pending ? "Guardando…" : "Guardar orden"}
        </button>
      </div>
    </form>
  );
}
