// Autoverificación de validarMontosCarga con capturas reales mal tecleadas. Uso: npx tsx src/lib/checklist-carga-combustible-alertas.check.ts
import assert from "node:assert/strict";
import { validarMontosCarga } from "./checklist-carga-combustible-alertas";

for (const [l, p] of [["45.73", "978.16"], ["119.64", "3230.28"], ["18.57", "471.59"], ["37.037", "1000"]]) assert.equal(validarMontosCarga(l, p), null, `${l} L / $${p}`);
for (const [l, p] of [["30976", "734.13"], ["55.56", "1.30955"], ["3751", "900"], ["1566.08", "58"], ["100", "100"], ["25", "1200"], ["0", "500"], ["40", ""]])
  assert.notEqual(validarMontosCarga(l, p), null, `${l} L / $${p}`);
console.log("ok validarMontosCarga");
