import { Users, UserCheck, CalendarDays, Percent } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Table, EmptyState } from "@/components/ui/table";
import { BiChart } from "@/components/bi/bi-chart";
import {
  obtenerKpisAdopcion,
  obtenerTablaUltimaActividad,
  obtenerRolesConActividad,
  obtenerSerieActividadDiaria,
  MODULO_ACTIVIDAD_LABEL,
} from "@/lib/actividad";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date | null): string {
  if (!d) return "Nunca";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default async function AdopcionPage({
  searchParams,
}: {
  searchParams: Promise<{ rolId?: string; modulo?: string }>;
}) {
  const { rolId, modulo } = await searchParams;

  const [kpis, tabla, roles, serie] = await Promise.all([
    obtenerKpisAdopcion(),
    obtenerTablaUltimaActividad({ rolId, modulo }),
    obtenerRolesConActividad(),
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

        <form className="mb-3 flex flex-wrap gap-3" data-no-print>
          <select
            name="rolId"
            defaultValue={rolId ?? ""}
            className="rounded-md px-3"
            style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            <option value="">Todos los roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
          <select
            name="modulo"
            defaultValue={modulo ?? ""}
            className="rounded-md px-3"
            style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            <option value="">Todos los módulos</option>
            {Object.entries(MODULO_ACTIVIDAD_LABEL).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <button type="submit" className="rounded-md px-5 h-9 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            Filtrar
          </button>
        </form>

        {tabla.length === 0 ? (
          <EmptyState>Sin usuarios que coincidan.</EmptyState>
        ) : (
          <Table headers={["Usuario", "Correo", "Rol", "Última actividad"]} minWidth={640}>
            {tabla.map((u) => (
              <tr key={u.usuarioId} style={{ borderBottom: "1px solid var(--field-border)" }}>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{u.nombre}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{u.correo}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.rol}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: u.ultimaActividad ? "var(--field-text)" : "var(--color-status-escena)" }}>{fmtFecha(u.ultimaActividad)}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
