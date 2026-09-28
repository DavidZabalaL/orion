import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { DepartamentosLista } from "@/components/usuarios/departamentos-lista";

export const dynamic = "force-dynamic";

export default async function DepartamentosApoyoPage() {
  await requerirPermisoModulo("K");

  const departamentos = await prisma.departamentoApoyo.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, activo: true, _count: { select: { gastos: true } } },
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
      <div>
        <Link href="/usuarios" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a usuarios
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Departamentos de apoyo
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Catálogo usado por &quot;Apoyo de pagos&quot; en Mantenimiento y Gastos. Quitar un departamento no afecta los gastos que ya lo tenían asignado.
        </p>
      </div>

      <DepartamentosLista
        departamentos={departamentos.map((d) => ({ id: d.id, nombre: d.nombre, activo: d.activo, gastosLigados: d._count.gastos }))}
      />
    </div>
  );
}
