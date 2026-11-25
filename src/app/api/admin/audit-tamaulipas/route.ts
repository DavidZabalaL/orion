import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esRolGlobal } from "@/lib/permisos";
import { auth } from "@/auth";

// Ruta diagnóstico temporal — semana 19-23 Nov 2026 Tamaulipas
// Abrir en navegador: /api/admin/audit-tamaulipas
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!(await esRolGlobal()))
    return NextResponse.json({ error: "Solo administradores globales." }, { status: 403 });
  const DESDE = new Date("2026-11-19T00:00:00.000Z");
  const HASTA  = new Date("2026-11-24T00:00:00.000Z");

  // 1. Proyectos en Tamaulipas
  const proyectos = await prisma.proyecto.findMany({
    where: { estadoRepublica: { contains: "Tamaulipas", mode: "insensitive" } },
    select: { id: true, nombre: true, estadoRepublica: true },
  });

  if (proyectos.length === 0) {
    // Si no encuentra, devuelve todos los valores únicos de estadoRepublica
    const estados = await prisma.proyecto.findMany({
      select: { nombre: true, estadoRepublica: true },
      distinct: ["estadoRepublica"],
    });
    return NextResponse.json({ error: "No hay proyectos con estadoRepublica=Tamaulipas", estadosDisponibles: estados });
  }

  const proyectoIds = proyectos.map((p) => p.id);

  // 2. Todas las unidades
  const unidades = await prisma.unidad.findMany({
    where: { proyectoId: { in: proyectoIds } },
    select: {
      numeroEconomico: true,
      marca: true,
      unidadModelo: true,
      tipoVehiculo: true,
      estatus: true,
      intellihubVehicleId: true,
      proyecto: { select: { nombre: true } },
    },
    orderBy: { numeroEconomico: "asc" },
  });

  const conGPS  = unidades.filter((u) => u.intellihubVehicleId !== null);
  const sinGPS  = unidades.filter((u) => u.intellihubVehicleId === null);
  const deBaja  = unidades.filter((u) => u.estatus === "BAJA");

  // 3. GPS de la semana para las unidades con GPS
  const economicosConGPS = conGPS.map((u) => u.numeroEconomico);

  const posiciones = economicosConGPS.length > 0
    ? await prisma.posicionGPS.groupBy({
        by: ["numeroEconomico"],
        where: {
          numeroEconomico: { in: economicosConGPS },
          timestamp: { gte: DESDE, lt: HASTA },
          esAnomalo: false,
        },
        _count: { _all: true },
        _min: { kmValidado: true },
        _max: { kmValidado: true },
      })
    : [];

  const conMovimiento: string[] = [];
  const conSenalSinMovimiento: string[] = [];
  const sinSenalEsaSemana: string[] = [];

  const econConDatos = new Set(posiciones.map((p) => p.numeroEconomico));

  for (const ec of economicosConGPS) {
    const p = posiciones.find((x) => x.numeroEconomico === ec);
    if (!p) {
      sinSenalEsaSemana.push(ec);
    } else {
      const delta = (p._max.kmValidado ?? 0) - (p._min.kmValidado ?? 0);
      if (delta > 0) conMovimiento.push(ec);
      else conSenalSinMovimiento.push(ec);
    }
  }

  // 4. Tabla detallada
  const detalle = unidades.map((u) => {
    const p = posiciones.find((x) => x.numeroEconomico === u.numeroEconomico);
    const kmDelta = p ? (p._max.kmValidado ?? 0) - (p._min.kmValidado ?? 0) : null;
    let categoria: string;
    if (!u.intellihubVehicleId) categoria = "sin_gps";
    else if (sinSenalEsaSemana.includes(u.numeroEconomico)) categoria = "gps_sin_señal";
    else if (kmDelta! > 0) categoria = "movio";
    else categoria = "gps_parada";

    return {
      numeroEconomico: u.numeroEconomico,
      vehiculo: `${u.marca} ${u.unidadModelo}`,
      tipoVehiculo: u.tipoVehiculo,
      estatus: u.estatus,
      intellihubId: u.intellihubVehicleId,
      proyecto: u.proyecto?.nombre,
      categoria,
      lecturas: p?._count._all ?? 0,
      kmDelta,
    };
  });

  return NextResponse.json({
    periodo: "19-23 Nov 2026",
    proyectos: proyectos.map((p) => p.nombre),
    resumen: {
      totalUnidades: unidades.length,
      conGPS: conGPS.length,
      sinGPS: sinGPS.length,
      deBaja: deBaja.length,
      gps_movio: conMovimiento.length,
      gps_parada: conSenalSinMovimiento.length,
      gps_sin_señal: sinSenalEsaSemana.length,
      suma_categorias: conMovimiento.length + conSenalSinMovimiento.length + sinSenalEsaSemana.length + sinGPS.length,
    },
    sinGPS: sinGPS.map((u) => ({ ec: u.numeroEconomico, vehiculo: `${u.marca} ${u.unidadModelo}`, estatus: u.estatus })),
    gpsSinSenalEsaSemana: sinSenalEsaSemana.map((ec) => {
      const u = unidades.find((x) => x.numeroEconomico === ec)!;
      return { ec, vehiculo: `${u.marca} ${u.unidadModelo}`, intellihubId: u.intellihubVehicleId, estatus: u.estatus };
    }),
    detalle,
  }, { status: 200 });
}
