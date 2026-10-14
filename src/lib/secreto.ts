import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Compara dos secretos en tiempo constante (evita ataques de tiempo sobre
 * `===`). Se comparan sus SHA-256 para que la longitud tampoco se filtre.
 */
export function secretosIguales(recibido: string, esperado: string): boolean {
  const a = createHash("sha256").update(recibido).digest();
  const b = createHash("sha256").update(esperado).digest();
  return timingSafeEqual(a, b);
}

/**
 * true si la petición trae `Authorization: Bearer <valor de la variable>`.
 * Falla cerrado: sin la variable de entorno configurada rechaza todo.
 */
export function bearerAutorizado(request: Request, variableEntorno: string): boolean {
  const secreto = process.env[variableEntorno];
  if (!secreto) return false;
  return secretosIguales(request.headers.get("authorization") ?? "", `Bearer ${secreto}`);
}

/**
 * Hash con el que se guardan en BD los tokens de invitación / recuperación
 * (Usuario.invitacionToken): el token en claro solo viaja en el enlace del
 * correo, así una fuga de la BD no permite tomar cuentas.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
