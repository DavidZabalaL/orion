import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { crearGasto } from "../actions";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";

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
  const unidades = await prisma.unidad.findMany({
    where: { estatus: { not: "BAJA" } },
    select: { numeroEconomico: true },
    orderBy: { numeroEconomico: "asc" },
  });

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
          <div>
            <label style={labelStyle}>Número económico *</label>
            <select name="numeroEconomico" required style={fieldStyle}>
              {unidades.map((u) => (
                <option key={u.numeroEconomico} value={u.numeroEconomico}>{u.numeroEconomico}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Categoría *</label>
            <select name="categoria" required style={fieldStyle}>
              {Object.entries(CATEGORIA_GASTO_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label style={labelStyle}>Descripción</label>
            <input name="descripcion" style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Fecha *</label>
            <input name="fecha" type="date" required style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Costo (MXN) *</label>
            <input name="costo" type="number" step="0.01" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
          <div>
            <label style={labelStyle}>Km al momento</label>
            <input name="kmAlMomento" type="number" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
          <div>
            <label style={labelStyle}>Taller / proveedor</label>
            <input name="proveedor" style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>SC (Solicitud de compra)</label>
            <input name="sc" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
          <div>
            <label style={labelStyle}>ODC (Orden de compra)</label>
            <input name="odc" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
          <div>
            <label style={labelStyle}>Estatus</label>
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
