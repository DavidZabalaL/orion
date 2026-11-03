"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo, unidadRestringidaParaOperador } from "@/lib/proyectos-usuario";
import { auth } from "@/auth";
import { invalidarCacheBI } from "@/lib/bi/invalidar";
import { enviarNotificacionTicketRescate } from "@/lib/email";

export type ResultadoSimple = { ok: boolean; error?: string; folio?: string };

function padNum(n: number, digits: number) {
  return String(n).padStart(digits, "0");
}

async function generarFolio(): Promise<string> {
  const anio = new Date().getFullYear();
  const count = await prisma.ticketRescate.count();
  return `RSC-${anio}-${padNum(count + 1, 6)}`;
}

export async function crearTicket(formData: FormData): Promise<ResultadoSimple> {
  await exigirPermisoModulo("R", "editar");
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sin sesión." };

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "").trim();
  const motivoId = String(formData.get("motivoId") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const ubicacion = String(formData.get("ubicacion") ?? "").trim() || null;
  const prioridadManual = String(formData.get("prioridad") ?? "").trim() || null;

  if (!numeroEconomico || !motivoId) return { ok: false, error: "Unidad y motivo son obligatorios." };

  const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
  if (!unidad) return { ok: false, error: "Unidad no encontrada." };

  const [permitidos, restriccionOp] = await Promise.all([
    proyectosPermitidosParaModulo("R"),
    unidadRestringidaParaOperador(),
  ]);
  if (permitidos !== null && (!unidad.proyectoId || !permitidos.includes(unidad.proyectoId))) {
    return { ok: false, error: "No tienes permiso para reportar tickets en esta unidad." };
  }
  if (restriccionOp.esOperador && !restriccionOp.numerosEconomicos.includes(numeroEconomico)) {
    const sesionTurno = await prisma.bitacoraUsoUnidad.findFirst({
      where: { numeroEconomico, fin: null, operador: { usuario: { id: session.user.id } } },
      select: { id: true },
    });
    if (!sesionTurno) {
      return { ok: false, error: "Solo puedes reportar rescate sobre tu unidad asignada o activa en turno." };
    }
  }

  const motivo = await prisma.catalogoMotivoRescate.findUnique({ where: { id: motivoId } });
  if (!motivo) return { ok: false, error: "Motivo no encontrado." };

  // SEG fuerza prioridad URGENTE
  const prioridad = motivo.categoria === "SEGURIDAD" ? "URGENTE" : (prioridadManual ?? motivo.prioridadDefault);

  // No puede existir ticket abierto del mismo motivo para la misma unidad
  const duplicado = await prisma.ticketRescate.findFirst({
    where: {
      numeroEconomico,
      motivoId,
      estatus: { notIn: ["CERRADO", "CANCELADO", "RESUELTO"] },
    },
  });
  if (duplicado) return { ok: false, error: "Ya existe un ticket abierto para este motivo en esa unidad." };

  const folio = await generarFolio();

  const ticket = await prisma.ticketRescate.create({
    data: {
      folio,
      numeroEconomico,
      motivoId,
      descripcion,
      prioridad: prioridad as never,
      estatus: "ABIERTO",
      ubicacion,
      reportadoPorId: session.user.id,
      proyectoId: unidad.proyectoId,
    },
  });

  await prisma.historicoTicketRescate.create({
    data: {
      ticketId: ticket.id,
      estatus: "ABIERTO",
      comentario: "Ticket creado" + (descripcion ? `: ${descripcion}` : ""),
      usuarioId: session.user.id,
    },
  });

  revalidatePath("/rescate");
  invalidarCacheBI(["tickets_rescate"]);

  // El correo nunca debe tumbar la creación del ticket — se registra el
  // error y se sigue, igual que el patrón defensivo del motor de reportes BI.
  if (unidad.proyectoId) {
    try {
      const config = await prisma.configuracionNotificacionProyecto.findUnique({ where: { proyectoId: unidad.proyectoId } });
      const destinatarios = Array.isArray(config?.destinatariosRescate) ? (config.destinatariosRescate as unknown[]).filter((d): d is string => typeof d === "string") : [];
      if (destinatarios.length > 0) {
        await enviarNotificacionTicketRescate({
          destinatarios,
          folio: ticket.folio,
          numeroEconomico,
          motivo: motivo.nombre,
          prioridad,
          ubicacion,
        });
      }
    } catch (error) {
      console.error("Error al enviar notificación de ticket de rescate", error);
    }
  }

  return { ok: true, folio: ticket.folio };
}

