import Link from "next/link";
import { Plus, Siren } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { RescateTabla } from "@/components/rescate/rescate-tabla";

export const dynamic = "force-dynamic";

const ESTATUS_ABIERTOS = ["ABIERTO", "ASIGNADO", "EN_ATENCION", "EN_TRANSITO"];

export default async function RescatePage() {
  await requerirPermisoModulo("R");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("R");

  const filtroProyecto = proyectosPermitidos !== null
    ? { proyectoId: { in: proyectosPermitidos } }
    : {};

  const [tickets, usuarios] = await Promise.all([
    prisma.ticketRescate.findMany({
      where: filtroProyecto,
      include: {
        motivo: { select: { nombre: true, categoria: true } },
        reportadoPor: { select: { nombre: true } },
        asignadoA: { select: { nombre: true } },
        proyecto: { select: { nombre: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    }),
    prisma.usuario.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const abiertos = tickets.filter((t) => ESTATUS_ABIERTOS.includes(t.estatus));
  const urgentes = abiertos.filter((t) => t.prioridad === "URGENTE");

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            <Siren size={24} />
            Rescate de Unidades
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Tickets activos y historial — folio RSC-AAAA-######
          </p>
        </div>
        <Link href="/rescate/nuevo" className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          <Plus size={16} /> Nuevo ticket
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Tickets abiertos", value: abiertos.length, color: "var(--color-primary)" },
          { label: "Urgentes", value: urgentes.length, color: "#ef4444" },
          { label: "Total histórico", value: tickets.length, color: "var(--sidebar-text)" },
          { label: "Cerrados / resueltos", value: tickets.filter((t) => ["CERRADO", "RESUELTO"].includes(t.estatus)).length, color: "#22c55e" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl px-5 py-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: 700, color }}>{value}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{label}</div>
          </div>
        ))}
      </div>

      <RescateTabla
        tickets={JSON.parse(JSON.stringify(tickets))}
        usuarios={usuarios}
      />
    </div>
  );
}
