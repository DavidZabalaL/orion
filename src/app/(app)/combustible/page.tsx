import Link from "next/link";
import { CreditCard, Fuel, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CombustiblePanel } from "@/components/combustible/combustible-panel";
import type { GrupoCombustible } from "@/components/combustible/combustible-acordeon";
import { requerirPermisoModulo, esRolGlobal } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export const dynamic = "force-dynamic";

export default async function CombustiblePage() {
  await requerirPermisoModulo("D");
  const isAdmin = await esRolGlobal();
  const proyectosPermitidos = await proyectosPermitidosParaModulo("D");
  const filtroProyecto =
    proyectosPermitidos !== null
      ? { OR: [{ unidad: { proyectoId: { in: proyectosPermitidos } } }, { proyectoReportanteId: { in: proyectosPermitidos } }] }
      : {};
  // "Pendiente" es únicamente lo que no tiene NI unidad NI proyecto — en
  // cuanto se le asigna cualquiera de los dos, desaparece de esta bandeja
  // (ya cuenta como gasto de ese proyecto). Solo los usuarios sin
  // restricción de proyecto (admins) las ven, para triarlas.

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
    prisma.combustible.findMany({ where: { numeroEconomico: { not: null }, ...filtroProyecto }, orderBy: { fecha: "desc" } }),
    proyectosPermitidos !== null
      ? []
      : prisma.combustible.findMany({
          where: { numeroEconomico: null, proyectoReportanteId: null },
          include: { proyectoReportante: { select: { nombre: true } } },
          orderBy: { fecha: "desc" },
        }),
    prisma.combustible.aggregate({ where: filtroProyecto, _sum: { litros: true, costo: true }, _avg: { rendimientoCalculado: true } }),
  ]);

  const rendimientoPorUnidad = await prisma.combustible.groupBy({
    by: ["numeroEconomico"],
    where: filtroProyecto,
    _avg: { rendimientoCalculado: true },
    _sum: { litros: true, costo: true },
    orderBy: { numeroEconomico: "asc" },
  });

  // Se agrupa por número económico, igual que ya hace TAG, para no perder
  // información en una sola lista plana: cada unidad se ve resumida y se
  // despliega bajo demanda.
  const gruposPorEconomico = new Map<string, GrupoCombustible>();
  for (const t of transacciones) {
    const numeroEconomico = t.numeroEconomico as string;
    let grupo = gruposPorEconomico.get(numeroEconomico);
    if (!grupo) {
      grupo = { numeroEconomico, totalLitros: 0, totalCosto: 0, rendimientoPromedio: null, ultimaFecha: t.fecha.toISOString(), alertasPendientes: 0, transacciones: [] };
      gruposPorEconomico.set(numeroEconomico, grupo);
    }
    grupo.totalLitros += Number(t.litros);
    grupo.totalCosto += Number(t.costo);
    if (t.alertaSobrellenado) grupo.alertasPendientes += 1;
    grupo.transacciones.push(JSON.parse(JSON.stringify(t)));
  }
  for (const grupo of gruposPorEconomico.values()) {
    const conRendimiento = grupo.transacciones.filter((t) => t.rendimientoCalculado);
    grupo.rendimientoPromedio = conRendimiento.length
      ? conRendimiento.reduce((acc, t) => acc + Number(t.rendimientoCalculado), 0) / conRendimiento.length
      : null;
  }
  const grupos = Array.from(gruposPorEconomico.values()).sort((a, b) => a.numeroEconomico.localeCompare(b.numeroEconomico));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Combustible
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Consumo, rendimiento y anomalías — importador agnóstico de proveedor.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/combustible/autorizacion" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--status-revision-bg)", color: "var(--color-status-revision)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600 }}>
            <Fuel size={16} /> Autorizaciones
          </Link>
          <Link href="/combustible/mapeo-tarjetas" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <CreditCard size={16} /> Mapeo tarjeta → económico
          </Link>
          <Link href="/combustible/importar" className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <Upload size={16} /> Importar transacciones
          </Link>
        </div>
      </div>

      <CombustiblePanel
        unidades={unidades}
        proyectos={proyectos}
        grupos={grupos}
        pendientes={JSON.parse(JSON.stringify(pendientes))}
        rendimientoPorUnidad={JSON.parse(JSON.stringify(rendimientoPorUnidad))}
        litrosAcumulados={Number(agregados._sum.litros ?? 0)}
        gastoAcumulado={JSON.parse(JSON.stringify(agregados._sum.costo))}
        rendimientoPromedioFlota={Number(agregados._avg.rendimientoCalculado ?? 0)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
