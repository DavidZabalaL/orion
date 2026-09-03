import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Upload } from "lucide-react";
import { TagPanel } from "@/components/tag/tag-panel";
import type { GrupoTag } from "@/components/tag/tag-acordeon";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export const dynamic = "force-dynamic";

export default async function TagPage() {
  await requerirPermisoModulo("E");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("E");
  const filtroProyecto =
    proyectosPermitidos !== null
      ? { OR: [{ unidad: { proyectoId: { in: proyectosPermitidos } } }, { proyectoReportanteId: { in: proyectosPermitidos } }] }
      : {};
  // "Pendiente" es únicamente lo que no tiene NI unidad NI proyecto — en
  // cuanto se le asigna cualquiera de los dos, desaparece de esta bandeja
  // (ya cuenta como gasto de ese proyecto). Un huérfano no tiene con qué
  // comparar el alcance de un usuario con proyectos asignados, así que solo
  // los usuarios sin restricción de proyecto (admins) los ven, para triarlos.

  const [unidades, proyectos, transacciones, pendientes, agregados] = await Promise.all([
    prisma.unidad.findMany({
      where: { estatus: { not: "BAJA" }, ...(proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {}) },
      select: { numeroEconomico: true },
      orderBy: { numeroEconomico: "asc" },
    }),
    prisma.proyecto.findMany({
      where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}) },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.tag.findMany({ where: { numeroEconomico: { not: null }, ...filtroProyecto }, orderBy: { fecha: "desc" } }),
    proyectosPermitidos !== null
      ? []
      : prisma.tag.findMany({
          where: { numeroEconomico: null, proyectoReportanteId: null },
          include: { proyectoReportante: { select: { nombre: true } } },
          orderBy: { fecha: "desc" },
        }),
    prisma.tag.aggregate({ where: filtroProyecto, _sum: { monto: true }, _count: { _all: true } }),
  ]);

  // Se agrupa por número económico para no perder la información en una sola
  // lista plana: cada unidad se ve resumida y se despliega bajo demanda.
  const gruposPorEconomico = new Map<string, GrupoTag>();
  for (const t of transacciones) {
    const numeroEconomico = t.numeroEconomico as string;
    let grupo = gruposPorEconomico.get(numeroEconomico);
    if (!grupo) {
      grupo = { numeroEconomico, totalMonto: 0, totalTransacciones: 0, ultimaFecha: t.fecha.toISOString(), transacciones: [] };
      gruposPorEconomico.set(numeroEconomico, grupo);
    }
    grupo.totalMonto += Number(t.monto);
    grupo.totalTransacciones += 1;
    grupo.transacciones.push(JSON.parse(JSON.stringify(t)));
  }
  const grupos = Array.from(gruposPorEconomico.values()).sort((a, b) => a.numeroEconomico.localeCompare(b.numeroEconomico));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            TAG / Peajes
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Gasto de casetas por unidad.
          </p>
        </div>
        <Link href="/tag/importar" className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          <Upload size={16} /> Importar estado de cuenta
        </Link>
      </div>

      <TagPanel
        unidades={unidades}
        proyectos={proyectos}
        grupos={grupos}
        pendientes={JSON.parse(JSON.stringify(pendientes))}
        totalTransacciones={agregados._count._all}
        gastoAcumulado={JSON.parse(JSON.stringify(agregados._sum.monto))}
      />
    </div>
  );
}
