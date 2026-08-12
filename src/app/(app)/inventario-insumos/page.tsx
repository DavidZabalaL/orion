import { Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { InventarioTabla } from "@/components/inventario/inventario-tabla";

export const dynamic = "force-dynamic";

export default async function InventarioInsumosPage() {
  await requerirPermisoModulo("N");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("N");

  const [insumos, proyectos] = await Promise.all([
    prisma.insumoInventario.findMany({
      where: proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {},
      include: { proyecto: { select: { nombre: true } } },
      orderBy: [{ proyectoId: "asc" }, { nombre: "asc" }],
    }),
    prisma.proyecto.findMany({
      where: {
        estatus: "ACTIVO",
        ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}),
      },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const insumosRow = insumos.map((i) => ({
    id: i.id,
    nombre: i.nombre,
    categoria: i.categoria,
    unidad: i.unidad,
    existencias: i.existencias,
    minimoStock: i.minimoStock,
    proyectoId: i.proyectoId,
    proyectoNombre: i.proyecto.nombre,
  }));

  const alertas = insumosRow.filter((i) => Number(i.existencias) < Number(i.minimoStock));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            <Package size={24} />
            Inventario de Insumos
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Control de existencias por proyecto — aceite, anticongelante y consumibles.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl px-5 py-3 text-center" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>{insumosRow.length}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>Insumos registrados</div>
          </div>
          {alertas.length > 0 && (
            <div className="rounded-xl px-5 py-3 text-center" style={{ background: "var(--status-escena-bg, #fef2f2)", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--color-status-escena, #ef4444)" }}>{alertas.length}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena, #ef4444)" }}>Bajo mínimo</div>
            </div>
          )}
        </div>
      </div>

      <InventarioTabla insumos={insumosRow} proyectos={proyectos} />
    </div>
  );
}
