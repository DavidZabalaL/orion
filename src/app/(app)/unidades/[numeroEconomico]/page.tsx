import { notFound } from "next/navigation";
import { explicarCargasConGps } from "@/lib/combustible-estimado";
import { prisma } from "@/lib/prisma";
import { puedeEditarCapacidadTanque, requerirPermisoModulo, puedeVerSlaDisponibilidad, puedeVerPolizaSeguro, tienePermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo, unidadRestringidaParaOperador } from "@/lib/proyectos-usuario";
import { FichaUnidad } from "@/components/unidades/ficha-unidad";
import { obtenerAlertaPreventivaUnidad } from "@/lib/mantenimiento-preventivo";
import { calcularSlaMensualPorUnidad } from "@/lib/sla-disponibilidad";
import { obtenerComparativoCargaCombustible } from "@/app/(app)/checklist/actions";

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
        historialLlantas: { orderBy: { fechaInstalacion: "desc" } },
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

  const historicoIndisponibilidad = puedeVerSla
    ? await prisma.historicoDisponibilidadUnidad.findMany({
        where: { numeroEconomico, disponible: false },
        orderBy: { desde: "desc" },
        take: 50,
      })
    : [];

  // No se reutiliza `unidad.checklists` (limitado a 30 registros mezclando
  // todos los tipos) porque en unidades con mucha actividad diaria/semanal
  // eso puede dejar fuera cargas de combustible viejas — aquí se trae el
  // historial completo de CARGA_COMBUSTIBLE de esta unidad, ya con las
  // alertas de discrepancia calculadas (mismo criterio que /checklist/combustible).
  const puedeVerComparativoCombustible = await tienePermisoModulo("A.1");
  const comparativoCombustible = puedeVerComparativoCombustible
    ? await obtenerComparativoCargaCombustible({ desde: "2000-01-01", hasta: new Date().toISOString().slice(0, 10), numeroEconomico })
    : [];

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

  // Rendimiento real según la plataforma (km recorridos ÷ litros de las cargas
  // con rendimiento válido, mismo criterio que /combustible) — distinto del
  // rendimiento de la ficha técnica, que es un dato capturado del fabricante.
  const rendimientoReal = await prisma.combustible.aggregate({
    where: { numeroEconomico, rendimientoCalculado: { not: null }, kmRecorridos: { not: null } },
    _sum: { kmRecorridos: true, litros: true },
    _count: true,
  });
  const litrosReales = Number(rendimientoReal._sum.litros ?? 0);
  const rendimientoPlataforma =
    rendimientoReal._sum.kmRecorridos && litrosReales > 0 ? { kmL: Math.round((rendimientoReal._sum.kmRecorridos / litrosReales) * 100) / 100, cargas: rendimientoReal._count } : null;

  // Razón de cada alerta de combustible para el hover de la pestaña
  // Combustible (mismas 20 cargas que muestra + la anterior a la más vieja,
  // que hace falta para explicar esa).
  const cargasParaExplicar = await prisma.combustible.findMany({ where: { numeroEconomico }, orderBy: { fecha: "desc" }, take: 21 });
  const motivosCombustible = Object.fromEntries(
    [...(await explicarCargasConGps(cargasParaExplicar))].map(([id, e]) => [id, { motivoSobrellenado: e.motivoSobrellenado, discrepanciaGps: e.discrepanciaGps }])
  );

  const serializado = JSON.parse(JSON.stringify(unidadParaCliente));
  const insumosSerializados = JSON.parse(JSON.stringify(insumos));
  const historicoSerializado = JSON.parse(JSON.stringify(historicoIndisponibilidad));
  const comparativoCombustibleSerializado = JSON.parse(JSON.stringify(comparativoCombustible));

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
      historicoIndisponibilidad={historicoSerializado}
      puedeVerComparativoCombustible={puedeVerComparativoCombustible}
      comparativoCombustible={comparativoCombustibleSerializado}
      rendimientoPlataforma={rendimientoPlataforma}
      motivosCombustible={motivosCombustible}
    />
  );
}
