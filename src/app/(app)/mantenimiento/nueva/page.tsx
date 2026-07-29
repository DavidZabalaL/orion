import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { crearGasto } from "../actions";
import { CamposCategoriaGasto } from "@/components/mantenimiento/campos-categoria-gasto";
import { requerirPermisoModulo } from "@/lib/permisos";
import { CampoAyuda } from "@/components/ui/campo-ayuda";

export const dynamic = "force-dynamic";

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

export default async function NuevaOrdenPage() {
  await requerirPermisoModulo("C", "editar");

  const [unidades, proyectos] = await Promise.all([
    prisma.unidad.findMany({
      where: { estatus: { not: "BAJA" } },
      select: { numeroEconomico: true },
      orderBy: { numeroEconomico: "asc" },
    }),
    prisma.proyecto.findMany({
      where: { estatus: "ACTIVO" },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
      <div>
        <Link href="/mantenimiento" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Ficha de Orden — Nueva
        </h1>
      </div>

      <form action={crearGasto} className="flex flex-col gap-5 rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CamposCategoriaGasto unidades={unidades} proyectos={proyectos} fieldStyle={fieldStyle} labelStyle={labelStyle} />
          <div className="md:col-span-2">
            <CampoAyuda style={labelStyle} texto="Detalle libre de qué se hizo o qué se va a hacer.">Descripción</CampoAyuda>
            <input name="descripcion" style={fieldStyle} />
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Fecha en la que se realizó o se programó el gasto.">Fecha *</CampoAyuda>
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
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-md px-5 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            Guardar orden
          </button>
          <Link href="/mantenimiento" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}>Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
