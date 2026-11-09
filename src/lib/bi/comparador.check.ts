// Autoverificación de la lógica pura del Comparador. Uso: npx tsx src/lib/bi/comparador.check.ts
import assert from "node:assert/strict";
import { resolverAtajo, resolverPeriodos, variacion, cambioParaRegla, moverMeses, diasDelRango, fechaValida, etiquetaRango } from "./comparador-tipos";

const hoy = "2026-11-09";

// Atajos absolutos.
assert.deepEqual(resolverAtajo("mes_actual", hoy), { desde: "2026-11-01", hasta: "2026-11-09" });
assert.deepEqual(resolverAtajo("mes_anterior", hoy), { desde: "2026-10-01", hasta: "2026-10-31" });
assert.deepEqual(resolverAtajo("trimestre_actual", hoy), { desde: "2026-10-01", hasta: "2026-11-09" });
assert.deepEqual(resolverAtajo("trimestre_anterior", hoy), { desde: "2026-07-01", hasta: "2026-09-30" });
assert.deepEqual(resolverAtajo("anio_actual", hoy), { desde: "2026-01-01", hasta: "2026-11-09" });
assert.deepEqual(resolverAtajo("anio_anterior", hoy), { desde: "2025-01-01", hasta: "2025-12-31" });
assert.deepEqual(resolverAtajo("mes_anterior", "2026-03-15"), { desde: "2026-02-01", hasta: "2026-02-28" });
assert.deepEqual(resolverAtajo("trimestre_anterior", "2026-02-10"), { desde: "2025-10-01", hasta: "2025-12-31" });

// Relativos al periodo base.
assert.equal(resolverAtajo("periodo_anterior", hoy), null);
assert.deepEqual(resolverAtajo("periodo_anterior", hoy, { desde: "2026-11-01", hasta: "2026-11-09", atajo: "mes_actual" }), { desde: "2026-10-01", hasta: "2026-10-09" });
assert.deepEqual(resolverAtajo("periodo_anterior", hoy, { desde: "2026-10-01", hasta: "2026-10-31" }), { desde: "2026-09-01", hasta: "2026-09-30" });
assert.deepEqual(resolverAtajo("periodo_anterior", hoy, { desde: "2026-03-01", hasta: "2026-03-31" }), { desde: "2026-02-01", hasta: "2026-02-28" });
assert.deepEqual(resolverAtajo("periodo_anterior", hoy, { desde: "2026-10-01", hasta: "2026-11-09", atajo: "trimestre_actual" }), { desde: "2026-07-01", hasta: "2026-08-09" });
assert.deepEqual(resolverAtajo("periodo_anterior", hoy, { desde: "2026-07-01", hasta: "2026-09-30" }), { desde: "2026-04-01", hasta: "2026-06-30" });
assert.deepEqual(resolverAtajo("periodo_anterior", hoy, { desde: "2026-01-01", hasta: "2026-12-31", atajo: "anio_actual" }), { desde: "2025-01-01", hasta: "2025-12-31" });
// Rango que no arranca en día 1: mismos días, inmediatamente antes.
assert.deepEqual(resolverAtajo("periodo_anterior", hoy, { desde: "2026-10-15", hasta: "2026-10-28" }), { desde: "2026-10-01", hasta: "2026-10-14" });
assert.deepEqual(resolverAtajo("mismo_periodo_anio_anterior", hoy, { desde: "2026-11-01", hasta: "2026-11-09" }), { desde: "2025-11-01", hasta: "2025-11-09" });
assert.deepEqual(resolverAtajo("mismo_periodo_anio_anterior", hoy, { desde: "2024-02-01", hasta: "2024-02-29" }), { desde: "2023-02-01", hasta: "2023-02-28" });

// resolverPeriodos: la base se recalcula y los relativos la siguen; los rangos fijos no se tocan.
const guardados = [
  { desde: "2026-06-01", hasta: "2026-06-30", atajo: "mes_anterior" as const },
  { desde: "2026-05-01", hasta: "2026-05-31", atajo: "periodo_anterior" as const },
  { desde: "2025-01-01", hasta: "2025-01-31" },
];
assert.deepEqual(resolverPeriodos(guardados, hoy), [
  { desde: "2026-10-01", hasta: "2026-10-31", atajo: "mes_anterior" },
  { desde: "2026-09-01", hasta: "2026-09-30", atajo: "periodo_anterior" },
  { desde: "2025-01-01", hasta: "2025-01-31" },
]);
// Un atajo relativo en la base no tiene contra qué calcularse: se deja su rango.
assert.deepEqual(resolverPeriodos([{ desde: "2026-01-01", hasta: "2026-01-31", atajo: "periodo_anterior" }], hoy), [{ desde: "2026-01-01", hasta: "2026-01-31", atajo: "periodo_anterior" }]);

// moverMeses: fin de mes se queda en fin de mes; el día se recorta.
assert.equal(moverMeses("2026-03-31", -1), "2026-02-28");
assert.equal(moverMeses("2026-02-28", 1), "2026-03-31");
assert.equal(moverMeses("2026-01-15", -2), "2025-11-15");

// Variación contra la base.
assert.deepEqual(variacion(100, 120), { diferencia: 20, pct: 0.2 });
assert.deepEqual(variacion(100, 80), { diferencia: -20, pct: -0.2 });
assert.deepEqual(variacion(0, 50), { diferencia: 50, pct: null });
assert.deepEqual(variacion(null, 50), { diferencia: null, pct: null });
assert.deepEqual(variacion(-100, -50), { diferencia: 50, pct: 0.5 });

// Valor que evalúan las reglas de color de la flecha.
assert.equal(cambioParaRegla(100, 112.5, false), 12.5);
assert.equal(cambioParaRegla(3, 3.3, false), 10); // sin ruido de flotante: se ve "+10.0%"
assert.equal(cambioParaRegla(80, 74.2, true), -5.8); // puntos porcentuales
assert.equal(cambioParaRegla(0, 17, false), Infinity);
assert.equal(cambioParaRegla(0, -5, false), -Infinity);
assert.equal(cambioParaRegla(0, 0, false), 0);
assert.equal(cambioParaRegla(null, 5, false), null);

assert.equal(diasDelRango({ desde: "2026-10-01", hasta: "2026-10-31" }), 31);
assert.equal(diasDelRango({ desde: "2026-11-09", hasta: "2026-11-09" }), 1);
assert.equal(fechaValida("2026-02-29"), false);
assert.equal(fechaValida("2024-02-29"), true);
assert.equal(fechaValida("2026-1-01"), false);
assert.equal(fechaValida(20261101), false);
assert.match(etiquetaRango({ desde: "2025-12-15", hasta: "2026-01-14" }), /2025.*2026/);

console.log("comparador.check: OK");
