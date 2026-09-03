import { Resend } from "resend";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const EMAIL_FROM_DEFAULT = "Orión <orion@grupokabat.com>";

// Envío vía Resend, no SMTP: Office 365 empezó a rechazar en la entrega final
// (no en la autenticación) los correos mandados por SMTP AUTH básico desde un
// remitente @grupokabat.com hacia otro buzón del mismo tenant — una política
// de "Direct Send"/anti-spoofing que Microsoft ha ido endureciendo, ajena por
// completo al código. Resend evita el problema por diseño: envía desde su
// propia infraestructura con DKIM/SPF del dominio verificado, sin pasar por
// el flujo de correo de Office 365 en absoluto.
type MensajeCorreo = {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
};

function obtenerResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

async function enviarConReintento(mensaje: MensajeCorreo, intentos = 3) {
  const resend = obtenerResend();
  if (!resend) throw new Error("RESEND_API_KEY no configurado.");

  for (let intento = 1; intento <= intentos; intento++) {
    const { error } = await resend.emails.send({
      from: mensaje.from,
      to: mensaje.to,
      subject: mensaje.subject,
      html: mensaje.html,
      attachments: mensaje.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    if (!error) return;
    // Errores de configuración (dominio no verificado, API key inválida, etc.)
    // no se resuelven reintentando — solo se reintenta ante fallas transitorias.
    if (error.name === "validation_error" || error.name === "missing_api_key" || error.name === "invalid_api_key" || intento === intentos) {
      throw new Error(error.message);
    }
    await new Promise((resolve) => setTimeout(resolve, intento * 1000));
  }
}

function plantillaInvitacion({ nombre, rol, loginUrl }: { nombre: string; rol: string; loginUrl: string }) {
  return `
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0; padding:0; background:#f4f6f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background:#0b1a30; border-radius:16px; overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 24px 32px; text-align:center;">
                <div style="font-family:Georgia,serif; font-size:28px; font-weight:800; color:#ffffff; letter-spacing:0.5px;">Orión</div>
                <div style="font-size:13px; color:rgba(255,255,255,0.55); margin-top:4px;">Control Vehicular · Grupo Kabat</div>
              </td>
            </tr>
          </table>

          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background:#ffffff; border-radius:16px; margin-top:16px; box-shadow:0 8px 32px rgba(15,40,120,0.08);">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 8px 0; font-size:20px; color:#0f1b2d;">Hola${nombre ? `, ${nombre}` : ""} 👋</h1>
                <p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#334155;">
                  Se te dio de alta en <strong>Orión</strong>, la plataforma de administración de flota vehicular de Grupo Kabat, con el rol de <strong>${rol}</strong>.
                </p>
                <p style="margin:0 0 24px 0; font-size:14px; line-height:1.6; color:#334155;">
                  Para entrar, da clic en el botón de abajo e inicia sesión con tu cuenta de Microsoft corporativa — no necesitas crear una contraseña nueva.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px; background:#2b7fff;">
                      <a href="${loginUrl}" style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">
                        Entrar a Orión
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0; font-size:12px; line-height:1.5; color:#94a3b8;">
                  Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
                  <a href="${loginUrl}" style="color:#2b7fff;">${loginUrl}</a>
                </p>
              </td>
            </tr>
          </table>

          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%;">
            <tr>
              <td style="padding:20px 8px; text-align:center; font-size:11px; color:#94a3b8;">
                Plataforma interna — acceso restringido al equipo de Grupo Kabat.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function plantillaInvitacionOperador({ nombre, aceptarUrl }: { nombre: string; aceptarUrl: string }) {
  return `
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0; padding:0; background:#f4f6f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background:#0b1a30; border-radius:16px; overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 24px 32px; text-align:center;">
                <div style="font-family:Georgia,serif; font-size:28px; font-weight:800; color:#ffffff; letter-spacing:0.5px;">Orión</div>
                <div style="font-size:13px; color:rgba(255,255,255,0.55); margin-top:4px;">Control Vehicular · Grupo Kabat</div>
              </td>
            </tr>
          </table>

          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background:#ffffff; border-radius:16px; margin-top:16px; box-shadow:0 8px 32px rgba(15,40,120,0.08);">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 8px 0; font-size:20px; color:#0f1b2d;">Hola${nombre ? `, ${nombre}` : ""} 👋</h1>
                <p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#334155;">
                  Se te dio de alta en <strong>Orión</strong>, la plataforma de administración de flota vehicular de Grupo Kabat, con acceso de <strong>Operador</strong>.
                </p>
                <p style="margin:0 0 24px 0; font-size:14px; line-height:1.6; color:#334155;">
                  Como no tienes correo institucional, da clic en el botón de abajo para crear tu contraseña de acceso. El enlace es de un solo uso y expira en 7 días.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px; background:#2b7fff;">
                      <a href="${aceptarUrl}" style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">
                        Crear mi contraseña
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0; font-size:12px; line-height:1.5; color:#94a3b8;">
                  Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
                  <a href="${aceptarUrl}" style="color:#2b7fff;">${aceptarUrl}</a>
                </p>
              </td>
            </tr>
          </table>

          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%;">
            <tr>
              <td style="padding:20px 8px; text-align:center; font-size:11px; color:#94a3b8;">
                Plataforma interna — acceso restringido al equipo de Grupo Kabat.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export type ResultadoEnvioCorreo = { enviado: boolean; error?: string };

export async function enviarReporteBI({
  destinatarios,
  nombreReporte,
  buffer,
  nombreArchivo,
  mime,
}: {
  destinatarios: string[];
  nombreReporte: string;
  buffer: Buffer;
  nombreArchivo: string;
  mime: string;
}): Promise<ResultadoEnvioCorreo> {
  if (!process.env.RESEND_API_KEY) {
    return { enviado: false, error: "RESEND_API_KEY no configurado." };
  }
  if (destinatarios.length === 0) return { enviado: false, error: "Sin destinatarios." };

  try {
    await enviarConReintento({
      from: process.env.EMAIL_FROM ?? EMAIL_FROM_DEFAULT,
      to: destinatarios.join(","),
      subject: `Reporte programado — ${nombreReporte}`,
      html: `<p style="font-family:sans-serif;font-size:14px;color:#334155;">Adjunto el reporte <strong>${nombreReporte}</strong>, generado automáticamente por Orión.</p>`,
      attachments: [{ filename: nombreArchivo, content: buffer, contentType: mime }],
    });
    return { enviado: true };
  } catch (e) {
    return { enviado: false, error: e instanceof Error ? e.message : "Error desconocido al enviar el correo." };
  }
}

const PRIORIDAD_RESCATE_LABEL: Record<string, string> = { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", URGENTE: "Urgente" };

export async function enviarNotificacionTicketRescate({
  destinatarios,
  folio,
  numeroEconomico,
  motivo,
  prioridad,
  ubicacion,
}: {
  destinatarios: string[];
  folio: string;
  numeroEconomico: string;
  motivo: string;
  prioridad: string;
  ubicacion?: string | null;
}): Promise<ResultadoEnvioCorreo> {
  if (!process.env.RESEND_API_KEY) {
    return { enviado: false, error: "RESEND_API_KEY no configurado." };
  }
  if (destinatarios.length === 0) return { enviado: false, error: "Sin destinatarios." };

  const prioridadLabel = PRIORIDAD_RESCATE_LABEL[prioridad] ?? prioridad;
  const urlTicket = `${SITE_URL}/rescate`;

  try {
    await enviarConReintento({
      from: process.env.EMAIL_FROM ?? EMAIL_FROM_DEFAULT,
      to: destinatarios.join(","),
      subject: `Nuevo ticket de rescate ${folio} — ${numeroEconomico} (${prioridadLabel})`,
      html: `
        <div style="font-family:sans-serif;font-size:14px;color:#334155;">
          <p>Se creó un nuevo ticket de rescate:</p>
          <ul>
            <li><strong>Folio:</strong> ${folio}</li>
            <li><strong>Unidad:</strong> ${numeroEconomico}</li>
            <li><strong>Motivo:</strong> ${motivo}</li>
            <li><strong>Prioridad:</strong> ${prioridadLabel}</li>
            ${ubicacion ? `<li><strong>Ubicación:</strong> ${ubicacion}</li>` : ""}
          </ul>
          <p><a href="${urlTicket}">Ver en Orión</a></p>
        </div>
      `,
    });
    return { enviado: true };
  } catch (e) {
    return { enviado: false, error: e instanceof Error ? e.message : "Error desconocido al enviar el correo." };
  }
}

/**
 * Checklist "Reporte de falla de vehículo" (ver src/lib/checklist-reporte-falla.ts):
 * notifica de inmediato, sin pasar por el motor de umbrales configurables, al
 * Gerente administrativo del proyecto de la unidad — el destinatario se
 * resuelve dinámicamente por rol + asignación de proyecto, no de una lista
 * configurada a mano (a diferencia del ticket de rescate de arriba).
 */
export async function enviarNotificacionReporteFalla({
  destinatarios,
  numeroEconomico,
  tipoFalla,
  departamento,
  descripcion,
}: {
  destinatarios: string[];
  numeroEconomico: string;
  tipoFalla: string;
  departamento: string;
  descripcion?: string | null;
}): Promise<ResultadoEnvioCorreo> {
  if (!process.env.RESEND_API_KEY) {
    return { enviado: false, error: "RESEND_API_KEY no configurado." };
  }
  if (destinatarios.length === 0) return { enviado: false, error: "Sin destinatarios." };

  const urlUnidad = `${SITE_URL}/unidades/${numeroEconomico}`;

  try {
    await enviarConReintento({
      from: process.env.EMAIL_FROM ?? EMAIL_FROM_DEFAULT,
      to: destinatarios.join(","),
      subject: `Reporte de falla — ${numeroEconomico} (${tipoFalla})`,
      html: `
        <div style="font-family:sans-serif;font-size:14px;color:#334155;">
          <p>Se reportó una falla de vehículo:</p>
          <ul>
            <li><strong>Unidad:</strong> ${numeroEconomico}</li>
            <li><strong>Tipo de falla:</strong> ${tipoFalla}</li>
            <li><strong>Departamento:</strong> ${departamento}</li>
            ${descripcion ? `<li><strong>Descripción:</strong> ${descripcion}</li>` : ""}
          </ul>
          <p><a href="${urlUnidad}">Ver la unidad en Orión</a></p>
        </div>
      `,
    });
    return { enviado: true };
  } catch (e) {
    return { enviado: false, error: e instanceof Error ? e.message : "Error desconocido al enviar el correo." };
  }
}

function plantillaRecuperacionContrasena({ nombre, aceptarUrl }: { nombre: string; aceptarUrl: string }) {
  return `
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0; padding:0; background:#f4f6f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background:#0b1a30; border-radius:16px; overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 24px 32px; text-align:center;">
                <div style="font-family:Georgia,serif; font-size:28px; font-weight:800; color:#ffffff; letter-spacing:0.5px;">Orión</div>
                <div style="font-size:13px; color:rgba(255,255,255,0.55); margin-top:4px;">Control Vehicular · Grupo Kabat</div>
              </td>
            </tr>
          </table>

          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background:#ffffff; border-radius:16px; margin-top:16px; box-shadow:0 8px 32px rgba(15,40,120,0.08);">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 8px 0; font-size:20px; color:#0f1b2d;">Hola${nombre ? `, ${nombre}` : ""}</h1>
                <p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#334155;">
                  Solicitaste restablecer tu contraseña de <strong>Orión</strong>. Da clic en el botón de abajo para crear una nueva. El enlace es de un solo uso y expira en 7 días.
                </p>
                <p style="margin:0 0 24px 0; font-size:14px; line-height:1.6; color:#334155;">
                  Si tú no lo solicitaste, puedes ignorar este correo — tu contraseña actual sigue funcionando.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px; background:#2b7fff;">
                      <a href="${aceptarUrl}" style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">
                        Crear nueva contraseña
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0; font-size:12px; line-height:1.5; color:#94a3b8;">
                  Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
                  <a href="${aceptarUrl}" style="color:#2b7fff;">${aceptarUrl}</a>
                </p>
              </td>
            </tr>
          </table>

          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%;">
            <tr>
              <td style="padding:20px 8px; text-align:center; font-size:11px; color:#94a3b8;">
                Plataforma interna — acceso restringido al equipo de Grupo Kabat.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function enviarRecuperacionContrasena({
  correo,
  nombre,
  token,
}: {
  correo: string;
  nombre: string;
  token: string;
}): Promise<ResultadoEnvioCorreo> {
  if (!process.env.RESEND_API_KEY) {
    return { enviado: false, error: "RESEND_API_KEY no configurado." };
  }

  const aceptarUrl = `${SITE_URL}/invitacion/${token}`;

  try {
    await enviarConReintento({
      from: process.env.EMAIL_FROM ?? EMAIL_FROM_DEFAULT,
      to: correo,
      subject: "Restablece tu contraseña — Orión",
      html: plantillaRecuperacionContrasena({ nombre, aceptarUrl }),
    });
    return { enviado: true };
  } catch (e) {
    return { enviado: false, error: e instanceof Error ? e.message : "Error desconocido al enviar el correo." };
  }
}

export async function enviarInvitacionOperador({
  correo,
  nombre,
  token,
}: {
  correo: string;
  nombre: string;
  token: string;
}): Promise<ResultadoEnvioCorreo> {
  if (!process.env.RESEND_API_KEY) {
    return { enviado: false, error: "RESEND_API_KEY no configurado." };
  }

  const aceptarUrl = `${SITE_URL}/invitacion/${token}`;

  try {
    await enviarConReintento({
      from: process.env.EMAIL_FROM ?? EMAIL_FROM_DEFAULT,
      to: correo,
      subject: "Te invitaron a Orión — Control Vehicular",
      html: plantillaInvitacionOperador({ nombre, aceptarUrl }),
    });
    return { enviado: true };
  } catch (e) {
    return { enviado: false, error: e instanceof Error ? e.message : "Error desconocido al enviar el correo." };
  }
}

export async function enviarInvitacion({
  correo,
  nombre,
  rol,
}: {
  correo: string;
  nombre: string;
  rol: string;
}): Promise<ResultadoEnvioCorreo> {
  if (!process.env.RESEND_API_KEY) {
    return { enviado: false, error: "RESEND_API_KEY no configurado." };
  }

  const loginUrl = `${SITE_URL}/iniciar-sesion`;

  try {
    await enviarConReintento({
      from: process.env.EMAIL_FROM ?? EMAIL_FROM_DEFAULT,
      to: correo,
      subject: "Te invitaron a Orión — Control Vehicular",
      html: plantillaInvitacion({ nombre, rol, loginUrl }),
    });
    return { enviado: true };
  } catch (e) {
    return { enviado: false, error: e instanceof Error ? e.message : "Error desconocido al enviar el correo." };
  }
}
