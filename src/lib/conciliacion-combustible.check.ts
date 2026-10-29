// Autoverificación de conciliarCargas. Uso: npx tsx src/lib/conciliacion-combustible.check.ts
import assert from "node:assert/strict";
import { conciliarCargas, type ChecklistCarga, type TransaccionCarga } from "./conciliacion-combustible";

const d = (iso: string) => new Date(iso);
const ck = (id: string, ne: string, fecha: string, litros: number, importe: number): ChecklistCarga => ({ id, numeroEconomico: ne, fecha: d(fecha), litros, importe });
const tx = (id: string, ne: string, fecha: string, litros: number, importe: number): TransaccionCarga => ({ id, numeroEconomico: ne, fecha: d(fecha), litros, importe, estacion: null });
const estados = (filas: ReturnType<typeof conciliarCargas>) => Object.fromEntries(filas.map((f) => [f.checklist?.id ?? f.transaccion!.id, f.estado]));

// Exacta, diferencia de 1 centavo, día siguiente, sin transacción, sin checklist, pendiente.
const r = estados(
  conciliarCargas(
    [
      ck("c1", "A", "2026-10-10T18:00:00Z", 40, 1000),
      ck("c2", "B", "2026-10-10T18:00:00Z", 40, 1000),
      ck("c3", "C", "2026-10-10T18:00:00Z", 30, 750),
      ck("c4", "D", "2026-10-10T18:00:00Z", 30, 750),
      ck("c5", "E", "2026-10-25T18:00:00Z", 30, 750),
    ],
    [
      tx("t1", "A", "2026-10-10T20:00:00Z", 40, 1000),
      tx("t2", "B", "2026-10-10T20:00:00Z", 40, 1000.01),
      tx("t3", "C", "2026-10-11T15:00:00Z", 30, 750),
      tx("t4", "F", "2026-10-10T20:00:00Z", 20, 500),
    ],
    d("2026-10-23T12:00:00Z")
  )
);
assert.deepEqual(r, { c1: "CONCILIADA", c2: "DIFERENCIA", c3: "CONCILIADA", c4: "SIN_TRANSACCION", c5: "PENDIENTE", t4: "SIN_CHECKLIST" });

// Dos cargas el mismo día: la exacta no se la "roba" la otra.
const r2 = estados(
  conciliarCargas(
    [ck("x1", "A", "2026-10-10T18:00:00Z", 41, 1025), ck("x2", "A", "2026-10-10T18:00:00Z", 40, 1000)],
    [tx("y1", "A", "2026-10-10T19:00:00Z", 40, 1000), tx("y2", "A", "2026-10-10T21:00:00Z", 41, 1025)],
    d("2026-10-23T12:00:00Z")
  )
);
assert.deepEqual(r2, { x1: "CONCILIADA", x2: "CONCILIADA" });

// Checklist sin litros/importe (formulario anterior): se empareja sin alertar, y la transacción no queda "sin checklist".
const r3 = estados(
  conciliarCargas(
    [{ id: "z1", numeroEconomico: "A", fecha: d("2026-09-20T18:00:00Z"), litros: null, importe: null }],
    [tx("w1", "A", "2026-09-20T17:00:00Z", 40, 1000)],
    d("2026-10-23T12:00:00Z")
  )
);
assert.deepEqual(r3, { z1: "INCOMPLETO" });

console.log("conciliacion-combustible: OK");
