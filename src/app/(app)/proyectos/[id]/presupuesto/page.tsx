import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Table, EmptyState } from "@/components/ui/table";
import { fmtMoney } from "@/lib/formato";
import { obtenerResumenPresupuestoPorPartida } from "@/lib/presupuesto";
import { PartidasTabla } from "@/components/proyectos/partidas-tabla";
import { puedeCargarPresupuesto, requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export const dynamic = "force-dynamic";

const MESES_ABREV = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function horasDesde(fecha: Date) {
  return (Date.now() - fecha.getTime()) / 3_600_000;
}

export default async function PresupuestoPorPartidaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ anio?: string }>;
}) {
  await requerirPermisoModulo("H");
  const { id } = await params;
  const { anio: anioParam } = await searchParams;
  const anio = parseInt(anioParam ?? "", 10) || new Date().getFullYear();

  const proyectosPermitidos = await proyectosPermitidosParaModulo("H");
  if (proyectosPermitidos !== null && !proyectosPermitidos.includes(id)) notFound();

  const proyecto = await prisma.proyecto.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!proyecto) notFound();

  const [resumen, autorizado, partidasDelAnio, configuracion] = await Promise.all([
    obtenerResumenPresupuestoPorPartida(id, anio),
    puedeCargarPresupuesto(),
    prisma.presupuestoPartida.findMany({ where: { proyectoId: id, anio }, select: { id: true } }),
    prisma.configuracionNotificaciones.findFirst({ select: { alertaRecargaPresupuestoActiva: true } }),
  ]);

  const ultimoCambio = partidasDelAnio.length === 0
    ? null
    : await prisma.bitacoraCambio.findFirst({
        where: { entidad: "PresupuestoPartida", entidadId: { in: partidasDelAnio.map((p) => p.id) } },
        orderBy: { timestamp: "desc" },
        select: { timestamp: true },
      });

  const horasDesdeUltimoCambio = ultimoCambio ? horasDesde(ultimoCambio.timestamp) : null;
  const mostrarIndicador = configuracion?.alertaRecargaPresupuestoActiva && horasDesdeUltimoCambio !== null && horasDesdeUltimoCambio < 24;

  const presupuestadoAnual = resumen.partidas.reduce((acc, p) => acc + p.presupuestadoAnual, 0);
  const realAnual = resumen.partidas.reduce((acc, p) => acc + p.realAnual, 0);
  const diferenciaAnual = presupuestadoAnual - realAnual;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/proyectos/${id}`} className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
            <ChevronLeft size={15} /> Volver a {proyecto.nombre}
          </Link>
          <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Presupuesto por partida — {anio}
          </h1>
          {mostrarIndicador && (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-revision)" }}>
              Actualizado hace {Math.max(1, Math.round(horasDesdeUltimoCambio!))} h
            </p>
          )}
        </div>
        {autorizado && (
          <Link href={`/proyectos/${id}/presupuesto/importar`} className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <Upload size={16} /> Importar presupuesto
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <Stat label="Presupuestado (anual)" value={fmtMoney(presupuestadoAnual)} />
        <Stat label="Real (anual)" value={fmtMoney(realAnual)} />
        <Stat label="Diferencia" value={fmtMoney(diferenciaAnual)} color={diferenciaAnual < 0 ? "var(--color-status-escena)" : "var(--color-status-cerrado)"} />
      </div>

      {resumen.partidas.every((p) => p.presupuestadoAnual === 0 && p.realAnual === 0) ? (
        <EmptyState>Sin presupuesto ni gasto registrado para {anio}.</EmptyState>
      ) : (
        <Table headers={["Partida", ...MESES_ABREV, "PTTO anual", "Real anual", "Diferencia"]} minWidth={1400}>
          <PartidasTabla partidas={resumen.partidas} />
        </Table>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xl)", fontWeight: 700, color: color ?? "var(--sidebar-text-active)" }} className="mt-1">{value}</div>
    </div>
  );
}
