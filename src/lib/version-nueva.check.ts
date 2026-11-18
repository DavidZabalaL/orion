// npx tsx src/lib/version-nueva.check.ts
import assert from "node:assert/strict";
import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import { recargarSiVersionNueva } from "./version-nueva";

let recargas = 0;
const almacen = new Map<string, string>();
Object.assign(globalThis, {
  window: { location: { reload: () => recargas++ } },
  sessionStorage: { getItem: (k: string) => almacen.get(k) ?? null, setItem: (k: string, v: string) => almacen.set(k, v) },
});

assert.equal(recargarSiVersionNueva(new Error("sin red")), false);
assert.equal(recargas, 0);
assert.equal(recargarSiVersionNueva(new UnrecognizedActionError("Server Action \"x\" was not found")), true);
assert.equal(recargas, 1);
// Segunda vez dentro del minuto: no recarga en bucle.
assert.equal(recargarSiVersionNueva(new UnrecognizedActionError("otra vez")), false);
assert.equal(recargas, 1);
console.log("version-nueva.check: OK");
