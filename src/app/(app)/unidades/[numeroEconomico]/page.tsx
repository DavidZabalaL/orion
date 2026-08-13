import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { puedeEditarCapacidadTanque, requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo, unidadRestringidaParaOperador } from "@/lib/proyectos-usuario";
import { FichaUnidad } from "@/components/unidades/ficha-unidad";
import { obtenerAlertaPreventivaUnidad } from "@/lib/mantenimiento-preventivo";

export const dynamic = "force-dynamic";

export default async function FichaUnidadPage({
  params,
}: {
  params: Promise<{ numeroEconomico: string }>;
}) {
  await requerirPermisoModulo("A");
  const { numeroEconomico } = await params;
  const proyectosPermitidos = await proyectosPermitidosParaModulo("A");

  const [unidad, puedeEditarCapacidad, proyectos, alertaPreventiva] = await Promise.all([
    prisma.unidad.findUnique({
      where: { numeroEconomico },
      include: {
        proyecto: true,
        resguardante: {
          include: {
            documentos: { orderBy: { fechaVencimiento: "asc" } },
          },
        },
        checklists: { where: { tipo: "DIARIO" }, orderBy: { fecha: "desc" }, take: 15 },
        gastos: { orderBy: { fecha: "desc" }, take: 50 },
        combustible: { orderBy: { fecha: "desc" }, take: 20 },
        tags: { orderBy: { fecha: "desc" }, take: 20 },
        seguros: { include: { coberturas: true }, orderBy: { fechaVencimiento: "desc" } },
        posicionesGps: { orderBy: { timestamp: "desc" }, take: 20 },
        placasHistorial: { orderBy: { fechaDesde: "desc" } },
        accidentes: { orderBy: { fecha: "desc" } },
        historicosProyecto: {
          include: { proyecto: { select: { nombre: true } } },
          orderBy: { fechaInicio: "desc" },
        },
        siniestros: {
          include: {
            operador: { select: { nombre: true } },
            reportadoPor: { select: { nombre: true } },
          },
          orderBy: { fecha: "desc" },
          take: 30,
        },
      } as never,
    }),
    puedeEditarCapacidadTanque(),
    prisma.proyecto.findMany({
      where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}) },
      select: { id: true, nombre: true },
    }),
    obtenerAlertaPreventivaUnidad(numeroEconomico),
  ]);

  if (!unidad) notFound();
  if (proyectosPermitidos !== null && (!unidad.proyectoId || !proyectosPermitidos.includes(unidad.proyectoId))) notFound();

  const restriccionOperador = await unidadRestringidaParaOperador();
  if (restriccionOperador.esOperador && restriccionOperador.numeroEconomico !== numeroEconomico) notFound();

  // Decimal y Date exponen toJSON(); JSON.stringify los serializa automáticamente
  // a string / ISO-string, dejando el resultado listo para un Client Component.
  const serializado = JSON.parse(JSON.stringify(unidad));

  return <FichaUnidad unidad={serializado} puedeEditarCapacidad={puedeEditarCapacidad} proyectos={proyectos} alertaPreventiva={alertaPreventiva} />;
}
