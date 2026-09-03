-- Permite que una carga de combustible no tenga unidad asignada (gasto
-- operativo de proyecto, comodín) — mismo patrón ya usado en Tag/Peajes.
-- kmActual deja de ser obligatorio porque no aplica sin una unidad.

ALTER TABLE "Combustible" ALTER COLUMN "numeroEconomico" DROP NOT NULL;
ALTER TABLE "Combustible" ALTER COLUMN "kmActual" DROP NOT NULL;
