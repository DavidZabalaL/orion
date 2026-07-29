"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { puedeCargarPresupuesto, exigirPermisoModulo } from "@/lib/permisos";
import { parsearExcelPresupuesto, resolverCategoria, resolverProyecto, type FilaPresupuestoExcel } from "@/lib/import-presupuesto";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";

export type GrupoProyectoDetectado = { alias: string; proyectoIdSugerido: string | null; nombreSugerido: string | null };
export type GrupoPartidaDetectado = { texto: string; categoriaSugerida: string | null };

export type PrevisualizacionPresupuesto = {
  archivoNombre: string;
  anio: number;
  filas: FilaPresupuestoExcel[];
  proyectosDetectados: GrupoProyectoDetectado[];
  partidasDetectadas: GrupoPartidaDetectado[];
  proyectosDisponibles: { id: string; nombre: string }[];
};

export async function previsualizarCargaPresupuesto(formData: FormData): Promise<PrevisualizacionPresupuesto> {
  await exigirPermisoModulo("H", "editar");
  if (!(await puedeCargarPresupuesto())) {
    throw new Error("No tienes permiso para cargar presupuesto.");
  }

  const archivo = formData.get("archivo");
  const anio = parseInt(String(formData.get("anio") ?? ""), 10);
  const filas = await parsearExcelPresupuesto(formData);

  const proyectos = await prisma.proyecto.findMany({
    where: { estatus: "ACTIVO" },
    select: { id: true, nombre: true, estadoRepublica: true },
    orderBy: { nombre: "asc" },
  });

  const aliasUnicos = Array.from(new Set(filas.map((f) => f.proyectoExcel)));
  const proyectosDetectados: GrupoProyectoDetectado[] = aliasUnicos.map((alias) => {
    const proyectoId = resolverProyecto(alias, proyectos);
    const proyecto = proyectos.find((p) => p.id === proyectoId);
    return { alias, proyectoIdSugerido: proyectoId, nombreSugerido: proyecto?.nombre ?? null };
  });

  const partidasUnicas = Array.from(new Set(filas.map((f) => f.partidaExcel)));
  const partidasDetectadas: GrupoPartidaDetectado[] = partidasUnicas.map((texto) => ({
    texto,
    categoriaSugerida: resolverCategoria(texto),
  }));

  return {
    archivoNombre: archivo instanceof File ? archivo.name : "archivo",
    anio,
    filas,
    proyectosDetectados,
    partidasDetectadas,
    proyectosDisponibles: proyectos.map((p) => ({ id: p.id, nombre: p.nombre })),
  };
}

export type ResultadoImportacionPresupuesto = {
  creadas: number;
  actualizadas: number;
  sinCambio: number;
  omitidas: { motivo: string; cantidad: number }[];
};

export async function confirmarCargaPresupuesto(
  filas: FilaPresupuestoExcel[],
  proyectoPorAlias: Record<string, string>,
  categoriaPorTexto: Record<string, string>,
  archivoNombre: string
): Promise<ResultadoImportacionPresupuesto> {
  await exigirPermisoModulo("H", "editar");
  if (!(await puedeCargarPresupuesto())) {
    throw new Error("No tienes permiso para cargar presupuesto.");
  }

  const session = await auth();
  const usuarioId = session?.user?.id;
  if (!usuarioId) throw new Error("Sesión inválida.");

  const resultado: ResultadoImportacionPresupuesto = { creadas: 0, actualizadas: 0, sinCambio: 0, omitidas: [] };
  const motivosOmitidas = new Map<string, number>();
  const proyectosAfectados = new Set<string>();

  for (const fila of filas) {
    const proyectoId = proyectoPorAlias[fila.proyectoExcel];
    const categoria = categoriaPorTexto[fila.partidaExcel];

    if (!proyectoId) {
      motivosOmitidas.set("Proyecto no resuelto", (motivosOmitidas.get("Proyecto no resuelto") ?? 0) + 1);
      continue;
    }
    if (!categoria || !(categoria in CATEGORIA_GASTO_LABEL)) {
      motivosOmitidas.set("Partida no reconocida", (motivosOmitidas.get("Partida no reconocida") ?? 0) + 1);
      continue;
    }

    const existente = await prisma.presupuestoPartida.findUnique({
      where: { proyectoId_categoria_anio_mes: { proyectoId, categoria: categoria as never, anio: fila.anio, mes: fila.mes } },
    });

    proyectosAfectados.add(proyectoId);

    if (!existente) {
      const creado = await prisma.presupuestoPartida.create({
        data: {
          proyectoId,
          categoria: categoria as never,
          anio: fila.anio,
          mes: fila.mes,
          montoPresupuestado: fila.monto,
          origen: "IMPORTADO_EXCEL",
          archivoOrigenNombre: archivoNombre,
          version: 1,
          cargadoPorId: usuarioId,
        },
      });
      await prisma.bitacoraCambio.create({
        data: {
          entidad: "PresupuestoPartida",
          entidadId: creado.id,
          usuarioId,
          accion: "CREAR",
          valoresNuevos: { proyectoId, categoria, anio: fila.anio, mes: fila.mes, montoPresupuestado: fila.monto, version: 1 },
        },
      });
      resultado.creadas++;
      continue;
    }

    const montoAnterior = Number(existente.montoPresupuestado);
    if (montoAnterior === fila.monto) {
      resultado.sinCambio++;
      continue;
    }

    const versionNueva = existente.version + 1;
    await prisma.presupuestoPartida.update({
      where: { id: existente.id },
      data: {
        montoPresupuestado: fila.monto,
        origen: "IMPORTADO_EXCEL",
        archivoOrigenNombre: archivoNombre,
        version: versionNueva,
        cargadoPorId: usuarioId,
      },
    });
    await prisma.bitacoraCambio.create({
      data: {
        entidad: "PresupuestoPartida",
        entidadId: existente.id,
        usuarioId,
        accion: "EDITAR",
        valoresAnteriores: { montoPresupuestado: montoAnterior, version: existente.version },
        valoresNuevos: { montoPresupuestado: fila.monto, version: versionNueva },
      },
    });
    resultado.actualizadas++;
  }

  resultado.omitidas = Array.from(motivosOmitidas.entries()).map(([motivo, cantidad]) => ({ motivo, cantidad }));

  for (const proyectoId of proyectosAfectados) {
    revalidatePath(`/proyectos/${proyectoId}/presupuesto`);
  }

  return resultado;
}
