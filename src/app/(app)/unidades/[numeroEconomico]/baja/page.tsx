import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BajaForm } from "@/components/unidades/baja-form";
import { darDeBaja } from "./actions";

export const dynamic = "force-dynamic";

export default async function BajaUnidadPage({ params }: { params: Promise<{ numeroEconomico: string }> }) {
  const { numeroEconomico } = await params;

  const unidad = await prisma.unidad.findUnique({
    where: { numeroEconomico },
    select: { numeroEconomico: true, marca: true, unidadModelo: true, estatus: true },
  });

  if (!unidad) notFound();

  const accion = darDeBaja.bind(null, numeroEconomico);

  return <BajaForm unidad={unidad} accion={accion} />;
}
