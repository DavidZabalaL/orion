import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { puedeEditarCapacidadTanque, requerirPermisoModulo, puedeVerSlaDisponibilidad, puedeVerPolizaSeguro } from "@/lib/permisos";
import { proyectosPermitidosParaModulo, unidadRestringidaParaOperador } from "@/lib/proyectos-usuario";
import { FichaUnidad } from "@/components/unidades/ficha-unidad";
import { obtenerAlertaPreventivaUnidad } from "@/lib/mantenimiento-preventivo";
import { calcularSlaMensualPorUnidad } from "@/lib/sla-disponibilidad";

export const dynamic = "force-dynamic";

export default async function FichaUnidadPage({
  params,
}: {
  params: Promise<{ numeroEconomico: string }>;
}) {
  await requerirPermisoModulo("A");
  const { numeroEconomico } = await params;
  const proyectosPermitidos = await proyectosPermitidosParaModulo("A");

  const [unidad, puedeEditarCapacidad, proyectos, alertaPreventiva, puedeVerSla, puedeVerPoliza] = await Promise.all([
    prisma.unidad.findUnique({
      where: { numeroEconomico },
      include: {
        proyecto: true,
        tarjetaCombustible: { select: { url: true } },
        resguardante: {
          include: {
            documentos: { orderBy: { fechaVencimiento: "asc" } },
          },
        },
        checklists: { orderBy: { fecha: "desc" }, take: 30 },
        gastos: {
          orderBy: { fecha: "desc" },
          take: 50,
          include: { historicoProyecto: { include: { proyecto: { select: { nombre: true } } } } },
        },
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
        documentos: {
          include: { archivo: true, subidoPor: { select: { nombre: true } } },
          orderBy: { createdAt: "desc" },
        },
      } as never,
    }),
    puedeEditarCapacidadTanque(),
    prisma.proyecto.findMany({
      where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}) },
      select: { id: true, nombre: true },
    }),
    obtenerAlertaPreventivaUnidad(numeroEconomico),
    puedeVerSlaDisponibilidad(),
    puedeVerPolizaSeguro(),
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

  const slaMensual = puedeVerSla ? await calcularSlaMensualPorUnidad(numeroEconomico) : [];

  // FichaUnidad es un Client Component: cualquier campo que viaje en `unidad` llega al
  // navegador aunque el JSX no lo pinte. Si el rol no puede ver el detalle comercial de la
  // póliza, se recorta aquí (no solo se oculta en el render) para no filtrar aseguradora/costo/coberturas.
  const unidadConSeguros = unidad as unknown as { seguros?: { id: string; numeroPoliza: string; estatus: string; fechaVencimiento: Date }[] };
  const unidadParaCliente = puedeVerPoliza
    ? unidad
    : {
        ...unidad,
        seguros: (unidadConSeguros.seguros ?? []).map((s) => ({
          id: s.id,
          numeroPoliza: s.numeroPoliza,
          estatus: s.estatus,
          fechaVencimiento: s.fechaVencimiento,
        })),
      };

  const serializado = JSON.parse(JSON.stringify(unidadParaCliente));
  const insumosSerializados = JSON.parse(JSON.stringify(insumos));

  return (
    <FichaUnidad
      unidad={serializado}
      puedeEditarCapacidad={puedeEditarCapacidad}
      proyectos={proyectos}
      alertaPreventiva={alertaPreventiva}
      insumos={insumosSerializados}
      puedeVerSla={puedeVerSla}
      slaMensual={slaMensual}
      puedeVerPolizaSeguro={puedeVerPoliza}
    />
  );
}
