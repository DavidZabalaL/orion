import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BajaForm } from "@/components/unidades/baja-form";
import { darDeBaja } from "./actions";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export const dynamic = "force-dynamic";

export default async function BajaUnidadPage({ params }: { params: Promise<{ numeroEconomico: string }> }) {
  await requerirPermisoModulo("B", "editar");
  const { numeroEconomico } = await params;
  const proyectosPermitidos = await proyectosPermitidosParaModulo("B");

  const unidad = await prisma.unidad.findUnique({
    where: { numeroEconomico },
    select: { numeroEconomico: true, marca: true, unidadModelo: true, estatus: true, proyectoId: true },
  });

  if (!unidad) notFound();
  if (proyectosPermitidos !== null && (!unidad.proyectoId || !proyectosPermitidos.includes(unidad.proyectoId))) notFound();

  const accion = darDeBaja.bind(null, numeroEconomico);

  return <BajaForm unidad={unidad} accion={accion} />;
}