export async function avanzarEstatus(formData: FormData): Promise<ResultadoSimple> {
  await exigirPermisoModulo("R", "editar");
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sin sesión." };

  const ticketId = String(formData.get("ticketId") ?? "");
  const nuevoEstatus = String(formData.get("nuevoEstatus") ?? "");
  const comentario = String(formData.get("comentario") ?? "").trim() || null;

  if (!ticketId || !nuevoEstatus) return { ok: false, error: "Datos incompletos." };

  const ticket = await prisma.ticketRescate.findUnique({
    where: { id: ticketId },
    include: { motivo: { select: { categoria: true } }, unidad: { select: { proyectoId: true } } },
  });
  if (!ticket) return { ok: false, error: "Ticket no encontrado." };

  const permitidos = await proyectosPermitidosParaModulo("R");
  const proyectoTicket = ticket.proyectoId ?? ticket.unidad.proyectoId;
  if (permitidos !== null && (!proyectoTicket || !permitidos.includes(proyectoTicket))) {
    return { ok: false, error: "No tienes permiso para modificar este ticket." };
  }

  // Regla: ticket SEG no puede cerrarlo quien lo reportó
  if (ticket.motivo.categoria === "SEGURIDAD" && (nuevoEstatus === "CERRADO" || nuevoEstatus === "RESUELTO") && ticket.reportadoPorId === session.user.id) {
    return { ok: false, error: "El ticket de Seguridad no puede ser cerrado por quien lo reportó." };
  }

  // Cierre y cancelación requieren comentario
  if ((nuevoEstatus === "CERRADO" || nuevoEstatus === "CANCELADO") && !comentario) {
    return { ok: false, error: "Debe ingresar un comentario para cerrar o cancelar el ticket." };
  }

  await prisma.ticketRescate.update({
    where: { id: ticketId },
    data: {
      estatus: nuevoEstatus as never,
      cerradoAt: ["CERRADO", "CANCELADO", "RESUELTO"].includes(nuevoEstatus) ? new Date() : undefined,
    },
  });

  await prisma.historicoTicketRescate.create({
    data: {
      ticketId,
      estatus: nuevoEstatus as never,
      comentario,
      usuarioId: session.user.id,
    },
  });

  revalidatePath("/rescate");
  invalidarCacheBI(["tickets_rescate"]);
  revalidatePath(`/rescate/${ticketId}`);
  return { ok: true };
}

export async function asignarTicket(formData: FormData): Promise<ResultadoSimple> {
  await exigirPermisoModulo("R", "editar");
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sin sesión." };

  const ticketId = String(formData.get("ticketId") ?? "");
  const asignadoAId = String(formData.get("asignadoAId") ?? "").trim() || null;

  if (!ticketId) return { ok: false, error: "Ticket no especificado." };

  const ticket = await prisma.ticketRescate.findUnique({
    where: { id: ticketId },
    select: { proyectoId: true, unidad: { select: { proyectoId: true } } },
  });
  if (!ticket) return { ok: false, error: "Ticket no encontrado." };

  const permitidos = await proyectosPermitidosParaModulo("R");
  const proyectoTicket = ticket.proyectoId ?? ticket.unidad.proyectoId;
  if (permitidos !== null && (!proyectoTicket || !permitidos.includes(proyectoTicket))) {
    return { ok: false, error: "No tienes permiso para asignar este ticket." };
  }

  await prisma.ticketRescate.update({
    where: { id: ticketId },
    data: { asignadoAId, estatus: "ASIGNADO" },
  });

  await prisma.historicoTicketRescate.create({
    data: {
      ticketId,
      estatus: "ASIGNADO",
      comentario: asignadoAId ? "Ticket asignado" : "Asignación removida",
      usuarioId: session.user.id,
    },
  });

  revalidatePath("/rescate");
  invalidarCacheBI(["tickets_rescate"]);
  revalidatePath(`/rescate/${ticketId}`);
  return { ok: true };
}
