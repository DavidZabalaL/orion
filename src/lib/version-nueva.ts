import { unstable_isUnrecognizedActionError } from "next/navigation";

const CLAVE = "orion:recarga-version";
export const MENSAJE_VERSION_NUEVA = "Orión se actualizó. Recargando la página; tu avance guardado se conserva.";

/**
 * Tras un despliegue, una pestaña abierta desde antes llama Server Actions que ya no
 * existen ("Failed to find Server Action"): ninguna foto sube y el envío truena.
 * Skew Protection de Vercel no lo cubre (plan Pro: máximo 12 h, y aquí se despliega
 * cada varios días). Recarga para tomar la versión nueva; los wizards de checklist
 * recuperan su borrador. Devuelve true si va a recargar.
 */
export function recargarSiVersionNueva(error: unknown): boolean {
  if (!unstable_isUnrecognizedActionError(error)) return false;
  try {
    // Si ya recargó hace menos de un minuto y sigue fallando, no entrar en bucle.
    if (Date.now() - Number(sessionStorage.getItem(CLAVE) ?? 0) < 60_000) return false;
    sessionStorage.setItem(CLAVE, String(Date.now()));
  } catch {
    // Sin sessionStorage (modo privado): recargar igual.
  }
  window.location.reload();
  return true;
}
