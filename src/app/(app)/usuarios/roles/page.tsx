import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MODULOS } from "@/lib/modulos";
import { PERMISOS_ESPECIALES, requerirPermisoModulo } from "@/lib/permisos";
import { RolPermisosForm } from "@/components/usuarios/rol-permisos-form";
import { CrearRolForm } from "@/components/usuarios/crear-rol-form";

export const dynamic = "force-dynamic";

export default async function ConfiguracionRolesPage() {
  await requerirPermisoModulo("K");

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

      <CrearRolForm roles={roles.map((r) => ({ id: r.id, nombre: r.nombre }))} />

      <div className="flex flex-col gap-4">
        {roles.map((r, i) => (
          <details key={r.id} className="rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }} open={i === 0}>
            <summary
              className="cursor-pointer px-5 py-3"
              style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}
            >
              {r.nombre} ▾
            </summary>
            <div className="px-5 pb-5">
              <RolPermisosForm
                rol={{ id: r.id, nombre: r.nombre, permisos: r.permisos as Record<string, { ver?: boolean; editar?: boolean; aprobar?: boolean }> }}
                modulos={MODULOS.map((m) => ({ id: m.id, label: m.label, grupo: m.grupo }))}
                permisosEspeciales={PERMISOS_ESPECIALES}
              />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
