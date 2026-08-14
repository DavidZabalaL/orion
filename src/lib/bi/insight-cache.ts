// Caché compartida por texto generado por IA (insight de una gráfica o
// explicación de un forecast), keyed por hash de los parámetros de consulta
// YA resueltos + hash de los datos agregados — si los datos subyacentes
// cambian antes de que expire el TTL, se recalcula en vez de servir un
// resumen desactualizado.
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const TTL_MINUTOS = 15;

export function hashDeObjeto(valor: unknown): string {
  return createHash("sha256").update(JSON.stringify(valor)).digest("hex");
}

export async function obtenerInsightCacheado(tipo: "insight" | "forecast", claveConsulta: string, datosHash: string): Promise<string | null> {
  const fila = await prisma.insightCache.findUnique({ where: { claveConsulta } });
  if (!fila || fila.tipo !== tipo || fila.datosHash !== datosHash || fila.expiraEn < new Date()) return null;
  return fila.resumen;
}

export async function guardarInsightCache(input: { tipo: "insight" | "forecast"; claveConsulta: string; datosHash: string; resumen: string; modelo: string }): Promise<void> {
  const expiraEn = new Date(Date.now() + TTL_MINUTOS * 60_000);
  await prisma.insightCache.upsert({
    where: { claveConsulta: input.claveConsulta },
    create: { claveConsulta: input.claveConsulta, tipo: input.tipo, datosHash: input.datosHash, resumen: input.resumen, modelo: input.modelo, expiraEn },
    update: { tipo: input.tipo, datosHash: input.datosHash, resumen: input.resumen, modelo: input.modelo, expiraEn },
  });
}
