import Link from "next/link";
import { Users, Shield, FolderCog, BellRing } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { InvitarUsuarioForm } from "@/components/usuarios/invitar-usuario-form";
import { UsuarioRow } from "@/components/usuarios/usuario-row";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const [usuarios, roles, proyectos] = await Promise.all([
    prisma.usuario.findMany({
      include: { rol: { select: { nombre: true } }, proyectos: { include: { proyecto: { select: { nombre: true } } } } },
      orderBy: { nombre: "asc" },
    }),
    prisma.rol.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.proyecto.findMany({ where: { estatus: "ACTIVO" }, select: { id: true, nombre: true } }),
  ]);

  const activos = usuarios.filter((u) => u.estatus === "ACTIVO").length;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Usuarios y roles
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Permisos granulares: rol × proyecto × módulo × acción.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/usuarios/roles" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <Shield size={16} /> Configurar roles
          </Link>
          <Link href="/usuarios/notificaciones" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <BellRing size={16} /> Notificaciones
          </Link>
          <Link href="/usuarios/proyectos" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <FolderCog size={16} /> Módulos por proyecto
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Usuarios totales" value={usuarios.length} icon={Users} accent="var(--color-primary)" />
        <StatCard label="Activos" value={activos} icon={Users} accent="var(--color-status-cerrado)" />
        <StatCard label="Roles configurados" value={roles.length} icon={Shield} accent="var(--color-status-asignado)" />
      </div>

      <InvitarUsuarioForm roles={roles} proyectos={proyectos} />

      <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
              {["Nombre", "Correo", "Rol", "Proyectos asignados", "Estatus", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <UsuarioRow
                key={u.id}
                usuario={{
                  id: u.id,
                  nombre: u.nombre,
                  correo: u.correo,
                  rol: u.rol.nombre,
                  proyectos: u.proyectos.map((p) => p.proyecto.nombre),
                  estatus: u.estatus,
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
