import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
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
    // Solo activo en preview/staging — nunca en producción
    ...(process.env.PREVIEW_LOGIN_ENABLED === "true"
      ? [
          Credentials({
            credentials: { email: {}, password: {} },
            async authorize(credentials) {
              const email = (credentials.email as string | undefined)?.toLowerCase().trim();
              const pass = credentials.password as string | undefined;
              if (!email || !pass) return null;
              if (email !== process.env.PREVIEW_LOGIN_EMAIL?.toLowerCase() || pass !== process.env.PREVIEW_LOGIN_PASS) return null;
              const usuario = await prisma.usuario.findUnique({ where: { correo: email } });
              if (!usuario || usuario.estatus === "DESACTIVADO") return null;
              return { id: usuario.id, email: usuario.correo, name: usuario.nombre };
            },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.email) return false;

      const usuario = await prisma.usuario.findUnique({ where: { correo: user.email.toLowerCase() } });
      if (!usuario || usuario.estatus === "DESACTIVADO") return "/iniciar-sesion?error=SinAcceso";

      if (usuario.estatus === "INVITADO") {
        await prisma.usuario.update({ where: { id: usuario.id }, data: { estatus: "ACTIVO" } });
      }
      return true;
    },
    async jwt({ token, user }) {
      // En el sign-in inicial (o si el token aún no trae usuarioId) se resuelve
      // el correo a un Usuario. El nombre/rol NO se guardan aquí: se resuelven
      // frescos en el callback de session en cada request, para que un cambio
      // de rol o una reasignación se reflejen sin pedir reingresar sesión.
      if (user?.email) {
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const usuarioId = (token.usuarioId as string) ?? "";
        session.user.id = usuarioId;
        session.user.rol = null;

        if (usuarioId) {
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
      const usuario = await prisma.usuario.findUnique({ where: { correo: user.email.toLowerCase() } });
      if (usuario) await logActivity({ userId: usuario.id, modulo: "auth", accion: "login" });
    },
    async signOut(message) {
      const usuarioId = "token" in message ? (message.token?.usuarioId as string | undefined) : undefined;
      if (usuarioId) await logActivity({ userId: usuarioId, modulo: "auth", accion: "logout" });
    },
  },
});
