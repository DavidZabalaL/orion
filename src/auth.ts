import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
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
        if (usuario) token.usuarioId = usuario.id;
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
          if (usuario && usuario.estatus !== "DESACTIVADO") {
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
