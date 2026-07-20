import Link from "next/link";
import { Users, Shield, FolderCog, BellRing, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { InvitarUsuarioForm } from "@/components/usuarios/invitar-usuario-form";
import { UsuarioRow } from "@/components/usuarios/usuario-row";

export const dynamic = "force-dynamic";

const SECCIONES = [
  { href: "/usuarios", icon: Users, titulo: "Usuarios", descripcion: "Invitar, editar y desactivar cuentas", actual: true },
  { href: "/usuarios/roles", icon: Shield, titulo: "Roles y permisos", descripcion: "Ver / Editar / Aprobar por módulo" },
  { href: "/usuarios/proyectos", icon: FolderCog, titulo: "Módulos por proyecto", descripcion: "Activar o desactivar módulos" },
  { href: "/usuarios/notificaciones", icon: BellRing, titulo: "Notificaciones", descripcion: "Umbrales de alertas por módulo" },
];

function SeccionCard({ href, icon: Icon, titulo, descripcion, actual }: (typeof SECCIONES)[number]) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl p-4"
      style={{
        background: actual ? "var(--sidebar-item-active)" : "var(--panel-bg)",
        boxShadow: "var(--shadow-sm)",
        border: actual ? "1px solid var(--color-primary)" : "1px solid transparent",
      }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(43,127,255,0.12)" }}>
        <Icon size={18} color="var(--color-primary)" />
      </div>
      <div className="min-w-0 flex-1">
        <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{titulo}</div>
        <div className="truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{descripcion}</div>
      </div>
      <ChevronRight size={16} color="var(--sidebar-text)" className="shrink-0" />
    </Link>
  );
}

export default async function UsuariosPage() {
  const [usuarios, roles, proyectos] = await Promise.all([
    prisma.usuario.findMany({
      include: { rol: { select: { id: true, nombre: true } }, proyectos: { include: { proyecto: { select: { id: true, nombre: true } } } } },
      orderBy: { nombre: "asc" },
    }),
    prisma.rol.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.proyecto.findMany({ where: { estatus: "ACTIVO" }, select: { id: true, nombre: true } }),
  ]);

  const activos = usuarios.filter((u) => u.estatus === "ACTIVO").length;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Administración
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Usuarios, roles y permisos, módulos por proyecto y notificaciones — todo lo que necesitas para administrar Orion.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SECCIONES.map((s) => (
          <SeccionCard key={s.href} {...s} />
        ))}
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
                  rolId: u.rol.id,
                  rol: u.rol.nombre,
                  proyectoIds: u.proyectos.map((p) => p.proyecto.id),
                  proyectos: u.proyectos.map((p) => p.proyecto.nombre),
                  estatus: u.estatus,
                }}
                roles={roles}
                proyectosDisponibles={proyectos}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
