import Link from "next/link";
import { Users, UserCheck, CalendarDays, Percent, ChevronRight } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Table, EmptyState } from "@/components/ui/table";
import { BiChart } from "@/components/bi/bi-chart";
import { BotonCerrarSesion } from "@/components/actividad/boton-cerrar-sesion";
import { FiltrosActividad } from "@/components/admin/filtros-actividad";
import {
  obtenerKpisAdopcion,
  obtenerTablaUltimaActividad,
  obtenerRolesConActividad,
  obtenerProyectosConActividad,
  obtenerSerieActividadDiaria,
  MODULO_ACTIVIDAD_LABEL,
} from "@/lib/actividad";
import { ZONA_HORARIA_MX } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date | null): string {
  if (!d) return "Nunca";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: ZONA_HORARIA_MX }).format(d);
}

function comoArreglo(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function AdopcionPage({
  searchParams,
}: {
  searchParams: Promise<{ rolId?: string | string[]; modulo?: string | string[]; proyectoId?: string | string[] }>;
}) {
  const params = await searchParams;
  const rolIds = comoArreglo(params.rolId);
  const modulos = comoArreglo(params.modulo);
  const proyectoIds = comoArreglo(params.proyectoId);

  const [kpis, tabla, roles, proyectos, serie] = await Promise.all([
    obtenerKpisAdopcion(),
    obtenerTablaUltimaActividad({ rolIds, modulos, proyectoIds }),
    obtenerRolesConActividad(),
    obtenerProyectosConActividad(),
    obtenerSerieActividadDiaria(30),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Usuarios activos hoy" value={kpis.activosHoy} icon={Users} accent="var(--color-primary)" />
        <StatCard label="Activos últimos 7 días" value={kpis.activosSemana} icon={UserCheck} accent="var(--color-status-cerrado)" />
        <StatCard label="Activos este mes" value={kpis.activosMes} icon={CalendarDays} accent="var(--color-status-asignado)" />
        <StatCard label="Adopción (mes / cuentas activas)" value={`${kpis.porcentajeAdopcion.toFixed(0)}%`} icon={Percent} accent="var(--color-status-revision)" />
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Actividad diaria — últimos 30 días
        </h3>
        <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)", height: 320 }}>
          <BiChart datos={serie} tipoGrafica="lineas" ejeYLabel="Eventos registrados" />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Usuarios por última actividad (los más inactivos primero)
          </h3>
        </div>
        <p className="mb-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Da clic en un usuario para ver el detalle completo de todo lo que ha hecho en la plataforma.
        </p>

        <FiltrosActividad
          roles={roles.map((r) => ({ value: r.id, label: r.nombre }))}
          modulos={Object.entries(MODULO_ACTIVIDAD_LABEL).map(([id, label]) => ({ value: id, label }))}
          proyectos={proyectos.map((p) => ({ value: p.id, label: p.nombre }))}
        />

        {tabla.length === 0 ? (
          <EmptyState>Sin usuarios que coincidan.</EmptyState>
        ) : (
          <Table headers={["Usuario", "Correo", "Rol", "Última actividad", "", "Acciones"]} minWidth={860}>
            {tabla.map((u) => (
              <tr key={u.usuarioId} style={{ borderBottom: "1px solid var(--field-border)" }}>
                <td className="px-4 py-3">
                  <Link href={`/admin/actividad/usuarios/${u.usuarioId}`} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                    {u.nombre}
                  </Link>
                  {u.sesionInvalidadaEn && (
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-status-escena)" }}>
                      Sesión cerrada el {fmtFecha(u.sesionInvalidadaEn)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{u.correo}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.rol}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: u.ultimaActividad ? "var(--field-text)" : "var(--color-status-escena)" }}>{fmtFecha(u.ultimaActividad)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/actividad/usuarios/${u.usuarioId}`} className="flex items-center gap-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-primary)" }}>
                    Ver detalle <ChevronRight size={14} />
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <BotonCerrarSesion usuarioId={u.usuarioId} nombre={u.nombre} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
