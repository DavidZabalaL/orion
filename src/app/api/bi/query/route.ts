import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { tienePermisoModulo } from "@/lib/permisos";
import { obtenerDataset, obtenerCampo, agregacionesDisponibles, AGREGACION_LABEL, type TipoAgregacion, type CampoMeta } from "@/lib/bi/metadata";

type Filtro = { campoId: string; valor: string };

type BiQueryBody = {
  dataset: string;
  ejeX: string;
  ejeY: string;
  agregacion: TipoAgregacion;
  filtros?: Filtro[];
};

function campoExpr(campo: CampoMeta): Prisma.Sql {
  return campo.tipo === "fecha_mes"
    ? Prisma.sql`TO_CHAR(${Prisma.raw(campo.expr)}, 'YYYY-MM')`
    : Prisma.sql`${Prisma.raw(campo.expr)}`;
}

function metricaExpr(agregacion: TipoAgregacion, campoY: CampoMeta): Prisma.Sql {
  if (agregacion === "conteo") return Prisma.sql`COUNT(*)`;
  const columna = Prisma.raw(campoY.expr);
  if (agregacion === "suma") return Prisma.sql`SUM(${columna})`;
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

  const campoX = obtenerCampo(dataset, body.ejeX);
  if (!campoX) {
    return NextResponse.json({ error: "Eje X desconocido para este dataset." }, { status: 400 });
  }

  const agregacion = body.agregacion;
  if (agregacion !== "conteo" && agregacion !== "suma" && agregacion !== "promedio") {
    return NextResponse.json({ error: "Agregación inválida." }, { status: 400 });
  }

  const campoY = obtenerCampo(dataset, body.ejeY);
  if (!campoY) {
    return NextResponse.json({ error: "Eje Y desconocido para este dataset." }, { status: 400 });
  }
  if (!agregacionesDisponibles(campoY).includes(agregacion)) {
    return NextResponse.json({ error: "Esa agregación no aplica al campo elegido en el eje Y." }, { status: 400 });
  }

  // Las columnas de agrupación y agregación se resuelven siempre contra la
  // expresión SQL fija del registro de metadatos — nunca contra texto libre del cliente.
  const dimensionExpr = campoExpr(campoX);

  const condiciones: Prisma.Sql[] = [];
  for (const filtro of body.filtros ?? []) {
    const campoFiltro = obtenerCampo(dataset, filtro.campoId);
    if (!campoFiltro || typeof filtro.valor !== "string" || filtro.valor.trim() === "") continue;
    condiciones.push(Prisma.sql`${campoExpr(campoFiltro)} = ${filtro.valor}`);
  }

  const whereClause = condiciones.length > 0 ? Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}` : Prisma.empty;

  const query = Prisma.sql`
    SELECT ${dimensionExpr} AS dimension, ${metricaExpr(agregacion, campoY)} AS metrica
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

    const ejeYLabel = agregacion === "conteo" ? "N° de registros" : `${campoY.label} (${AGREGACION_LABEL[agregacion]})`;

    return NextResponse.json({
      dataset: dataset.id,
      ejeX: { id: campoX.id, label: campoX.label },
      ejeY: { label: ejeYLabel },
      datos,
    });
  } catch (error) {
    console.error("Error en /api/bi/query", error);
    return NextResponse.json({ error: "No se pudo ejecutar la consulta." }, { status: 500 });
  }
}
