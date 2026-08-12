import nodemailer from "nodemailer";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function crearTransporte() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.office365.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
    },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  });
}

async function enviarConReintento(mensaje: Parameters<ReturnType<typeof crearTransporte>["sendMail"]>[0], intentos = 3) {
  const transporte = crearTransporte();
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      return await transporte.sendMail(mensaje);
    } catch (e) {
      const codigo = (e as { code?: string; responseCode?: number })?.code;
      const esErrorAuth = codigo === "EAUTH" || (e as { responseCode?: number })?.responseCode === 535;
      if (esErrorAuth || intento === intentos) throw e;
      await new Promise((resolve) => setTimeout(resolve, intento * 1000));
    }
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

export type ResultadoEnvioCorreo = { enviado: boolean; error?: string };

export async function enviarInvitacion({
  correo,
  nombre,
  rol,
}: {
  correo: string;
  nombre: string;
  rol: string;
}): Promise<ResultadoEnvioCorreo> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { enviado: false, error: "SMTP_USER/SMTP_PASS no configurados." };
  }

  const loginUrl = `${SITE_URL}/iniciar-sesion`;

  try {
    await enviarConReintento({
      from: process.env.EMAIL_FROM ?? `Orión <${process.env.SMTP_USER}>`,
      to: correo,
      subject: "Te invitaron a Orión — Control Vehicular",
      html: plantillaInvitacion({ nombre, rol, loginUrl }),
    });
    return { enviado: true };
  } catch (e) {
    return { enviado: false, error: e instanceof Error ? e.message : "Error desconocido al enviar el correo." };
  }
}
