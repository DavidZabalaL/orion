// Autoverificación de la regla del km oficial. Uso: npx tsx src/lib/km-oficial.check.ts
import assert from "node:assert/strict";
import { cuadran, resolverKmOficial, compararConOficial, primeraLecturaConfiable, type Lectura } from "./km-oficial";

const l = (km: number, fecha: string, gps: number | null = null): Lectura => ({ km, fecha: new Date(fecha), gps });

// cuadran: con GPS manda lo que avanzó el GPS (aunque su odómetro esté desfasado 60 mil km).
assert.equal(cuadran(l(102561, "2026-10-28", 164769), l(102908, "2026-11-13", 165108)), true);
assert.equal(cuadran(l(93550, "2026-11-12", 98451), l(99906, "2026-11-18", 99302)), false); // 6,356 km vs 851 por GPS
// Sin GPS: no retrocede más de 300 km ni avanza más de 1,000 km/día; vale en ambos órdenes de fecha.
assert.equal(cuadran(l(1000, "2026-11-01"), l(800, "2026-11-02")), true);
assert.equal(cuadran(l(1000, "2026-11-01"), l(600, "2026-11-02")), false);
assert.equal(cuadran(l(1000, "2026-11-01"), l(3200, "2026-11-03")), true);
assert.equal(cuadran(l(1000, "2026-11-01"), l(3400, "2026-11-03")), false);
assert.equal(cuadran(l(3200, "2026-11-03"), l(1000, "2026-11-01")), true);

// El último checklist manda si cuadra con algo, aunque la carga sea la errónea (C5-064).
let r = resolverKmOficial({ checklists: [l(99906, "2026-11-18", 99302), l(99700, "2026-11-17", 99100)], carga: l(93550, "2026-11-12", 98451), gps: null });
assert.deepEqual([r.oficial?.km, r.oficial?.fuente, r.discrepancia], [99906, "CHECKLIST", false]);

// Dedo de menos (CR-031: 17,303 vs 172,xxx): se descarta y vale el anterior que sí cuadra.
r = resolverKmOficial({
  checklists: [l(17303, "2026-11-17", 172900), l(172850, "2026-11-16", 172860), l(172800, "2026-11-15", 172810)],
  carga: l(172717, "2026-10-27", 172611),
  gps: null,
});
assert.deepEqual([r.oficial?.km, r.discrepancia], [172850, true]);

// Ninguno cuadra: no se sobrescribe.
r = resolverKmOficial({ checklists: [l(365828, "2026-10-05", 110756)], carga: l(37117, "2026-11-10", 111293), gps: null });
assert.deepEqual([r.oficial, r.discrepancia], [null, true]);

// Primer checklist sin nada contra qué comparar: se acepta.
assert.equal(resolverKmOficial({ checklists: [l(5000, "2026-11-01")], carga: null, gps: null }).oficial?.km, 5000);
// Sin checklists: carga, luego GPS, luego nada.
assert.equal(resolverKmOficial({ checklists: [], carga: l(57800, "2026-11-11"), gps: l(72, "2026-11-18", 72) }).oficial?.fuente, "CARGA");
assert.equal(resolverKmOficial({ checklists: [], carga: null, gps: l(9299, "2026-11-18", 9299) }).oficial?.km, 9299);
assert.equal(resolverKmOficial({ checklists: [], carga: null, gps: null }).oficial, null);

// Comparación para la ficha: GPS desfasado (G5-026) se marca aunque la carga cuadre.
const lecturas = { checklists: [l(5380, "2026-11-04", 57192)], carga: l(5480, "2026-11-12", 57202), gps: l(57204, "2026-11-18", 57204) };
assert.deepEqual(
  compararConOficial(lecturas, resolverKmOficial(lecturas)).map((c) => [c.fuente, c.cuadra]),
  [["CHECKLIST", true], ["CARGA", true], ["GPS", false]]
);

// Base del año: se salta un primer dedazo y toma la primera que cuadra; con una sola lectura, esa.
assert.equal(primeraLecturaConfiable([l(52000, "2026-01-09"), l(5100, "2026-01-02"), l(52400, "2026-01-16")])?.km, 52000);
assert.equal(primeraLecturaConfiable([l(80000, "2026-03-01")])?.km, 80000);
assert.equal(primeraLecturaConfiable([]), null);

console.log("km-oficial.check: OK");
