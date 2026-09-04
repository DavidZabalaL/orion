-- Una unidad solo puede tener UNA sesión de uso abierta a la vez — antes nada
-- lo impedía a nivel de base de datos, y dos personas podían "tomar" la misma
-- unidad al mismo tiempo sin que ninguna lo notara (ver src/lib/checklist,
-- que ahora autocompleta el "responsable" del checklist con quien tenga la
-- unidad tomada: con datos duplicados el resultado sería arbitrario).
CREATE UNIQUE INDEX "BitacoraUsoUnidad_numeroEconomico_abierta_key"
  ON "BitacoraUsoUnidad" ("numeroEconomico")
  WHERE "fin" IS NULL;
