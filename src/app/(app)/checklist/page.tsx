import { prisma } from "@/lib/prisma";
import { ChecklistForm } from "@/components/checklist/checklist-form";
import { Table, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";
import { PUNTOS_INSPECCION } from "@/lib/checklist";

export const dynamic = "force-dynamic";

function inicioDeHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function ChecklistPage() {
  const [unidades, checklistsHoy, sinCapturaHoy] = await Promise.all([
    prisma.unidad.findMany({
      where: { estatus: "ACTIVO" },
      select: { numeroEconomico: true, marca: true, unidadModelo: true },
      orderBy: { numeroEconomico: "asc" },
    }),
    prisma.checklist.findMany({
      where: { fecha: { gte: inicioDeHoy() } },
      include: { unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } } },
      orderBy: { fecha: "desc" },
    }),
    prisma.unidad.findMany({
      where: { estatus: "ACTIVO", checklists: { none: { fecha: { gte: inicioDeHoy() } } } },
      select: { numeroEconomico: true },
    }),
  ]);

  const serializado = JSON.parse(JSON.stringify(checklistsHoy));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      <div>
        <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Checklist diario
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Inspección diaria con lectura de odómetro obligatoria — reemplaza el formulario de Fast Field.
        </p>
      </div>

      {sinCapturaHoy.length > 0 && (
        <div className="rounded-md px-4 py-3" style={{ background: "var(--status-revision-bg)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-revision)" }}>
          {sinCapturaHoy.length} unidad(es) activa(s) sin checklist capturado hoy: {sinCapturaHoy.map((u) => u.numeroEconomico).join(", ")}
        </div>
      )}

      <ChecklistForm unidades={unidades} puntos={PUNTOS_INSPECCION} />

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Capturados hoy
        </h3>
        {serializado.length === 0 ? (
          <EmptyState>Sin checklists capturados hoy todavía.</EmptyState>
        ) : (
          <Table headers={["Hora", "Unidad", "Odómetro", "Puntos"]} minWidth={640}>
            {serializado.map((c: { id: string; fecha: string; odometro: number; unidad: { numeroEconomico: string; marca: string; unidadModelo: string }; puntosInspeccion: Record<string, string> }) => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(c.fecha)}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{c.unidad.numeroEconomico}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{c.odometro} km</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(c.puntosInspeccion).map(([k, v]) => (
                      <Badge key={k} label={k} color={v === "ok" ? "var(--color-status-cerrado)" : "var(--color-status-revision)"} bg={v === "ok" ? "var(--status-cerrado-bg)" : "var(--status-revision-bg)"} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
