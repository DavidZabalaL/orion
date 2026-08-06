import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { esCorreoDevAdmin } from "@/lib/dev-admin";

// Instancia separada de la de src/auth.ts: esta corre en Edge Runtime y no
// debe importar Prisma (el driver `pg` no funciona fuera de Node.js runtime).
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    const url = new URL("/iniciar-sesion", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Defensa en profundidad para /admin/actividad (Analítica de Uso y
  // Trazabilidad): el permiso "real" se valida otra vez en la página
  // (requerirDevAdmin, en Node) contra la misma allowlist — esto solo
  // evita que el árbol de la página llegue a renderizar por navegación
  // directa a la URL si el correo no es del equipo de Desarrollo.
  if (req.nextUrl.pathname.startsWith("/admin/actividad") && !esCorreoDevAdmin(req.auth.user?.email)) {
    return NextResponse.redirect(new URL("/sin-acceso", req.url));
  }
});

export const config = {
  // api/exec: endpoints de solo lectura para el Dashboard Directivo,
  // autenticados con su propio secreto (requireExecKey en
  // src/lib/exec-auth.ts) — no pueden pasar por este middleware de sesión,
  // que redirigiría cualquier request sin cookie a /iniciar-sesion antes de
  // llegar a la ruta.
  matcher: ["/((?!api/auth|api/exec|iniciar-sesion|_next/static|_next/image|favicon.ico|icon\\.png|icon\\.svg).*)"],
};
