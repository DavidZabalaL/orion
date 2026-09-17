// Detalle de una unidad para la ventana flotante del mapa (módulo G): ficha
// general, conductor asignado, estimado de combustible, km recorridos hoy y
// la serie de posiciones del día (para el trazo de ruta y el gráfico de
// movimiento). Se pide bajo demanda al hacer clic en un marcador, en vez de
// cargarlo para las ~100 unidades de golpe en /mapa.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { inicioDeHoyMx } from "@/lib/timezone";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ numeroEconomico: string }> }) {
  try {
    await exigirPermisoModulo("G", "ver");
  } catch {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { numeroEconomico } = await params;
  const proyectosPermitidos = await proyectosPermitidosParaModulo("G");

  // dias=1 (default): solo la ruta/km de hoy. dias>1: amplía la ventana de la
  // ruta y el gráfico de movimiento a los últimos N días — lo usa el botón
  // "Ver últimos 7 días" del panel flotante, para no forzar al usuario a
  // salirse a /mapa/historial solo para ver un rango un poco más amplio.
  const dias = Math.max(1, Math.min(30, parseInt(new URL(request.url).searchParams.get("dias") ?? "1", 10) || 1));

  const unidad = await prisma.unidad.findUnique({
    where: { numeroEconomico },
    select: {
      numeroEconomico: true,
      marca: true,
      unidadModelo: true,
      anio: true,
      placas: true,
      tipoVehiculo: true,
      kmOficial: true,
      capacidadTanqueLitros: true,
      rendimientoPromedio: true,
      proyectoId: true,
      proyecto: { select: { nombre: true } },
      resguardante: { select: { nombre: true } },
    },
  });

  if (!unidad) return NextResponse.json({ error: "Unidad no encontrada." }, { status: 404 });
  if (proyectosPermitidos !== null && (!unidad.proyectoId || !proyectosPermitidos.includes(unidad.proyectoId))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const inicioRango = dias <= 1 ? inicioDeHoyMx() : new Date(Date.now() - dias * 86_400_000);

  const [ultima, posicionesRango, ultimaCarga] = await Promise.all([
    prisma.posicionGPS.findFirst({ where: { numeroEconomico }, orderBy: { timestamp: "desc" } }),
    prisma.posicionGPS.findMany({
      where: { numeroEconomico, timestamp: { gte: inicioRango } },
      orderBy: { timestamp: "asc" },
    }),
    prisma.combustible.findFirst({
      where: { numeroEconomico, kmActual: { not: null }, nivelEstimadoDespues: { not: null } },
      orderBy: { kmActual: "desc" },
    }),
  ]);

  const kmValidadosRango = posicionesRango.map((p) => p.kmValidado).filter((v): v is number => v !== null);
  const kmRango = kmValidadosRango.length > 1 ? Math.max(...kmValidadosRango) - Math.min(...kmValidadosRango) : 0;

  let combustible: { porcentaje: number; litros: number; capacidad: number } | null = null;
  const capacidad = unidad.capacidadTanqueLitros ? Number(unidad.capacidadTanqueLitros) : null;
  const rendimiento = unidad.rendimientoPromedio ? Number(unidad.rendimientoPromedio) : null;
  if (capacidad && rendimiento && ultimaCarga?.kmActual != null && ultimaCarga.nivelEstimadoDespues != null) {
    const kmDesdeCarga = unidad.kmOficial - ultimaCarga.kmActual;
    const litrosConsumidos = kmDesdeCarga > 0 ? kmDesdeCarga / rendimiento : 0;
    const litros = Math.max(0, Math.min(Number(ultimaCarga.nivelEstimadoDespues), capacidad) - litrosConsumidos);
    combustible = { porcentaje: Math.round((litros / capacidad) * 100), litros: Math.round(litros), capacidad: Math.round(capacidad) };
  }

  return NextResponse.json({
    numeroEconomico: unidad.numeroEconomico,
    marca: unidad.marca,
    modelo: unidad.unidadModelo,
    anio: unidad.anio,
    placas: unidad.placas,
    tipoVehiculo: TIPO_VEHICULO_LABEL[unidad.tipoVehiculo] ?? unidad.tipoVehiculo,
    proyecto: unidad.proyecto?.nombre ?? null,
    conductor: unidad.resguardante?.nombre ?? null,
    ultima: ultima
      ? {
          lat: Number(ultima.lat),
          lng: Number(ultima.lng),
          timestamp: ultima.timestamp.toISOString(),
          velocidad: ultima.velocidad != null ? Number(ultima.velocidad) : null,
          esAnomalo: ultima.esAnomalo,
          motivoAnomalia: ultima.motivoAnomalia,
        }
      : null,
    combustible,
    rangoDias: dias,
    kmRango: Math.round(kmRango),
    ruta: posicionesRango.map((p) => ({
      lat: Number(p.lat),
      lng: Number(p.lng),
      timestamp: p.timestamp.toISOString(),
      velocidad: p.velocidad != null ? Number(p.velocidad) : null,
    })),
  });
}
