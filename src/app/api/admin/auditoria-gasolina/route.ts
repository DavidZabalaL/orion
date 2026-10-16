// Auditoría puntual: compara GastoVehicular(GASOLINA) vs Combustible
// para detectar registros duplicados entre ambas tablas.
// Uso único — solo administradores globales.
// GET /api/admin/auditoria-gasolina?proyectoId=xxx  (proyectoId opcional)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esRolGlobal } from "@/lib/permisos";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!(await esRolGlobal()))
    return NextResponse.json({ error: "Solo administradores globales." }, { status: 403 });

  const proyectoId = req.nextUrl.searchParams.get("proyectoId") ?? undefined;
  const nombre = req.nextUrl.searchParams.get("nombre") ?? undefined;

  // Si se pasa nombre en lugar de proyectoId, resolverlo primero
  let resolvedProyectoId = proyectoId;
  if (!resolvedProyectoId && nombre) {
    const proyecto = await prisma.proyecto.findFirst({
      where: { nombre: { contains: nombre, mode: "insensitive" } },
      select: { id: true, nombre: true },
    });
    if (!proyecto)
      return NextResponse.json({ error: `Proyecto "${nombre}" no encontrado.` }, { status: 404 });
    resolvedProyectoId = proyecto.id;
  }

  // Filtro por proyecto (via unidad o proyectoReportante)
  const filtro = resolvedProyectoId
    ? {
        OR: [
          { unidad: { proyectoId: resolvedProyectoId } },
          { proyectoReportanteId: resolvedProyectoId },
        ],
      }
    : {};

  const [gastos, combustibles] = await Promise.all([
    prisma.gastoVehicular.findMany({
      where: { categoria: "GASOLINA", ...filtro },
      select: {
        id: true,
        numeroEconomico: true,
        fecha: true,
        costo: true,
        descripcion: true,
        proveedor: true,
        estatus: true,
        historicoProyecto: { select: { proyectoId: true } },
        proyectoReportante: { select: { nombre: true } },
      },
      orderBy: { fecha: "asc" },
    }),
    prisma.combustible.findMany({
      where: filtro,
      select: {
        id: true,
        numeroEconomico: true,
        fecha: true,
        litros: true,
        costo: true,
        estacion: true,
        fuente: true,
        proyectoReportante: { select: { nombre: true } },
      },
      orderBy: { fecha: "asc" },
    }),
  ]);

  // Clave de coincidencia: unidad + fecha (día) + costo exacto
  const clave = (ne: string | null, fecha: Date, costo: { toString(): string }) =>
    `${ne ?? "SIN_UNIDAD"}|${fecha.toISOString().slice(0, 10)}|${parseFloat(costo.toString()).toFixed(2)}`;

  const mapCombustible = new Map<string, typeof combustibles[0][]>();
  for (const c of combustibles) {
    const k = clave(c.numeroEconomico, c.fecha, c.costo);
    if (!mapCombustible.has(k)) mapCombustible.set(k, []);
    mapCombustible.get(k)!.push(c);
  }

  const duplicados: {
    gasto: (typeof gastos)[0];
    combustible: (typeof combustibles)[0];
  }[] = [];
  const soloEnGastos: typeof gastos = [];

  for (const g of gastos) {
    const k = clave(g.numeroEconomico, g.fecha, g.costo);
    const matches = mapCombustible.get(k);
    if (matches?.length) {
      duplicados.push({ gasto: g, combustible: matches[0] });
    } else {
      soloEnGastos.push(g);
    }
  }

  // Registros en Combustible sin par en GastoVehicular
  const clavesGastos = new Set(gastos.map((g) => clave(g.numeroEconomico, g.fecha, g.costo)));
  const soloEnCombustible = combustibles.filter(
    (c) => !clavesGastos.has(clave(c.numeroEconomico, c.fecha, c.costo))
  );

  const totalGastosGasolina = gastos.reduce((s, g) => s + parseFloat(g.costo.toString()), 0);
  const totalCombustible = combustibles.reduce((s, c) => s + parseFloat(c.costo.toString()), 0);
  const totalDuplicados = duplicados.reduce((s, d) => s + parseFloat(d.gasto.costo.toString()), 0);

  return NextResponse.json({
    resumen: {
      totalGastosGasolina: totalGastosGasolina.toFixed(2),
      totalCombustible: totalCombustible.toFixed(2),
      diferencia: (totalCombustible - totalGastosGasolina).toFixed(2),
      registrosGastosGasolina: gastos.length,
      registrosCombustible: combustibles.length,
      duplicados: duplicados.length,
      montoDuplicados: totalDuplicados.toFixed(2),
      soloEnGastos: soloEnGastos.length,
      soloEnCombustible: soloEnCombustible.length,
    },
    duplicados: duplicados.map((d) => ({
      fecha: d.gasto.fecha.toISOString().slice(0, 10),
      numeroEconomico: d.gasto.numeroEconomico,
      costo: parseFloat(d.gasto.costo.toString()).toFixed(2),
      gastoId: d.gasto.id,
      combustibleId: d.combustible.id,
      descripcionGasto: d.gasto.descripcion,
      estacionCombustible: d.combustible.estacion,
      litros: d.combustible.litros,
    })),
    soloEnGastos: soloEnGastos.map((g) => ({
      id: g.id,
      fecha: g.fecha.toISOString().slice(0, 10),
      numeroEconomico: g.numeroEconomico,
      costo: parseFloat(g.costo.toString()).toFixed(2),
      descripcion: g.descripcion,
      proveedor: g.proveedor,
      estatus: g.estatus,
    })),
    soloEnCombustible: soloEnCombustible.map((c) => ({
      id: c.id,
      fecha: c.fecha.toISOString().slice(0, 10),
      numeroEconomico: c.numeroEconomico,
      litros: c.litros,
      costo: parseFloat(c.costo.toString()).toFixed(2),
      estacion: c.estacion,
      fuente: c.fuente,
    })),
  });
}
