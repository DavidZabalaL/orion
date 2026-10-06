-- Un operador (o usuario, en el caso excepcional sin Operador vinculado)
-- solo puede tener UNA unidad tomada a la vez — antes nada lo impedía a
-- nivel de base de datos, solo la lógica de aplicación en tomarUnidad()
-- (cerrar cualquier sesión propia abierta antes de crear la nueva), que es
-- vulnerable a una condición de carrera entre dos "tomar unidad" casi
-- simultáneas (ver incidente: un operador terminó con 2 unidades abiertas
-- a la vez, y la unidad vieja quedó bloqueando el checklist de quien
-- realmente la tenía libre). Mismo patrón que
-- BitacoraUsoUnidad_numeroEconomico_abierta_key (20260904000000), ahora
-- también por operadorId/usuarioId.
CREATE UNIQUE INDEX "BitacoraUsoUnidad_operadorId_abierta_key"
  ON "BitacoraUsoUnidad" ("operadorId")
  WHERE "fin" IS NULL AND "operadorId" IS NOT NULL;

CREATE UNIQUE INDEX "BitacoraUsoUnidad_usuarioId_abierta_key"
  ON "BitacoraUsoUnidad" ("usuarioId")
  WHERE "fin" IS NULL AND "usuarioId" IS NOT NULL;
