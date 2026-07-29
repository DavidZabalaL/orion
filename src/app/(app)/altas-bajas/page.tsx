import Link from "next/link";
import { Plus, FileClock, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MovimientosLista } from "@/components/unidades/movimientos-lista";
import { requerirPermisoModulo } from "@/lib/permisos";

export const dynamic = "force-dynamic";

export default async function AltasBajasPage() {
  await requerirPermisoModulo("B");

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
        <div className="flex gap-2">
          <Link
            href="/altas-bajas/importar"
            className="flex items-center gap-2 rounded-md px-4 h-10"
            style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            <Upload size={16} /> Importar desde Excel
          </Link>
          <Link
            href="/altas-bajas/nueva"
            className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold"
            style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            <Plus size={16} /> Dar de alta
          </Link>
        </div>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          <FileClock size={18} /> Movimientos recientes (Bitácora)
        </h3>
        <MovimientosLista movimientos={JSON.parse(JSON.stringify(movimientos))} />
      </div>
    </div>
  );
}
