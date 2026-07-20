import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Table, EmptyState } from "@/components/ui/table";
import { fmtFecha } from "@/lib/formato";
import { crearMapeoTarjeta } from "../actions";

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

export default async function MapeoTarjetasPage() {
  const [mapeos, unidades] = await Promise.all([
    prisma.mapeoTarjetaEconomico.findMany({ orderBy: { vigenciaDesde: "desc" } }),
    prisma.unidad.findMany({ where: { estatus: { not: "BAJA" } }, select: { numeroEconomico: true }, orderBy: { numeroEconomico: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/combustible" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a combustible
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Mapeo Tarjeta → Económico
        </h1>
      </div>

      <form action={crearMapeoTarjeta} className="flex flex-wrap items-end gap-3 rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <div>
          <label style={labelStyle}>Número de tarjeta *</label>
          <input name="numeroTarjeta" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <label style={labelStyle}>Unidad *</label>
          <select name="numeroEconomico" required style={fieldStyle}>
            {unidades.map((u) => (
              <option key={u.numeroEconomico} value={u.numeroEconomico}>{u.numeroEconomico}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Proveedor *</label>
          <input name="proveedor" required placeholder="Efectivale" style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Vigente desde *</label>
          <input name="vigenciaDesde" type="date" required style={fieldStyle} />
        </div>
        <button type="submit" className="rounded-md px-4 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          Agregar
        </button>
      </form>

      {mapeos.length === 0 ? (
        <EmptyState>Sin mapeos registrados.</EmptyState>
      ) : (
        <Table headers={["Tarjeta", "Unidad", "Proveedor", "Vigente desde", "Vigente hasta"]} minWidth={640}>
          {mapeos.map((m) => (
            <tr key={m.numeroTarjeta} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{m.numeroTarjeta}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{m.numeroEconomico}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{m.proveedor}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFecha(m.vigenciaDesde)}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{m.vigenciaHasta ? fmtFecha(m.vigenciaHasta) : "Vigente"}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
