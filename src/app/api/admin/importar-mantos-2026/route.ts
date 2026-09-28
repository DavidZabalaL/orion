// Ruta de importación retroactiva — Bitácora 2026 Mantos
// Uso único. Protegida por rol global (administrador).
// Llama GET /api/admin/importar-mantos-2026 desde el browser o con curl.
// Detecta duplicados por (numeroEconomico + fecha + costo).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esRolGlobal } from "@/lib/permisos";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { invalidarCacheBI } from "@/lib/bi/invalidar";
import { parseFechaLocalMx } from "@/lib/timezone";
import rawRecords from "./records.json";

type ImportRecord = {
  numeroEconomico: string;
  categoria: string;
  descripcion: string;
  kmAlMomento: number | null;
  proveedor: string | null;
  empresa: string | null;
  sc: string | null;
  odc: string | null;
  fecha: string;
  costo: number;
  estatus: string;
};

const records = rawRecords as ImportRecord[];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!(await esRolGlobal())) {
    return NextResponse.json({ error: "Solo administradores globales pueden ejecutar esta importación." }, { status: 403 });
  }

  const resultado = {
    total: records.length,
    insertados: 0,
    duplicados: 0,
    unidadesNoEncontradas: [] as string[],
    errores: [] as string[],
  };

  // 1. Unidades únicas en el archivo
  const nesUnicas = [...new Set(records.map((r) => r.numeroEconomico))];

  // 2. Verificar cuáles existen en la DB
  const unidadesDB = await prisma.unidad.findMany({
    where: { numeroEconomico: { in: nesUnicas } },
    select: { numeroEconomico: true, proyectoId: true },
  });
  const unidadesMap = new Map(unidadesDB.map((u) => [u.numeroEconomico, u]));

  const nesNoEncontradas = nesUnicas.filter((ne) => !unidadesMap.has(ne));
  resultado.unidadesNoEncontradas = nesNoEncontradas;

  // 3. Cargar todos los gastos existentes de esas unidades para detectar duplicados
  const existentes = await prisma.gastoVehicular.findMany({
    where: { numeroEconomico: { in: nesUnicas } },
    select: { numeroEconomico: true, fecha: true, costo: true },
  });

  // Clave: ne|YYYY-MM-DD|costo con 2 decimales
  const existentesSet = new Set(
    existentes.map((e) => {
      const fechaStr = e.fecha.toISOString().slice(0, 10);
      const costoStr = parseFloat(e.costo.toString()).toFixed(2);
      return `${e.numeroEconomico}|${fechaStr}|${costoStr}`;
    })
  );

  // 4. Históricos de proyecto abiertos por unidad
  const historicosDB = await prisma.unidadHistoricoProyecto.findMany({
    where: { numeroEconomico: { in: nesUnicas }, fechaFin: null },
    orderBy: { fechaInicio: "desc" },
  });
  // Solo el más reciente abierto por unidad
  const historicosMap = new Map<string, string>();
  for (const h of historicosDB) {
    if (!historicosMap.has(h.numeroEconomico)) {
      historicosMap.set(h.numeroEconomico, h.id);
    }
  }

  // 5. Filtrar registros a insertar
  // También deduplicar dentro del propio archivo (por si hay filas idénticas)
  const archivoSetInterno = new Set<string>();
  const paraInsertar: ImportRecord[] = [];

  for (const r of records) {
    if (nesNoEncontradas.includes(r.numeroEconomico)) continue;

    const fechaParsed = parseFechaLocalMx(r.fecha);
    if (!fechaParsed) {
      resultado.errores.push(`Fecha inválida en ${r.numeroEconomico}: "${r.fecha}"`);
      continue;
    }

    const fechaStr = fechaParsed.toISOString().slice(0, 10);
    const costoStr = parseFloat(r.costo.toString()).toFixed(2);
    const clave = `${r.numeroEconomico}|${fechaStr}|${costoStr}`;

    // Duplicado vs DB
    if (existentesSet.has(clave)) {
      resultado.duplicados++;
      continue;
    }
    // Duplicado interno en el archivo
    if (archivoSetInterno.has(clave)) {
      resultado.duplicados++;
      continue;
    }

    archivoSetInterno.add(clave);
    paraInsertar.push(r);
  }

  // 6. Insertar en lotes de 50
  const LOTE = 50;
  for (let i = 0; i < paraInsertar.length; i += LOTE) {
    const lote = paraInsertar.slice(i, i + LOTE);
    try {
      await prisma.$transaction(
        lote.map((r) => {
          const fecha = parseFechaLocalMx(r.fecha)!;
          const historicoProyectoId = historicosMap.get(r.numeroEconomico) ?? null;
          return prisma.gastoVehicular.create({
            data: {
              numeroEconomico: r.numeroEconomico,
              historicoProyectoId,
              categoria: r.categoria as never,
              descripcion: r.descripcion?.trim() || null,
              fecha,
              costo: r.costo,
              kmAlMomento: r.kmAlMomento,
              proveedor: r.proveedor?.trim() || null,
              empresa: r.empresa?.trim() || null,
              sc: r.sc?.trim() || null,
              odc: r.odc?.trim() || null,
              estatus: "REALIZADO",
            },
          });
        })
      );
      resultado.insertados += lote.length;
    } catch (e) {
      resultado.errores.push(
        `Lote ${i}–${i + lote.length}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  revalidatePath("/mantenimiento");
  invalidarCacheBI(["mantenimiento", "presupuesto_partida"]);

  return NextResponse.json({
    ...resultado,
    resumen: `${resultado.insertados} insertados, ${resultado.duplicados} duplicados omitidos, ${resultado.unidadesNoEncontradas.length} unidades no encontradas en la plataforma.`,
  });
}
