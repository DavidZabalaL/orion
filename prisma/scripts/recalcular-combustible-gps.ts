// Recalcula km recorridos (GPS o captura), rendimiento, nivel estimado y
// alerta de sobrellenado de TODAS las cargas con la regla de
// src/lib/combustible-estimado.ts. Por defecto solo simula y muestra el
// antes/después; con --aplicar guarda los cambios.
// Uso: npx tsx prisma/scripts/recalcular-combustible-gps.ts [--aplicar]
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
import { recalcularCombustibleUnidad, rendimientoEnRango, type EstimadoCarga } from "../../src/lib/combustible-estimado";

const aplicar = process.argv.includes("--aplicar");

type Acumulado = { cargas: number; alertas: number; conRendimiento: number; fueraDeRango: number; km: number; litros: number; gps: number; captura: number };
const nuevo = (): Acumulado => ({ cargas: 0, alertas: 0, conRendimiento: 0, fueraDeRango: 0, km: 0, litros: 0, gps: 0, captura: 0 });

async function main() {
  const unidades = await prisma.combustible.findMany({ where: { numeroEconomico: { not: null } }, distinct: ["numeroEconomico"], select: { numeroEconomico: true } });
  const litrosPorId = new Map(
    (await prisma.combustible.findMany({ where: { numeroEconomico: { not: null } }, select: { id: true, litros: true } })).map((c) => [c.id, Number(c.litros)])
  );
  const antes = nuevo();
  const despues = nuevo();
  let cambios = 0;
  const porUnidad: { n: string; alertasAntes: number; alertasDespues: number }[] = [];

  const sumar = (acc: Acumulado, e: EstimadoCarga, litros: number) => {
    acc.cargas++;
    if (e.alertaSobrellenado) acc.alertas++;
    if (e.rendimientoCalculado != null) {
      if (rendimientoEnRango(e.rendimientoCalculado)) {
        acc.conRendimiento++;
        if (e.kmRecorridos != null) {
          acc.km += e.kmRecorridos;
          acc.litros += litros;
        }
      } else {
        acc.fueraDeRango++;
      }
    }
    if (e.fuenteKmRecorridos === "GPS") acc.gps++;
    if (e.fuenteKmRecorridos === "CAPTURA") acc.captura++;
  };

  for (const { numeroEconomico } of unidades) {
    const r = await recalcularCombustibleUnidad(numeroEconomico as string, { aplicar });
    cambios += r.cambios;
    let aA = 0;
    let aD = 0;
    for (const [id, e] of r.estimados) {
      const a = r.antes.get(id)!;
      const litros = litrosPorId.get(id) ?? 0;
      sumar(antes, a, litros);
      sumar(despues, e, litros);
      if (a.alertaSobrellenado) aA++;
      if (e.alertaSobrellenado) aD++;
    }
    porUnidad.push({ n: numeroEconomico as string, alertasAntes: aA, alertasDespues: aD });
  }

  const fmt = (a: Acumulado) =>
    `alertas ${a.alertas} | rendimiento válido ${a.conRendimiento} (fuera de rango ${a.fueraDeRango}) | km de GPS ${a.gps} / de captura ${a.captura} | flota ${a.litros > 0 ? (a.km / a.litros).toFixed(2) : "—"} km/L`;
  console.log(`Unidades: ${unidades.length} · cargas: ${despues.cargas}`);
  console.log(`ANTES:   ${fmt(antes)}`);
  console.log(`DESPUÉS: ${fmt(despues)}`);
  console.log(`Cargas que cambian: ${cambios}`);
  console.log("Unidades con más alertas antes → después:");
  porUnidad.sort((x, y) => y.alertasAntes - x.alertasAntes).slice(0, 10).forEach((u) => console.log(`  ${u.n}: ${u.alertasAntes} → ${u.alertasDespues}`));
  console.log(aplicar ? "✔ Cambios guardados." : "(Simulación — no se guardó nada. Corre con --aplicar para guardar.)");
}

main().finally(() => prisma.$disconnect());
