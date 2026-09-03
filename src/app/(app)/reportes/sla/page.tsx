import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requerirPermisoModulo, puedeVerSlaDisponibilidad } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { calcularSlaMensualPorProyecto, NOMBRE_MES } from "@/lib/sla-disponibilidad";
import { Table, EmptyState, tdStyle } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ReporteSlaPage() {
  // Módulo J retirado del menú a pedido explícito — bloqueado también por URL directa.
  redirect("/sin-acceso");
  await requerirPermisoModulo("J");
  if (!(await puedeVerSlaDisponibilidad())) redirect("/sin-acceso");

  const proyectosPermitidos = await proyectosPermitidosParaModulo("J");
  const meses = await calcularSlaMensualPorProyecto(proyectosPermitidos);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl">
      <div>
        <Link href="/reportes" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a Reportes
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          SLA de disponibilidad por proyecto
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Promedio mensual del % de días activos de las unidades de cada proyecto. El mes en curso está parcial (se corta al día de hoy).
        </p>
      </div>

      {meses.length === 0 ? (
        <EmptyState>Aún no hay historial de disponibilidad.</EmptyState>
      ) : (
        <Table headers={["Mes", "Proyecto", "Unidades con datos", "% SLA promedio"]}>
          {meses.map((m) => (
            <tr key={`${m.proyecto}-${m.anio}-${m.mes}`} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3 whitespace-nowrap" style={{ ...tdStyle, fontWeight: 600 }}>
                {NOMBRE_MES[m.mes - 1]} {m.anio}
              </td>
              <td className="px-4 py-3" style={tdStyle}>{m.proyecto}</td>
              <td className="px-4 py-3" style={{ ...tdStyle, fontFamily: "var(--font-mono)" }}>{m.unidadesConDatos}</td>
              <td
                className="px-4 py-3"
                style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: m.porcentajePromedio < 90 ? "var(--priority-alta)" : "var(--field-text)" }}
              >
                {m.porcentajePromedio}%
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
