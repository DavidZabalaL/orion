// Carga retroactiva de la Bitácora 2026 de Mantenimientos — un solo uso.
// Uso: npx tsx prisma/scripts/cargar-bitacora-mantos-2026.ts [--dry-run]
//
// Resoluciones acordadas con el equipo (ver conversación):
// - "C4-054" es un error de captura, la unidad real es "C5-054".
// - "CR-023" (robada) y "G5-011" (vendida) ya no existen en el catálogo —
//   pertenecían a Michoacán (SYM-234). Se cargan sin unidad ligada
//   (numeroEconomico null), atribuidas directo al proyecto vía
//   proyectoReportanteId, con el número económico original anotado en la
//   descripción para no perder la trazabilidad.
// - "BRAZO HIDRAULICO"/"B. HIDRAULICO" no es una unidad, es un accesorio de
//   grúa — se carga igual, sin unidad, atribuido a SYM-004 Corporativo.
// - Los códigos de proyecto "SYM-264" y "SYM-294" que trae el archivo no
//   existen y no hace falta crearlos: las unidades de esas filas (AR-001,
//   C5-068, CR-003, CR-033) siguen activas hoy, y el resto de la plataforma
//   siempre atribuye el gasto de una unidad a su proyecto ACTUAL (ningún
//   reporte usa el proyecto histórico por fecha) — así que el proyecto que
//   diga el archivo es irrelevante para las unidades que siguen existiendo.
// - Se excluyen 4 filas que ya estaban cargadas (mismo económico+SC+ODC).
import "dotenv/config";
import XLSX from "xlsx";
import { prisma } from "../../src/lib/prisma";
import type { CategoriaGasto, EstatusGasto } from "../../src/generated/prisma/enums";

const RUTA = "/Users/daniel/Downloads/1790362390262-Bitacora 2026 Mantos-d6CiENK20lMIXXvg9wVZDAbF2LiJr4.xlsx";
const DRY_RUN = process.argv.includes("--dry-run");

const CATEGORIA_MAP: Record<string, CategoriaGasto> = {
  "Mant. Correctivo": "MANTENIMIENTO_CORRECTIVO",
  "Mant. Preventivo": "MANTENIMIENTO_PREVENTIVO",
  "Consumibles": "CONSUMIBLES",
  "Estacionamiento": "ESTACIONAMIENTO",
  "Verificación": "VERIFICACION",
  "Emplacamiento": "EMPLACAMIENTO",
};

const ESTATUS_MAP: Record<string, EstatusGasto> = {
  "REALIZADO": "REALIZADO",
  "EN PROCESO DE PAGO": "PENDIENTE_DE_PAGO",
};

// Económicos sin unidad ya en el catálogo — se resuelven directo a un
// proyecto (sin numeroEconomico), con una nota fija que se antepone a la
// descripción original de cada fila.
type ResolucionSinUnidad = { notaProyectoCodigo: string; nota: string };
const SIN_UNIDAD: Record<string, ResolucionSinUnidad> = {
  "CR-023": { notaProyectoCodigo: "SYM-234", nota: "[Unidad CR-023, robada — ya no está en el catálogo] " },
  "G5-011": { notaProyectoCodigo: "SYM-234", nota: "[Unidad G5-011, vendida — ya no está en el catálogo] " },
  "BRAZO HIDRAULICO": { notaProyectoCodigo: "SYM-004 Corporativo", nota: "[Brazo hidráulico, accesorio sin número económico] " },
  "B. HIDRAULICO": { notaProyectoCodigo: "SYM-004 Corporativo", nota: "[Brazo hidráulico, accesorio sin número económico] " },
};

// Correcciones de captura del económico.
const CORRECCION_ECONOMICO: Record<string, string> = {
  "C4-054": "C5-054",
};

function eco(r: any): string { return String(r["Número económico"]).trim(); }
function importe(r: any): number { return Number(r[" IMPORTE "]); }

