import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { tienePermisoModulo } from "@/lib/permisos";
import { obtenerDataset, obtenerDimension, obtenerMetrica } from "@/lib/bi/metadata";

type Filtro = { dimensionId: string; valor: string };

type BiQueryBody = {
  dataset: string;
  ejeX: string;
  ejeY: string;
  filtros?: Filtro[];
};

function metricaExpr(metrica: NonNullable<ReturnType<typeof obtenerMetrica>>): Prisma.Sql {
  if (metrica.tipo === "conteo") return Prisma.sql`COUNT(*)`;
  const columna = Prisma.raw(metrica.columna!);
  if (metrica.tipo === "suma") return Prisma.sql`SUM(${columna})`;
  return Prisma.sql`AVG(${columna})`;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await tienePermisoModulo("J"))) {
    return NextResponse.json({ error: "No tienes permiso para consultar el motor de BI." }, { status: 403 });
  }

  let body: BiQueryBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const dataset = obtenerDataset(body.dataset);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset desconocido." }, { status: 400 });
  }

  const dimension = obtenerDimension(dataset, body.ejeX);
  if (!dimension) {
    return NextResponse.json({ error: "Dimensión (eje X) desconocida para este dataset." }, { status: 400 });
  }

  const metrica = obtenerMetrica(dataset, body.ejeY);
  if (!metrica) {
    return NextResponse.json({ error: "Métrica (eje Y) desconocida para este dataset." }, { status: 400 });
  }

  // La columna de agrupación se resuelve siempre contra la expresión SQL
  // fija del registro de metadatos — nunca contra texto libre del cliente.
  const dimensionExpr =
    dimension.tipo === "fecha_mes"
      ? Prisma.sql`TO_CHAR(${Prisma.raw(dimension.expr)}, 'YYYY-MM')`
      : Prisma.sql`${Prisma.raw(dimension.expr)}`;

  const condiciones: Prisma.Sql[] = [];
  for (const filtro of body.filtros ?? []) {
    const dimFiltro = obtenerDimension(dataset, filtro.dimensionId);
    if (!dimFiltro || typeof filtro.valor !== "string" || filtro.valor.trim() === "") continue;
    const expr =
      dimFiltro.tipo === "fecha_mes"
        ? Prisma.sql`TO_CHAR(${Prisma.raw(dimFiltro.expr)}, 'YYYY-MM')`
        : Prisma.sql`${Prisma.raw(dimFiltro.expr)}`;
    condiciones.push(Prisma.sql`${expr} = ${filtro.valor}`);
  }

  const whereClause = condiciones.length > 0 ? Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}` : Prisma.empty;

  const query = Prisma.sql`
    SELECT ${dimensionExpr} AS dimension, ${metricaExpr(metrica)} AS metrica
    FROM ${Prisma.raw(dataset.from)}
    ${whereClause}
    GROUP BY ${dimensionExpr}
    ORDER BY ${dimensionExpr} ASC
  `;

  try {
    const filas = await prisma.$queryRaw<{ dimension: string | null; metrica: number | string | null }[]>(query);
    const datos = filas
      .filter((f) => f.dimension !== null)
      .map((f) => ({ dimension: String(f.dimension), valor: Number(f.metrica ?? 0) }));

    return NextResponse.json({
      dataset: dataset.id,
      ejeX: { id: dimension.id, label: dimension.label },
      ejeY: { id: metrica.id, label: metrica.label },
      datos,
    });
  } catch (error) {
    console.error("Error en /api/bi/query", error);
    return NextResponse.json({ error: "No se pudo ejecutar la consulta." }, { status: 500 });
  }
}
