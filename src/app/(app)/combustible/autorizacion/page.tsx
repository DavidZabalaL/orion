import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { PanelAutorizacionCombustible } from "@/components/combustible/panel-autorizacion-combustible";

export const dynamic = "force-dynamic";

function fmtMes(anio: number, mes: number) {
  return new Date(anio, mes - 1, 1).toLocaleString("es-MX", { month: "long", year: "numeric" });
}

export default async function AutorizacionCombustiblePage() {
  await requerirPermisoModulo("D");
  const permitidos = await proyectosPermitidosParaModulo("D");

  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;

  // Presupuesto de combustible (GASOLINA) por proyecto este mes
  const [proyectos, partidas, gastoReal, solicitudes] = await Promise.all([
    prisma.proyecto.findMany({
      where: {
        estatus: "ACTIVO",
        ...(permitidos !== null ? { id: { in: permitidos } } : {}),
      },
      select: { id: true, nombre: true },
    }),
    prisma.presupuestoPartida.findMany({
      where: {
        categoria: "GASOLINA",
        anio,
        mes,
        ...(permitidos !== null ? { proyectoId: { in: permitidos } } : {}),
      },
      select: { proyectoId: true, montoPresupuestado: true },
    }),
    prisma.combustible.groupBy({
      by: ["proyectoId"],
      _sum: { costo: true },
      where: {
        fecha: {
          gte: new Date(anio, mes - 1, 1),
          lt: new Date(anio, mes, 1),
        },
        ...(permitidos !== null ? { proyectoId: { in: permitidos } } : {}),
      },
    }),
    prisma.solicitudAutorizacionCombustible.findMany({
      where: {
        ...(permitidos !== null ? { proyectoId: { in: permitidos } } : {}),
      },
      include: {
        proyecto: { select: { nombre: true } },
        solicitadoPor: { select: { nombre: true } },
        aprobadoPor: { select: { nombre: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const presupuestoPorProyecto = Object.fromEntries(
    partidas.map((p) => [p.proyectoId, Number(p.montoPresupuestado)])
  );
  const gastoPorProyecto = Object.fromEntries(
    gastoReal.map((g) => [g.proyectoId, Number(g._sum.costo ?? 0)])
  );

  const resumenProyectos = proyectos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    presupuesto: presupuestoPorProyecto[p.id] ?? 0,
    gastado: gastoPorProyecto[p.id] ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link
          href="/combustible"
          className="flex items-center gap-1 w-fit mb-2"
          style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}
        >
          <ChevronLeft size={15} /> Volver a Combustible
        </Link>
        <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Autorización de Carga de Combustible
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", marginTop: 4 }}>
          Solicita o aprueba autorizaciones cuando el presupuesto de combustible ha sido superado.
        </p>
      </div>

      <PanelAutorizacionCombustible
        proyectos={resumenProyectos}
        solicitudes={JSON.parse(JSON.stringify(solicitudes))}
        mesPeriodo={fmtMes(anio, mes)}
        periodoKey={`${anio}-${String(mes).padStart(2, "0")}`}
      />
    </div>
  );
}
