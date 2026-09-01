"use server";

import { prisma } from "@/lib/prisma";
import { parsearWorkbook, type FilaMapeada, type ResultadoImportacion } from "@/lib/excel-parse";
import {
  normalizarEconomico,
  normalizarTipoVehiculo,
  normalizarTipoCombustible,
  normalizarEstatus,
  normalizarPropietario,
} from "@/lib/import-unidades";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";
import { registrarCambioDisponibilidad } from "@/lib/sla-disponibilidad";
import { registrarCambioResguardante } from "@/lib/resguardo";

export type { HojaParseada, ResultadoImportacion } from "@/lib/excel-parse";

export async function parsearExcel(formData: FormData) {
  await exigirPermisoModulo("B", "editar");
  return parsearWorkbook(formData);
}

export async function importarUnidades(
  filas: FilaMapeada[],
  proyectoIdPorDefecto: string | null
): Promise<ResultadoImportacion> {
  await exigirPermisoModulo("B", "editar");

  const resultado: ResultadoImportacion = { creadas: [], actualizadas: [], omitidas: [], advertencias: [] };

  const permitidos = await proyectosPermitidosParaModulo("B");
  const proyectos = await prisma.proyecto.findMany({ select: { id: true, nombre: true } });
  const operadores = await prisma.operador.findMany({ select: { id: true, nombre: true } });
  const proyectoPorNombre = new Map(proyectos.map((p) => [p.nombre.trim().toUpperCase(), p.id]));
  const operadorPorNombre = new Map(operadores.map((o) => [o.nombre.trim().toUpperCase(), o.id]));

  const vistosEnLote = new Set<string>();

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const numFila = i + 2; // +1 por encabezado, +1 por índice base 1

    const numeroEconomico = normalizarEconomico(fila.numeroEconomico);
    const placas = String(fila.placas ?? "").trim().toUpperCase().replace(/\s+/g, "");
    const numeroSerie = String(fila.numeroSerie ?? "").trim().toUpperCase();
    const marca = String(fila.marca ?? "").trim();
    const unidadModelo = String(fila.unidadModelo ?? "").trim();
    const anio = parseInt(String(fila.anio ?? ""), 10);

    if (!numeroEconomico || !placas || numeroSerie.length !== 17 || !marca || !unidadModelo || !anio) {
      resultado.omitidas.push({ fila: numFila, motivo: "Faltan campos obligatorios o el VIN no tiene 17 caracteres." });
      continue;
    }

    if (vistosEnLote.has(numeroEconomico)) {
      resultado.omitidas.push({ fila: numFila, motivo: `Número económico duplicado dentro del archivo: ${numeroEconomico}.` });
      continue;
    }
    vistosEnLote.add(numeroEconomico);

    const tipoVehiculo = normalizarTipoVehiculo(fila.tipoVehiculo);
    if (!tipoVehiculo.reconocido) resultado.advertencias.push({ fila: numFila, mensaje: `Tipo de vehículo "${fila.tipoVehiculo}" no reconocido, se usó "Otro".` });

    const tipoCombustible = normalizarTipoCombustible(fila.tipoCombustible);
    if (!tipoCombustible.reconocido) resultado.advertencias.push({ fila: numFila, mensaje: `Combustible "${fila.tipoCombustible}" no reconocido, se usó "Gasolina".` });

    const estatus = normalizarEstatus(fila.estatus);
    if (!estatus.reconocido) resultado.advertencias.push({ fila: numFila, mensaje: `Estatus "${fila.estatus}" no reconocido, se usó "Activo".` });

    const propietario = normalizarPropietario(fila.propietario);

    let proyectoId: string | null = proyectoIdPorDefecto;
    const nombreProyecto = String(fila.proyecto ?? "").trim();
    if (nombreProyecto) {
      const encontrado = proyectoPorNombre.get(nombreProyecto.toUpperCase());
      if (encontrado) proyectoId = encontrado;
      else resultado.advertencias.push({ fila: numFila, mensaje: `Proyecto "${nombreProyecto}" no existe; la unidad quedará sin proyecto asignado.` });
    }

    if (permitidos !== null && proyectoId && !permitidos.includes(proyectoId)) {
      resultado.omitidas.push({ fila: numFila, motivo: `No tienes permiso para asignar el proyecto "${nombreProyecto || "por defecto"}".` });
      continue;
    }

    let resguardanteId: string | null = null;
    const nombreResguardante = String(fila.resguardante ?? "").trim();
    if (nombreResguardante) {
      const encontrado = operadorPorNombre.get(nombreResguardante.toUpperCase());
      if (encontrado) resguardanteId = encontrado;
      else resultado.advertencias.push({ fila: numFila, mensaje: `Operador "${nombreResguardante}" no existe; no se asignó resguardante.` });
    }

    const data = {
      placas,
      numeroSerie,
      marca,
      unidadModelo,
      anio,
      tipoVehiculo: tipoVehiculo.valor as never,
      tipoCombustible: tipoCombustible.valor as never,
      rendimientoPromedio: fila.rendimientoPromedio ? parseFloat(fila.rendimientoPromedio) : null,
      kmOficial: fila.kmOficial ? parseInt(fila.kmOficial, 10) : 0,
      capacidadTanqueLitros: fila.capacidadTanqueLitros ? parseFloat(fila.capacidadTanqueLitros) : null,
      proyectoId,
      estatus: estatus.valor as never,
      disponibilidad: estatus.valor === "ACTIVO",
      resguardanteId,
      propietario: propietario.valor as never,
      origenPlaca: String(fila.origenPlaca ?? "").trim(),
      tagIave: String(fila.tagIave ?? "").trim() || null,
      numeroTarjetaCombustible: String(fila.numeroTarjetaCombustible ?? "").trim() || null,
    };

    try {
      const existente = await prisma.unidad.findUnique({ where: { numeroEconomico } });
      if (existente && permitidos !== null && (!existente.proyectoId || !permitidos.includes(existente.proyectoId))) {
        resultado.omitidas.push({ fila: numFila, motivo: `No tienes permiso para modificar la unidad "${numeroEconomico}".` });
        continue;
      }
      if (existente) {
        await prisma.unidad.update({ where: { numeroEconomico }, data });
        if (existente.disponibilidad !== data.disponibilidad) {
          await registrarCambioDisponibilidad(numeroEconomico, data.disponibilidad);
        }
        if (existente.resguardanteId !== resguardanteId) {
          await registrarCambioResguardante(numeroEconomico, resguardanteId, undefined, "Actualización por importación");
        }
        resultado.actualizadas.push(numeroEconomico);
      } else {
        await prisma.unidad.create({ data: { numeroEconomico, ...data } });
        await registrarCambioDisponibilidad(numeroEconomico, data.disponibilidad);
        await registrarCambioResguardante(numeroEconomico, resguardanteId, undefined, "Alta por importación");
        resultado.creadas.push(numeroEconomico);
      }
    } catch (e) {
      resultado.omitidas.push({ fila: numFila, motivo: e instanceof Error ? e.message : "Error desconocido al guardar." });
    }
  }

  if (resultado.creadas.length > 0 || resultado.actualizadas.length > 0) invalidarCacheBI(["unidades"]);

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "vehiculos",
      accion: "import",
      entidad: "Unidad",
      detalle: { creadas: resultado.creadas.length, actualizadas: resultado.actualizadas.length, omitidas: resultado.omitidas.length },
    });
  }

  return resultado;
}
