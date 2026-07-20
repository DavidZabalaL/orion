import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SeguroForm } from "@/components/seguros/seguro-form";

export const dynamic = "force-dynamic";

export default async function NuevaPolizaPage() {
  const unidades = await prisma.unidad.findMany({
    where: { estatus: { not: "BAJA" } },
    select: { numeroEconomico: true },
    orderBy: { numeroEconomico: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      <div>
        <Link href="/seguros" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a seguros
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Registrar póliza
        </h1>
      </div>

      <SeguroForm unidades={unidades} />
    </div>
  );
}
