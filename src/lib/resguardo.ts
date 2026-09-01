import { prisma } from "@/lib/prisma";

/**
 * Registra un cambio real de resguardante: cierra el periodo abierto (si hay
 * uno y es de un operador distinto) y abre uno nuevo si se asigna operador.
 * Debe llamarse en cada punto donde se escribe `Unidad.resguardanteId` (alta,
 * edición, importación, baja) para que "Historial de resguardo" quede
 * completo — antes esos puntos solo sobreescribían el campo actual sin dejar
 * rastro documentado de quién resguardó la unidad y desde cuándo.
 */
export async function registrarCambioResguardante(
  numeroEconomico: string,
  nuevoResguardanteId: string | null,
  fecha: Date = new Date(),
  motivoCambio?: string | null
) {
  const abierto = await prisma.resguardo.findFirst({
    where: { numeroEconomico, fechaHasta: null },
    orderBy: { fechaDesde: "desc" },
  });

  if (abierto) {
    if (abierto.operadorId === nuevoResguardanteId) return; // sin cambio real
    await prisma.resguardo.update({ where: { id: abierto.id }, data: { fechaHasta: fecha } });
  }

  if (nuevoResguardanteId) {
    await prisma.resguardo.create({
      data: { numeroEconomico, operadorId: nuevoResguardanteId, fechaDesde: fecha, motivoCambio: motivoCambio ?? null },
    });
  }
}
