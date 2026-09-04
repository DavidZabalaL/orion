import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { requerirPermisoModulo } from "@/lib/permisos";
import { PadronForm } from "@/components/usuarios/padron-form";
import { CopiarEnlaceRegistro } from "@/components/usuarios/copiar-enlace-registro";

export const dynamic = "force-dynamic";

export default async function PadronPersonalPage() {
  await requerirPermisoModulo("K", "editar");

  const [total, ultimo] = await Promise.all([
    prisma.personalActivo.count(),
    prisma.personalActivo.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
      <div>
        <Link href="/usuarios" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a Usuarios
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Padrón de personal activo
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Contra este padrón se valida el CURP y nombre de quien se autoregistra como Operador en{" "}
          <code style={{ fontFamily: "var(--font-mono)" }}>/registro-operador</code>. Súbelo de nuevo cada vez que Recursos Humanos
          te mande una versión actualizada — la carga anterior se reemplaza por completo.
        </p>
      </div>

      <CopiarEnlaceRegistro />

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Personas en el padrón" value={total} icon={Users} accent="var(--color-primary)" />
        <StatCard
          label="Última actualización"
          value={ultimo ? ultimo.updatedAt.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
          icon={Users}
          accent="var(--color-status-revision)"
        />
      </div>

      <PadronForm />

      <div className="rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <h3 className="mb-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Formato esperado
        </h3>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Un archivo .xlsx o .csv con las columnas <strong>NOMBRE COMPLETO</strong> y <strong>CURP</strong> (obligatorias), y opcionalmente
          EMPRESA, LUGAR DE TRABAJO, RFC, NSS y TELÉFONO.
        </p>
      </div>
    </div>
  );
}
