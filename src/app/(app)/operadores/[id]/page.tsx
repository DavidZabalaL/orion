import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FichaOperador } from "@/components/operadores/ficha-operador";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export const dynamic = "force-dynamic";

export default async function FichaOperadorPage({ params }: { params: Promise<{ id: string }> }) {
  await requerirPermisoModulo("L");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("L");

  const { id } = await params;

  const operador = await prisma.operador.findUnique({
    where: { id },
    include: {
      proyecto: true,
      documentos: { orderBy: { fechaVencimiento: "asc" }, include: { archivo: { select: { url: true } } } },
      unidadesResguardadas: true,
      resguardos: {
        include: { unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true, tipoVehiculo: true } } },
        orderBy: { fechaDesde: "desc" },
      },
      accidentes: { orderBy: { fecha: "desc" } },
      cursos: { orderBy: { fecha: "desc" } },
    } as never,
  });

  if (!operador) notFound();
  if (proyectosPermitidos !== null && (!operador.proyectoId || !proyectosPermitidos.includes(operador.proyectoId))) notFound();

  const serializado = JSON.parse(JSON.stringify(operador));

  return <FichaOperador operador={serializado} />;
}
