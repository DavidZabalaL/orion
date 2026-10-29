"use server";

import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import type { SearchParamsFiltros } from "@/lib/filtros-gasto";
import { cargarConciliacionCombustible } from "@/lib/conciliacion-combustible-datos";
import { hojaConciliacion } from "@/lib/conciliacion-combustible";
import { generarExcelBuffer } from "@/lib/exportar-excel";
import { enviarChecklistsExcel } from "@/lib/email";

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Envía por correo el mismo Excel que la descarga, con los filtros que tenga la vista. */
export async function enviarConciliacionPorCorreo(input: { filtros: SearchParamsFiltros; destinatarios: string[] }): Promise<{ ok: true } | { ok: false; error: string }> {
  await exigirPermisoModulo("D");

  const destinatarios = input.destinatarios.map((d) => d.trim()).filter(Boolean);
  if (destinatarios.length === 0) return { ok: false, error: "Agrega al menos un destinatario." };
  const invalidos = destinatarios.filter((d) => !REGEX_EMAIL.test(d));
  if (invalidos.length > 0) return { ok: false, error: `Correo(s) inválido(s): ${invalidos.join(", ")}` };

  const { filas, filtros } = await cargarConciliacionCombustible(input.filtros, await proyectosPermitidosParaModulo("D"));
  if (filas.length === 0) return { ok: false, error: "No hay cargas para los filtros elegidos." };

  const resultado = await enviarChecklistsExcel({
    destinatarios,
    buffer: generarExcelBuffer([hojaConciliacion(filas)]),
    nombreArchivo: `conciliacion-combustible-${filtros.desde}_${filtros.hasta}.xlsx`,
    resumen: `la conciliación de cargas de combustible del ${filtros.desde} al ${filtros.hasta} (${filas.length} registros)`,
    asunto: "Orión — Conciliación de cargas de combustible",
  });
  return resultado.enviado ? { ok: true } : { ok: false, error: resultado.error ?? "No se pudo enviar el correo." };
}
