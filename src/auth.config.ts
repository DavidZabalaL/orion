import type { NextAuthConfig } from "next-auth";

// Configuración segura para Edge Runtime (middleware): sin providers ni
// llamadas a Prisma. La configuración completa (con el provider de
// Microsoft y los callbacks que consultan la base de datos) vive en auth.ts.
export const authConfig = {
  pages: { signIn: "/iniciar-sesion" },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
