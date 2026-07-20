import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/table";
import { ReporteBuilder } from "@/components/reportes/reporte-builder";
import { ReporteRow, type Reporte } from "@/components/reportes/reporte-row";

export const dynamic = "force-dynamic";

export default async function GeneradorReportesPage() {
  const reportes = await prisma.reporteProgramado.findMany({
    orderBy: { createdAt: "desc" },
    include: { creadoPor: { select: { nombre: true } } },
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      <div>
        <Link href="/reportes" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver al dashboard
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Generador de Reportes
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Selecciona campos de cualquier módulo, define destinatarios y programa el envío por correo.
        </p>
      </div>

      <ReporteBuilder />

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Reportes programados
        </h3>
        {reportes.length === 0 ? (
          <EmptyState>Sin reportes programados todavía.</EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {(JSON.parse(JSON.stringify(reportes)) as Reporte[]).map((r) => (
              <ReporteRow key={r.id} reporte={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
