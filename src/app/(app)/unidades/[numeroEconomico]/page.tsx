import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { puedeEditarCapacidadTanque } from "@/lib/permisos";
import { FichaUnidad } from "@/components/unidades/ficha-unidad";

export const dynamic = "force-dynamic";

export default async function FichaUnidadPage({
  params,
}: {
  params: Promise<{ numeroEconomico: string }>;
}) {
  const { numeroEconomico } = await params;

  const [unidad, puedeEditarCapacidad] = await Promise.all([
    prisma.unidad.findUnique({
      where: { numeroEconomico },
      include: {
        proyecto: true,
        resguardante: {
          include: {
            documentos: { orderBy: { fechaVencimiento: "asc" } },
          },
        },
        checklists: { orderBy: { fecha: "desc" }, take: 15 },
        gastos: { orderBy: { fecha: "desc" }, take: 20 },
        combustible: { orderBy: { fecha: "desc" }, take: 20 },
        tags: { orderBy: { fecha: "desc" }, take: 20 },
        seguros: { include: { coberturas: true }, orderBy: { fechaVencimiento: "desc" } },
        posicionesGps: { orderBy: { timestamp: "desc" }, take: 20 },
      },
    }),
    puedeEditarCapacidadTanque(),
  ]);

  if (!unidad) notFound();

  // Decimal y Date exponen toJSON(); JSON.stringify los serializa automáticamente
  // a string / ISO-string, dejando el resultado listo para un Client Component.
  const serializado = JSON.parse(JSON.stringify(unidad));

  return <FichaUnidad unidad={serializado} puedeEditarCapacidad={puedeEditarCapacidad} />;
}
