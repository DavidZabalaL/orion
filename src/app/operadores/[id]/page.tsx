import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FichaOperador } from "@/components/operadores/ficha-operador";

export const dynamic = "force-dynamic";

export default async function FichaOperadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const operador = await prisma.operador.findUnique({
    where: { id },
    include: {
      proyecto: true,
      documentos: { orderBy: { fechaVencimiento: "asc" } },
      unidadesResguardadas: true,
      resguardos: {
        include: { unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true, tipoVehiculo: true } } },
        orderBy: { fechaDesde: "desc" },
      },
    },
  });

  if (!operador) notFound();

  const serializado = JSON.parse(JSON.stringify(operador));

  return <FichaOperador operador={serializado} />;
}
