import Link from "next/link";
import { Plus, ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { PolizasLista } from "@/components/seguros/polizas-lista";
import { requerirPermisoModulo } from "@/lib/permisos";

export const dynamic = "force-dynamic";

export default async function SegurosPage() {
  await requerirPermisoModulo("F");

  const [polizas, unidadesSinPoliza] = await Promise.all([
    prisma.seguro.findMany({
      include: { unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } } },
      orderBy: { fechaVencimiento: "asc" },
    }),
    prisma.unidad.findMany({
      where: { estatus: { not: "BAJA" }, seguros: { none: {} } },
      select: { numeroEconomico: true },
    }),
  ]);

  const vigentes = polizas.filter((p) => p.estatus === "VIGENTE").length;
  const porVencer = polizas.filter((p) => p.estatus === "POR_VENCER").length;
  const vencidas = polizas.filter((p) => p.estatus === "VENCIDO").length;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Seguros + Coberturas
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Vigencias, vencimientos, renovaciones y desglose de coberturas por unidad.
          </p>
        </div>
        <Link href="/seguros/nueva" className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          <Plus size={16} /> Registrar póliza
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Vigentes" value={vigentes} icon={ShieldCheck} accent="var(--color-status-cerrado)" />
        <StatCard label="Por vencer" value={porVencer} icon={ShieldAlert} accent="var(--color-status-revision)" />
        <StatCard label="Vencidas" value={vencidas} icon={ShieldX} accent="var(--color-status-escena)" />
        <StatCard label="Unidades sin póliza" value={unidadesSinPoliza.length} icon={ShieldQuestion} accent="var(--color-primary)" />
      </div>

      {unidadesSinPoliza.length > 0 && (
        <div className="rounded-md px-4 py-3" style={{ background: "var(--status-revision-bg)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-revision)" }}>
          Sin póliza registrada: {unidadesSinPoliza.map((u) => u.numeroEconomico).join(", ")}
        </div>
      )}

      <PolizasLista polizas={JSON.parse(JSON.stringify(polizas))} />
    </div>
  );
}
