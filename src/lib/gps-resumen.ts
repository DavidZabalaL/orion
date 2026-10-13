// Distancia recorrida y estimación de combustible restante en un período,
// para una unidad — misma lógica que ya usaba únicamente la ventana flotante
// del mapa en vivo (/api/mapa/detalle/[numeroEconomico]), extraída aquí para
// reutilizarse también desde la ficha de unidad (módulo A, no módulo G).
//
// kmRango: el GPS no integra distancia recorrida por sí solo — "kmValidado"
// es la lectura del propio odómetro del vehículo que reporta IntelliHub, así
// que la distancia del período es simplemente el máximo menos el mínimo
// leído en ese rango (no una suma de tramos Haversine, que solo se usa para
// detectar anomalías, nunca para acumular distancia).
import { prisma } from "@/lib/prisma";

export type ResumenGpsPeriodo = {
  dias: number;
  kmRango: number;
  lecturas: number;
  combustibleEstimado: { porcentaje: number; litros: number; capacidad: number } | null;
};

export async function calcularResumenGpsPeriodo(numeroEconomico: string, dias: number): Promise<ResumenGpsPeriodo> {
  const diasAcotado = Math.max(1, Math.min(90, dias));
  const inicioRango = new Date(Date.now() - diasAcotado * 86_400_000);

  const [unidad, posicionesRango, ultimaCarga] = await Promise.all([
    prisma.unidad.findUnique({
      where: { numeroEconomico },
      select: { kmOficial: true, capacidadTanqueLitros: true, rendimientoPromedio: true },
    }),
    prisma.posicionGPS.findMany({
      where: { numeroEconomico, timestamp: { gte: inicioRango } },
      select: { kmValidado: true },
    }),
    prisma.combustible.findFirst({
      where: { numeroEconomico, kmActual: { not: null }, nivelEstimadoDespues: { not: null } },
      orderBy: { kmActual: "desc" },
    }),
  ]);

  const kmValidados = posicionesRango.map((p) => p.kmValidado).filter((v): v is number => v !== null);
  const kmRango = kmValidados.length > 1 ? Math.max(...kmValidados) - Math.min(...kmValidados) : 0;

  let combustibleEstimado: ResumenGpsPeriodo["combustibleEstimado"] = null;
  const capacidad = unidad?.capacidadTanqueLitros ? Number(unidad.capacidadTanqueLitros) : null;
  const rendimiento = unidad?.rendimientoPromedio ? Number(unidad.rendimientoPromedio) : null;
  if (unidad && capacidad && rendimiento && ultimaCarga?.kmActual != null && ultimaCarga.nivelEstimadoDespues != null) {
    const kmDesdeCarga = unidad.kmOficial - ultimaCarga.kmActual;
    const litrosConsumidos = kmDesdeCarga > 0 ? kmDesdeCarga / rendimiento : 0;
    const litros = Math.max(0, Math.min(Number(ultimaCarga.nivelEstimadoDespues), capacidad) - litrosConsumidos);
    combustibleEstimado = { porcentaje: Math.round((litros / capacidad) * 100), litros: Math.round(litros), capacidad: Math.round(capacidad) };
  }

  return { dias: diasAcotado, kmRango: Math.round(kmRango), lecturas: kmValidados.length, combustibleEstimado };
}
