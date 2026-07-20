import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MODULOS } from "@/lib/modulos";
import { RolPermisosForm } from "@/components/usuarios/rol-permisos-form";

export const dynamic = "force-dynamic";

export default async function ConfiguracionRolesPage() {
  const roles = await prisma.rol.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl">
      <div>
        <Link href="/usuarios" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a usuarios
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Configuración de Roles
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Permisos por módulo: ver / editar / aprobar / ninguno.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {roles.map((r) => (
          <RolPermisosForm
            key={r.id}
            rol={{ id: r.id, nombre: r.nombre, permisos: r.permisos as Record<string, { ver?: boolean; editar?: boolean; aprobar?: boolean }> }}
            modulos={MODULOS.map((m) => ({ id: m.id, label: m.label }))}
          />
        ))}
      </div>
    </div>
  );
}
