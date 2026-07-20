import Link from "next/link";
import { Plus, FileClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Table, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";

export const dynamic = "force-dynamic";

const ACCION_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  CREAR: { label: "Alta", color: "var(--color-status-cerrado)", bg: "var(--status-cerrado-bg)" },
  DAR_DE_BAJA: { label: "Baja", color: "var(--color-status-escena)", bg: "var(--status-escena-bg)" },
  REACTIVAR: { label: "Reactivación", color: "var(--color-status-asignado)", bg: "var(--status-asignado-bg)" },
  EDITAR: { label: "Edición", color: "var(--sidebar-text)", bg: "var(--chip)" },
};

export default async function AltasBajasPage() {
  const movimientos = await prisma.bitacoraCambio.findMany({
    where: { entidad: "Unidad" },
    include: { usuario: { select: { nombre: true } } },
    orderBy: { timestamp: "desc" },
    take: 30,
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Alta / Baja de Unidad
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            El alta se hace desde aquí; la baja lógica se inicia desde la Ficha de cada unidad.
          </p>
        </div>
        <Link
          href="/altas-bajas/nueva"
          className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          <Plus size={16} /> Dar de alta
        </Link>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          <FileClock size={18} /> Movimientos recientes (Bitácora)
        </h3>
        {movimientos.length === 0 ? (
          <EmptyState>Sin movimientos de alta o baja registrados aún.</EmptyState>
        ) : (
          <Table headers={["Fecha", "Unidad", "Acción", "Usuario"]} minWidth={640}>
            {movimientos.map((m) => (
              <tr key={m.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(m.timestamp)}</td>
                <td className="px-4 py-3">
                  <Link href={`/unidades/${m.entidadId}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                    {m.entidadId}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Badge label={ACCION_LABEL[m.accion]?.label ?? m.accion} color={ACCION_LABEL[m.accion]?.color ?? "var(--sidebar-text)"} bg={ACCION_LABEL[m.accion]?.bg ?? "var(--chip)"} />
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{m.usuario.nombre}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
