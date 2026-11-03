"use server";

import { auth } from "@/auth";
import { exigirPermisoModulo } from "@/lib/permisos";
import { consumirCuotaUsuario } from "@/lib/limite-intentos";
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
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sesión inválida." };

  const destinatarios = input.destinatarios.map((d) => d.trim()).filter(Boolean);
  if (destinatarios.length === 0) return { ok: false, error: "Agrega al menos un destinatario." };
  if (destinatarios.length > 20) return { ok: false, error: "Máximo 20 destinatarios por envío." };
  const invalidos = destinatarios.filter((d) => !REGEX_EMAIL.test(d));
  if (invalidos.length > 0) return { ok: false, error: `Correo(s) inválido(s): ${invalidos.join(", ")}` };

  if (!(await consumirCuotaUsuario("envio_correo", session.user.id, 5, 60_000))) {
    return { ok: false, error: "Has enviado demasiados correos en poco tiempo. Espera un minuto e inténtalo de nuevo." };
  }

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
