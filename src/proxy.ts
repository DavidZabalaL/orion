import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Instancia separada de la de src/auth.ts: esta corre en Edge Runtime y no
// debe importar Prisma (el driver `pg` no funciona fuera de Node.js runtime).
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    const url = new URL("/iniciar-sesion", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!api/auth|iniciar-sesion|_next/static|_next/image|favicon.ico|icon\\.png|icon\\.svg).*)"],
};
