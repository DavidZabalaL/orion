import Link from "next/link";
import { ChevronLeft, Ban, Wallet, Timer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo, unidadRestringidaParaOperador } from "@/lib/proyectos-usuario";
import { StatCard } from "@/components/ui/stat-card";
import { UnidadesNoDisponiblesTabla } from "@/components/unidades/unidades-no-disponibles-tabla";
import { LABEL_MOTIVO } from "@/lib/reportes/estatus-flota-labels";

export const dynamic = "force-dynamic";

function diasDesde(fechaIso: string): number {
  return Math.floor((Date.now() - new Date(fechaIso).getTime()) / 86_400_000);
}

export default async function UnidadesNoDisponiblesPage() {
  await requerirPermisoModulo("A");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("A");
  const restriccionOperador = await unidadRestringidaParaOperador();
  const filtroOperador = restriccionOperador.esOperador ? { numeroEconomico: { in: restriccionOperador.numerosEconomicos } } : {};
  const filtroProyecto = proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {};

  const unidadesNoDisponibles = await prisma.unidad.findMany({
    where: { estatus: { not: "BAJA" }, disponibilidad: false, ...filtroProyecto, ...filtroOperador },
    select: {
      numeroEconomico: true,
      marca: true,
      unidadModelo: true,
      tipoVehiculo: true,
      proyecto: { select: { nombre: true } },
    },
    orderBy: { numeroEconomico: "asc" },
  });

  const economicos = unidadesNoDisponibles.map((u) => u.numeroEconomico);

  // Periodo de indisponibilidad todavía abierto (hasta=null) de cada unidad
  // — el más reciente si por algún motivo hubiera más de uno abierto.
  const periodosAbiertos = economicos.length
    ? await prisma.historicoDisponibilidadUnidad.findMany({
        where: { numeroEconomico: { in: economicos }, hasta: null },
        orderBy: { desde: "desc" },
        select: { numeroEconomico: true, desde: true, motivo: true, motivoDetalle: true },
      })
    : [];
  const periodoPorEconomico = new Map<string, { desde: Date; motivo: string | null; motivoDetalle: string | null }>();
  for (const p of periodosAbiertos) {
    if (!periodoPorEconomico.has(p.numeroEconomico)) periodoPorEconomico.set(p.numeroEconomico, p);
  }

  // Costo de reparación: suma de gastos vehiculares de la unidad desde que
  // entró a taller (fecha del periodo abierto) hasta ahora. Son pocas
  // unidades no disponibles a la vez, así que una consulta por unidad es más
  // simple y correcta que forzar un solo groupBy con un umbral de fecha
  // distinto por fila.
  const costoPorEconomico = new Map<string, number>();
  for (const ne of economicos) {
    const periodo = periodoPorEconomico.get(ne);
    if (!periodo) continue;
    const agg = await prisma.gastoVehicular.aggregate({
      where: { numeroEconomico: ne, fecha: { gte: periodo.desde } },
      _sum: { costo: true },
    });
    costoPorEconomico.set(ne, Number(agg._sum.costo ?? 0));
  }

  const filas = unidadesNoDisponibles.map((u) => {
    const periodo = periodoPorEconomico.get(u.numeroEconomico);
    return {
      numeroEconomico: u.numeroEconomico,
      vehiculo: `${u.marca} ${u.unidadModelo}`,
      proyecto: u.proyecto?.nombre ?? "Sin proyecto",
      motivo: periodo?.motivo ? (LABEL_MOTIVO[periodo.motivo as keyof typeof LABEL_MOTIVO] ?? periodo.motivo) : "Sin motivo registrado",
      motivoDetalle: periodo?.motivoDetalle ?? null,
      fechaIngreso: periodo?.desde.toISOString() ?? null,
      costoReparacion: costoPorEconomico.get(u.numeroEconomico) ?? 0,
    };
  });

  const costoTotal = filas.reduce((acc, f) => acc + f.costoReparacion, 0);
  const diasPromedio = filas.length > 0
    ? Math.round(filas.reduce((acc, f) => acc + (f.fechaIngreso ? diasDesde(f.fechaIngreso) : 0), 0) / filas.length)
    : 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/unidades" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a Inventario de Unidades
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Unidades no disponibles
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Fecha de ingreso a taller, fecha de salida (vacía = sigue en taller) y costo acumulado de reparación.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Unidades no disponibles" value={filas.length} icon={Ban} accent="var(--color-status-escena)" />
        <StatCard label="Costo acumulado en taller" value={`$${costoTotal.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`} icon={Wallet} accent="var(--color-primary)" />
        <StatCard label="Días promedio en taller" value={diasPromedio} icon={Timer} accent="#d97706" />
      </div>

      <UnidadesNoDisponiblesTabla filas={filas} />
    </div>
  );
}
