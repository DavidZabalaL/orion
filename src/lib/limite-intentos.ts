import { prisma } from "@/lib/prisma";

/**
 * Límite de intentos para rutas públicas de acceso, guardado en la tabla
 * IntentoAcceso (no hay Redis/KV en la plataforma). Se cuenta por cuenta
 * (correo) y por IP dentro de una ventana deslizante.
 */
export type TipoIntento = "login" | "recuperacion";

const VENTANA_MS = 15 * 60 * 1000; // 15 minutos

const LIMITES: Record<TipoIntento, { porClave: number; porIp: number; soloFallidos: boolean }> = {
  // Contraseña incorrecta: 5 por cuenta / 20 por IP cada 15 min.
  login: { porClave: 5, porIp: 20, soloFallidos: true },
  // Cada solicitud manda un correo: 3 por cuenta / 10 por IP cada 15 min, exitosas o no.
  recuperacion: { porClave: 3, porIp: 10, soloFallidos: false },
};

/** IP del cliente. En Vercel, x-forwarded-for la fija la plataforma (no la controla el cliente). */
export function ipDeEncabezados(headers: Headers): string | null {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || null;
}

export async function intentosExcedidos(tipo: TipoIntento, clave: string, ip: string | null): Promise<boolean> {
  const { porClave, porIp, soloFallidos } = LIMITES[tipo];
  const desde = new Date(Date.now() - VENTANA_MS);
  const filtroExito = soloFallidos ? { exitoso: false } : {};

  const [deClave, deIp] = await Promise.all([
    prisma.intentoAcceso.count({ where: { tipo, clave, createdAt: { gte: desde }, ...filtroExito } }),
    ip ? prisma.intentoAcceso.count({ where: { tipo, ip, createdAt: { gte: desde }, ...filtroExito } }) : Promise.resolve(0),
  ]);
  return deClave >= porClave || deIp >= porIp;
}

export async function registrarIntento(tipo: TipoIntento, clave: string, ip: string | null, exitoso: boolean): Promise<void> {
  await prisma.intentoAcceso.create({ data: { tipo, clave, ip, exitoso } });
}
