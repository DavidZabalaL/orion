// Autoverificación del emparejamiento por nombre. Uso: npx tsx src/lib/intellihub.check.ts
import assert from "node:assert/strict";
import { emparejarPorNombre } from "./intellihub";

const vehiculos = [
  { vehicleId: 1, vehicleName: "CP-003 Suburban" },
  { vehicleId: 2, vehicleName: "CP-004 Suburban" },
  { vehicleId: 3, vehicleName: "cp-005 Cherokee" },
  { vehicleId: 4, vehicleName: "MR-002 DINAMO" },
  { vehicleId: 5, vehicleName: "MR-002 DINAMO_10200" },
  { vehicleId: 6, vehicleName: "CP-0040 Otro" },
  { vehicleId: 7, vehicleName: "CS-003 XTRAIL _76616" },
];

assert.deepEqual(emparejarPorNombre(vehiculos, new Set([1]), ["CP-003", "CP-004", "CP-005", "MR-002", "CS-003", "AR-002"]), [
  { vehicleId: 2, numeroEconomico: "CP-004" }, // "CP-0040" no cuenta como CP-004
  { vehicleId: 3, numeroEconomico: "CP-005" }, // sin distinguir mayúsculas
  { vehicleId: 7, numeroEconomico: "CS-003" },
  // CP-003: su vehículo ya está mapeado; MR-002: dos candidatos → manual; AR-002: no existe allá
]);
assert.deepEqual(emparejarPorNombre(vehiculos, new Set([2, 3]), ["CP-004"]), []);

console.log("intellihub.check: OK");
