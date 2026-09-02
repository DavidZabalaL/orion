import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { logActivity } from "@/lib/activity";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      authorization: { params: { prompt: "select_account" } },
    }),
    Credentials({
      credentials: { username: {}, password: {} },
      async authorize(credentials) {
        const username = (credentials.username as string | undefined)?.trim();
        const pass = credentials.password as string | undefined;
        if (!username || !pass) return null;
        const validUser = process.env.PREVIEW_LOGIN_USER;
        const validPass = process.env.PREVIEW_LOGIN_PASS;
        // Sin las variables de entorno configuradas, siempre falla
        if (!validUser || !validPass) return null;
        if (username !== validUser || pass !== validPass) return null;
        const correo = process.env.PREVIEW_LOGIN_EMAIL?.toLowerCase();
        const usuario = correo
          ? await prisma.usuario.findFirst({ where: { correo, estatus: { not: "DESACTIVADO" } } })
          : await prisma.usuario.findFirst({ where: { estatus: "ACTIVO" } });
        if (!usuario) return null;
        return { id: usuario.id, email: usuario.correo, name: usuario.nombre };
      },
    }),
    // Ingreso para Operadores sin correo institucional: correo (personal) +
    // contraseña propia, definida al aceptar la invitación en
    // /invitacion/[token] (ver src/app/invitacion/actions.ts). Independiente
    // del backdoor PREVIEW_LOGIN de arriba — valida contra el Usuario real.
    Credentials({
      id: "operador-credenciales",
      name: "Operador",
      credentials: { correo: {}, password: {} },
      async authorize(credentials) {
        const correo = (credentials.correo as string | undefined)?.trim().toLowerCase();
        const password = credentials.password as string | undefined;
        if (!correo || !password) return null;

        const usuario = await prisma.usuario.findUnique({ where: { correo } });
        if (!usuario || usuario.estatus !== "ACTIVO") return null;
        if (usuario.metodoAcceso !== "CORREO_PASSWORD" || !usuario.passwordHash) return null;

        const valido = await compare(password, usuario.passwordHash);
        if (!valido) return null;

        return { id: usuario.id, email: usuario.correo, name: usuario.nombre };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.email) return false;

      // Blindado: si la base de datos falla de forma pasajera aquí (ej. hiccup
      // de conexión con Neon), sin este try/catch el login entero truena y
      // NextAuth muestra su pantalla genérica "Server error — problema con la
      // configuración del servidor", que no dice nada útil ni al usuario ni en
      // los logs. Con el catch, el usuario ve un mensaje claro y puede
      // reintentar de inmediato en vez de pensar que su cuenta está mal.
      try {
        const usuario = await prisma.usuario.findUnique({ where: { correo: user.email.toLowerCase() } });
        if (!usuario || usuario.estatus === "DESACTIVADO") return "/iniciar-sesion?error=SinAcceso";

        if (usuario.estatus === "INVITADO") {
          await prisma.usuario.update({ where: { id: usuario.id }, data: { estatus: "ACTIVO" } });
        }
        return true;
      } catch (error) {
        console.error("signIn: fallo de base de datos", error);
        return "/iniciar-sesion?error=ErrorTemporal";
      }
    },
    async jwt({ token, user }) {
      // En el sign-in inicial (o si el token aún no trae usuarioId) se resuelve
      // el correo a un Usuario. El nombre/rol NO se guardan aquí: se resuelven
      // frescos en el callback de session en cada request, para que un cambio
      // de rol o una reasignación se reflejen sin pedir reingresar sesión.
      if (user?.email) {
        try {
          const usuario = await prisma.usuario.findUnique({ where: { correo: user.email.toLowerCase() } });
          if (usuario) {
            token.usuarioId = usuario.id;
            // Un inicio de sesión explícito "cumple" cualquier cierre de sesión forzado
            // pendiente (Analítica de Uso y Trazabilidad) — se limpia para que el
            // indicador no quede mostrándose para siempre tras volver a entrar.
            if (usuario.sesionInvalidadaEn) {
              await prisma.usuario.update({ where: { id: usuario.id }, data: { sesionInvalidadaEn: null } });
            }
          }
        } catch (error) {
          // No se propaga: un fallo pasajero de BD aquí no debe tumbar el login
          // ya aprobado en signIn(). El token queda sin usuarioId por esta vez;
          // session() lo tratará como sesión sin permisos (falla segura), y la
          // siguiente petición vuelve a intentar resolverlo si el JWT se renueva.
          console.error("jwt: fallo de base de datos", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const usuarioId = (token.usuarioId as string) ?? "";
        session.user.id = usuarioId;
        session.user.rol = null;

        if (usuarioId) {
          try {
            const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, include: { rol: true } });

            // Sesión forzada a cerrar desde el panel de Analítica de Uso y Trazabilidad:
            // cualquier JWT emitido antes de `sesionInvalidadaEn` deja de ser válido. Se
            // vacía `session.user.id` — AppGroupLayout redirige a /iniciar-sesion cuando
            // lo detecta, sin afectar el estatus real de la cuenta (a diferencia de
            // desactivarla, aquí un nuevo inicio de sesión vuelve a funcionar de inmediato).
            const invalidada = usuario?.sesionInvalidadaEn && typeof token.iat === "number" && usuario.sesionInvalidadaEn.getTime() / 1000 > token.iat;

            if (invalidada) {
              session.user.id = "";
            } else if (usuario && usuario.estatus !== "DESACTIVADO") {
              session.user.name = usuario.nombre;
              session.user.rol = usuario.rol.nombre;
            }
          } catch (error) {
            // Falla segura: si la BD falla aquí, se trata como sesión sin id/rol
            // (sin permisos) en vez de tumbar la petición completa con un 500.
            console.error("session: fallo de base de datos", error);
            session.user.id = "";
          }
        }
      }
      return session;
    },
  },
  events: {
    // Efectos secundarios de solo registro (no de autorización) — separados de
    // `callbacks` a propósito, para la Analítica de Uso y Trazabilidad (ActivityLog).
    async signIn({ user }) {
      if (!user.email) return;
      try {
        const usuario = await prisma.usuario.findUnique({ where: { correo: user.email.toLowerCase() } });
        if (usuario) await logActivity({ userId: usuario.id, modulo: "auth", accion: "login" });
      } catch (error) {
        // Solo registro de auditoría — nunca debe tumbar un login ya aprobado.
        console.error("events.signIn: fallo de base de datos", error);
      }
    },
    async signOut(message) {
      const usuarioId = "token" in message ? (message.token?.usuarioId as string | undefined) : undefined;
      if (usuarioId) await logActivity({ userId: usuarioId, modulo: "auth", accion: "logout" });
    },
  },
});
