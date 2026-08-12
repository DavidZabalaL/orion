// Rol de desarrollador: acceso total e irrevocable, deliberadamente FUERA del
// sistema de roles de la tabla `Rol` (que es dato editable desde /usuarios/roles).
// Se resuelve por una allowlist de correos en variable de entorno — nadie puede
// quitarlo ni otorgarlo desde la UI de la plataforma, solo desde el despliegue.
//
// Este módulo es "edge-safe" a propósito (sin Prisma ni imports de Node): lo usa
// tanto el middleware (src/proxy.ts, Edge Runtime) como el resto del código Node.
const DEV_ADMIN_EMAILS = (process.env.DEV_ADMIN_EMAILS ?? "")
  .split(",")
  .map((correo) => correo.trim().toLowerCase())
  .filter(Boolean);

export function esCorreoDevAdmin(correo: string | null | undefined): boolean {
  if (!correo) return false;
  return DEV_ADMIN_EMAILS.includes(correo.toLowerCase());
}
