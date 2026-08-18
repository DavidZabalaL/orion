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
        checklists: { orderBy: { fecha: "desc" }, take: 30 },
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
        consumosInsumos: {
          include: { insumo: { select: { nombre: true, unidad: true } } },
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
  if (restriccionOperador.esOperador && !restriccionOperador.numerosEconomicos.includes(numeroEconomico)) notFound();

  const insumos = unidad.proyectoId
    ? await prisma.insumoInventario.findMany({
        where: { proyectoId: unidad.proyectoId },
        select: { id: true, nombre: true, unidad: true, existencias: true },
        orderBy: { nombre: "asc" },
      })
    : [];

  const serializado = JSON.parse(JSON.stringify(unidad));
  const insumosSerializados = JSON.parse(JSON.stringify(insumos));

  return <FichaUnidad unidad={serializado} puedeEditarCapacidad={puedeEditarCapacidad} proyectos={proyectos} alertaPreventiva={alertaPreventiva} insumos={insumosSerializados} />;
}
