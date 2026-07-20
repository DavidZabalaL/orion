import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Table, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";

export const dynamic = "force-dynamic";

function haceDias(dias: number) {
  return new Date(Date.now() - dias * 86_400_000);
}

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
};

export default async function HistorialRecorridoPage({
  searchParams,
}: {
  searchParams: Promise<{ unidad?: string; desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const unidades = await prisma.unidad.findMany({
    where: { estatus: { not: "BAJA" } },
    select: { numeroEconomico: true },
    orderBy: { numeroEconomico: "asc" },
  });

  const unidadSeleccionada = sp.unidad || unidades[0]?.numeroEconomico;
  const desde = sp.desde ? new Date(sp.desde) : haceDias(7);
  const hasta = sp.hasta ? new Date(sp.hasta) : haceDias(0);

  const posiciones = unidadSeleccionada
    ? await prisma.posicionGPS.findMany({
        where: { numeroEconomico: unidadSeleccionada, timestamp: { gte: desde, lte: hasta } },
        orderBy: { timestamp: "desc" },
      })
    : [];

  const validos = posiciones.filter((p) => p.kmValidado !== null);
  const distanciaKm = validos.length > 1
    ? Math.max(...validos.map((p) => p.kmValidado!)) - Math.min(...validos.map((p) => p.kmValidado!))
    : 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/mapa" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver al mapa
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Historial de Recorrido
        </h1>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <div>
          <label className="block mb-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Unidad</label>
          <select name="unidad" defaultValue={unidadSeleccionada} style={fieldStyle}>
            {unidades.map((u) => (
              <option key={u.numeroEconomico} value={u.numeroEconomico}>{u.numeroEconomico}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Desde</label>
          <input name="desde" type="date" defaultValue={desde.toISOString().slice(0, 10)} style={fieldStyle} />
        </div>
        <div>
          <label className="block mb-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Hasta</label>
          <input name="hasta" type="date" defaultValue={hasta.toISOString().slice(0, 10)} style={fieldStyle} />
        </div>
        <button type="submit" className="rounded-md px-4 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          Filtrar
        </button>
      </form>

      <div className="rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
        Distancia validada en el rango: <strong style={{ color: "var(--sidebar-text-active)", fontFamily: "var(--font-mono)" }}>{distanciaKm.toLocaleString("es-MX")} km</strong> · {posiciones.length} lecturas ({validos.length} válidas)
      </div>

      {posiciones.length === 0 ? (
        <EmptyState>Sin lecturas GPS en el rango seleccionado.</EmptyState>
      ) : (
        <Table headers={["Fecha / hora", "Lat", "Lng", "Velocidad", "Km validado", "Estatus"]} minWidth={720}>
          {posiciones.map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(p.timestamp)}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{Number(p.lat).toFixed(4)}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{Number(p.lng).toFixed(4)}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{p.velocidad ? `${p.velocidad} km/h` : "—"}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{p.kmValidado ?? "—"}</td>
              <td className="px-4 py-3">
                {p.esAnomalo ? (
                  <Badge label={p.motivoAnomalia ?? "Anómalo"} color="var(--color-status-escena)" bg="var(--status-escena-bg)" />
                ) : (
                  <Badge label="Válido" color="var(--color-status-cerrado)" bg="var(--status-cerrado-bg)" />
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
