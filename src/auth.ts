import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
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
      // Solo se consulta la base de datos en el sign-in inicial; en llamadas
      // posteriores el token ya trae usuarioId/rol embebidos.
      if (user?.email) {
        const usuario = await prisma.usuario.findUnique({ where: { correo: user.email.toLowerCase() }, include: { rol: true } });
        if (usuario) {
          token.usuarioId = usuario.id;
          token.rolNombre = usuario.rol.nombre;
          token.nombre = usuario.nombre;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.usuarioId as string) ?? "";
        session.user.name = (token.nombre as string) ?? session.user.name;
        session.user.rol = (token.rolNombre as string) ?? null;
      }
      return session;
    },
  },
});
