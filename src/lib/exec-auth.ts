import { NextRequest } from "next/server";

/**
 * Auth de servicio-a-servicio para /api/exec/resumen, que consume el
 * Dashboard Directivo (app externa). Deliberadamente separada del sistema
 * de permisos por sesión (tienePermisoModulo) — ese es para usuarios
 * logueados en Orión, este es un secreto compartido entre servidores.
 */
export function requireExecKey(req: NextRequest): void {
  const expected = process.env.EXEC_DASHBOARD_API_KEY;
  if (!expected) throw new Error("Unauthorized");
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token !== expected) throw new Error("Unauthorized");
}
