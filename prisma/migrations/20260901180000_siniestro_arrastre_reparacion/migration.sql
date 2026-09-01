-- Agrega el registro de arrastre y reparación a los siniestros: si hubo
-- arrastre, su costo, y el costo de reparación. Son datos informativos
-- (no forman parte del presupuesto del proyecto ni de GastoVehicular).

ALTER TABLE "Siniestro" ADD COLUMN "huboArrastre" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Siniestro" ADD COLUMN "costoArrastre" DECIMAL(12,2);
ALTER TABLE "Siniestro" ADD COLUMN "costoReparacion" DECIMAL(12,2);