async function main() {
  const wb = XLSX.readFile(RUTA, { cellDates: true });
  const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: true });
  console.log(`Total filas en el archivo: ${rows.length}${DRY_RUN ? " (DRY RUN, no se escribe nada)" : ""}`);

  const proyectoMichoacan = await prisma.proyecto.findFirstOrThrow({ where: { nombre: { startsWith: "SYM-234" } } });
  const proyectoCorporativo = await prisma.proyecto.findFirstOrThrow({ where: { nombre: { startsWith: "SYM-004 Corporativo" } } });
  const proyectoPorCodigo: Record<string, string> = {
    "SYM-234": proyectoMichoacan.id,
    "SYM-004 Corporativo": proyectoCorporativo.id,
  };

  // Duplicados ya cargados — mismo económico (tal cual en el archivo, antes
  // de corregir/anular) + SC + ODC.
  const scsArchivo = [...new Set(rows.map((r) => String(r.SC)))];
  const existentes = await prisma.gastoVehicular.findMany({
    where: { sc: { in: scsArchivo } },
    select: { numeroEconomico: true, sc: true, odc: true },
  });
  const clavesExistentes = new Set(existentes.map((e) => `${e.numeroEconomico}|${e.sc}|${e.odc}`));

  let creados = 0, omitidosDuplicado = 0, errores = 0;
  const resumenPorCategoria = new Map<string, { n: number; suma: number }>();

  for (const r of rows) {
    const ecoOriginal = eco(r);
    const claveDedupe = `${ecoOriginal}|${String(r.SC)}|${String(r.ODC)}`;
    if (clavesExistentes.has(claveDedupe)) {
      omitidosDuplicado++;
      continue;
    }

    const categoria = CATEGORIA_MAP[String(r["Categoría"]).trim()];
    const estatus = ESTATUS_MAP[String(r["ESTATUS2"]).trim()] ?? "REALIZADO";
    if (!categoria) {
      console.error("Categoría desconocida, fila omitida:", r["Categoría"], ecoOriginal);
      errores++;
      continue;
    }

    const ecoCorregido = CORRECCION_ECONOMICO[ecoOriginal] ?? ecoOriginal;
    const sinUnidad = SIN_UNIDAD[ecoOriginal];

    let numeroEconomico: string | null = null;
    let proyectoReportanteId: string | null = null;
    let historicoProyectoId: string | null = null;
    let descripcion = String(r["Descripción"] ?? "").trim() || null;

    if (sinUnidad) {
      proyectoReportanteId = proyectoPorCodigo[sinUnidad.notaProyectoCodigo];
      descripcion = sinUnidad.nota + (descripcion ?? "");
    } else {
      numeroEconomico = ecoCorregido;
      const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico: ecoCorregido }, select: { proyectoId: true } });
      if (!unidad) {
        console.error("Unidad no encontrada tras corrección, fila omitida:", ecoCorregido);
        errores++;
        continue;
      }
      // Mismo criterio que crearGasto() manual: liga al periodo de proyecto
      // vigente de la unidad, o abre uno con su proyecto actual si no existe.
      const historicoAbierto = await prisma.unidadHistoricoProyecto.findFirst({
        where: { numeroEconomico: ecoCorregido, fechaFin: null },
        orderBy: { fechaInicio: "desc" },
      });
      if (historicoAbierto) {
        historicoProyectoId = historicoAbierto.id;
      } else if (unidad.proyectoId) {
        if (!DRY_RUN) {
          const creado = await prisma.unidadHistoricoProyecto.create({ data: { numeroEconomico: ecoCorregido, proyectoId: unidad.proyectoId } });
          historicoProyectoId = creado.id;
        }
      }
    }

    const fecha = r["FECHA DE PAGO"] as Date;
    const costo = importe(r);

    if (!DRY_RUN) {
      await prisma.gastoVehicular.create({
        data: {
          numeroEconomico,
          proyectoReportanteId,
          historicoProyectoId,
          categoria,
          descripcion,
          fecha,
          fechaPago: fecha,
          costo,
          proveedor: String(r["Taller / proveedor"] ?? "").trim() || null,
          empresa: String(r["EMPRESA"] ?? "").trim() || null,
          sc: String(r.SC),
          odc: String(r.ODC),
          estatus,
        },
      });
    }
    creados++;
    const cat = String(r["Categoría"]).trim();
    const cur = resumenPorCategoria.get(cat) ?? { n: 0, suma: 0 };
    cur.n++; cur.suma += costo;
    resumenPorCategoria.set(cat, cur);
  }

  console.log(`\nCreados: ${creados} | Omitidos por duplicado: ${omitidosDuplicado} | Errores: ${errores}`);
  console.log("\nResumen por categoría:");
  let totalGeneral = 0;
  for (const [cat, v] of resumenPorCategoria) {
    console.log(` ${cat}: ${v.n} filas, ${v.suma.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}`);
    totalGeneral += v.suma;
  }
  console.log(`\nTotal cargado: ${totalGeneral.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}`);
}

main().finally(() => prisma.$disconnect());
