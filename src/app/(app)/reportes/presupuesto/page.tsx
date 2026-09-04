import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Table, EmptyState } from "@/components/ui/table";
import { fmtMoney } from "@/lib/formato";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";
import { obtenerResumenPresupuestoPorPartida } from "@/lib/presupuesto";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export const dynamic = "force-dynamic";

const MESES_ABREV = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default async function ReportePresupuestoPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; proyecto?: string }>;
}) {
  // Módulo J retirado del menú a pedido explícito — bloqueado también por URL directa.
  redirect("/sin-acceso");
  await requerirPermisoModulo("J");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("J");
  const { anio: anioParam, proyecto: proyectoParam } = await searchParams;
  const anio = parseInt(anioParam ?? "", 10) || new Date().getFullYear();

  const filtroId: { id?: { in: string[] } } = proyectosPermitidos !== null ? { id: { in: proyectosPermitidos as string[] } } : {};
  const proyectos = await prisma.proyecto.findMany({
    where: { estatus: "ACTIVO", ...filtroId },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  const proyectosAMostrar = proyectoParam ? proyectos.filter((p) => p.id === proyectoParam) : proyectos;
  const resumenes = await Promise.all(proyectosAMostrar.map((p) => obtenerResumenPresupuestoPorPartida(p.id, anio)));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/reportes" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver al Dashboard Ejecutivo
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Presupuesto por partida — {anio}
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Réplica del control PTTO / REAL / Diferencia por proyecto y partida, con REAL recalculado a diario desde los gastos ya capturados.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-4 rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <div>
          <label className="block mb-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Proyecto</label>
          <select name="proyecto" defaultValue={proyectoParam ?? ""} className="rounded-md px-3" style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <option value="">Todos</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Año</label>
          <input name="anio" type="number" defaultValue={anio} className="rounded-md px-3" style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", width: 120 }} />
        </div>
        <button type="submit" className="rounded-md px-5 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          Filtrar
        </button>
      </form>

      {proyectosAMostrar.length === 0 ? (
        <EmptyState>No hay proyectos activos que mostrar.</EmptyState>
      ) : (
        proyectosAMostrar.map((proyecto, i) => {
          const resumen = resumenes[i];
          const presupuestadoAnual = resumen.partidas.reduce((acc, p) => acc + p.presupuestadoAnual, 0);
          const realAnual = resumen.partidas.reduce((acc, p) => acc + p.realAnual, 0);
          const diferenciaAnual = presupuestadoAnual - realAnual;

          return (
            <div key={proyecto.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                  {proyecto.nombre}
                </h3>
                <div className="flex items-center gap-4" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                  <span style={{ color: "var(--sidebar-text)" }}>PTTO {fmtMoney(presupuestadoAnual)}</span>
                  <span style={{ color: "var(--sidebar-text)" }}>Real {fmtMoney(realAnual)}</span>
                  <span style={{ fontWeight: 600, color: diferenciaAnual < 0 ? "var(--color-status-escena)" : "var(--color-status-cerrado)" }}>
                    Dif {fmtMoney(diferenciaAnual)}
                  </span>
                </div>
              </div>

              {resumen.partidas.every((p) => p.presupuestadoAnual === 0 && p.realAnual === 0) ? (
                <EmptyState>Sin presupuesto ni gasto registrado para {anio}.</EmptyState>
              ) : (
                <Table headers={["Partida", ...MESES_ABREV, "PTTO anual", "Real anual", "Diferencia"]} minWidth={1400}>
                  {resumen.partidas.map((p) => (
                    <tr key={p.categoria} style={{ borderBottom: "1px solid var(--field-border)" }}>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                        {CATEGORIA_GASTO_LABEL[p.categoria]}
                      </td>
                      {p.meses.map((m) => (
                        <td key={m.mes} className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                          <div style={{ color: m.diferencia < 0 ? "var(--color-status-escena)" : "var(--field-text)" }}>{fmtMoney(m.real)}</div>
                          <div style={{ color: "var(--sidebar-text)" }}>{fmtMoney(m.presupuestado)}</div>
                        </td>
                      ))}
                      <td className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{fmtMoney(p.presupuestadoAnual)}</td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{fmtMoney(p.realAnual)}</td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 600, color: p.diferenciaAnual < 0 ? "var(--color-status-escena)" : "var(--color-status-cerrado)" }}>
                        {fmtMoney(p.diferenciaAnual)}
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
