-- Migración: Siniestros, Histórico de Proyectos por Unidad, Consumo de Insumos, Gerente Administrativo
-- Fecha: 2026-08-13

-- ─── Nuevos enums ───

DO $$ BEGIN
  CREATE TYPE "TipoSiniestro" AS ENUM (
    'COLISION', 'ROBO_TOTAL', 'ROBO_PARCIAL', 'VANDALISMO',
    'INCENDIO', 'FENOMENO_NATURAL', 'OTRO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EstatusSiniestro" AS ENUM (
    'ABIERTO', 'EN_PROCESO', 'CERRADO', 'CERRADO_SIN_INDEMNIZACION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Tabla: UnidadHistoricoProyecto ───

CREATE TABLE IF NOT EXISTS "UnidadHistoricoProyecto" (
  "id"              TEXT NOT NULL,
  "numeroEconomico" TEXT NOT NULL,
  "proyectoId"      TEXT NOT NULL,
  "fechaInicio"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fechaFin"        TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UnidadHistoricoProyecto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UnidadHistoricoProyecto_numeroEconomico_idx"
  ON "UnidadHistoricoProyecto"("numeroEconomico");

CREATE INDEX IF NOT EXISTS "UnidadHistoricoProyecto_proyectoId_idx"
  ON "UnidadHistoricoProyecto"("proyectoId");

CREATE INDEX IF NOT EXISTS "UnidadHistoricoProyecto_numeroEconomico_fechaFin_idx"
  ON "UnidadHistoricoProyecto"("numeroEconomico", "fechaFin");

DO $$ BEGIN
  ALTER TABLE "UnidadHistoricoProyecto"
    ADD CONSTRAINT "UnidadHistoricoProyecto_numeroEconomico_fkey"
    FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UnidadHistoricoProyecto"
    ADD CONSTRAINT "UnidadHistoricoProyecto_proyectoId_fkey"
    FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Poblar histórico con asignaciones actuales
INSERT INTO "UnidadHistoricoProyecto" ("id", "numeroEconomico", "proyectoId", "fechaInicio")
SELECT
  gen_random_uuid()::text,
  u."numeroEconomico",
  u."proyectoId",
  u."fechaAlta"
FROM "Unidad" u
WHERE u."proyectoId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "UnidadHistoricoProyecto" h
    WHERE h."numeroEconomico" = u."numeroEconomico"
      AND h."fechaFin" IS NULL
  );

-- ─── Columna historicoProyectoId en GastoVehicular ───

ALTER TABLE "GastoVehicular"
  ADD COLUMN IF NOT EXISTS "historicoProyectoId" TEXT;

CREATE INDEX IF NOT EXISTS "GastoVehicular_historicoProyectoId_idx"
  ON "GastoVehicular"("historicoProyectoId");

DO $$ BEGIN
  ALTER TABLE "GastoVehicular"
    ADD CONSTRAINT "GastoVehicular_historicoProyectoId_fkey"
    FOREIGN KEY ("historicoProyectoId") REFERENCES "UnidadHistoricoProyecto"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Tabla: ConsumoInsumo ───

CREATE TABLE IF NOT EXISTS "ConsumoInsumo" (
  "id"              TEXT NOT NULL,
  "insumoId"        TEXT NOT NULL,
  "cantidad"        DECIMAL(10,2) NOT NULL,
  "numeroEconomico" TEXT NOT NULL,
  "historicoId"     TEXT,
  "fecha"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nota"            TEXT,
  "registradoPorId" TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsumoInsumo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ConsumoInsumo_insumoId_idx"
  ON "ConsumoInsumo"("insumoId");

CREATE INDEX IF NOT EXISTS "ConsumoInsumo_numeroEconomico_idx"
  ON "ConsumoInsumo"("numeroEconomico");

CREATE INDEX IF NOT EXISTS "ConsumoInsumo_historicoId_idx"
  ON "ConsumoInsumo"("historicoId");

DO $$ BEGIN
  ALTER TABLE "ConsumoInsumo"
    ADD CONSTRAINT "ConsumoInsumo_insumoId_fkey"
    FOREIGN KEY ("insumoId") REFERENCES "InsumoInventario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ConsumoInsumo"
    ADD CONSTRAINT "ConsumoInsumo_numeroEconomico_fkey"
    FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ConsumoInsumo"
    ADD CONSTRAINT "ConsumoInsumo_historicoId_fkey"
    FOREIGN KEY ("historicoId") REFERENCES "UnidadHistoricoProyecto"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ConsumoInsumo"
    ADD CONSTRAINT "ConsumoInsumo_registradoPorId_fkey"
    FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Tabla: Siniestro ───

CREATE TABLE IF NOT EXISTS "Siniestro" (
  "id"                     TEXT NOT NULL,
  "folio"                  TEXT NOT NULL,
  "numeroEconomico"        TEXT NOT NULL,
  "operadorId"             TEXT,
  "fecha"                  TIMESTAMP(3) NOT NULL,
  "tipo"                   "TipoSiniestro" NOT NULL,
  "descripcion"            TEXT NOT NULL,
  "ubicacion"              TEXT,
  "aseguradora"            TEXT,
  "noSiniestroAseguradora" TEXT,
  "noReporte"              TEXT,
  "personasInvolucradas"   TEXT,
  "danosTerceros"          TEXT,
  "danosUnidad"            TEXT,
  "estimacionDanos"        DECIMAL(12,2),
  "estatus"                "EstatusSiniestro" NOT NULL DEFAULT 'ABIERTO',
  "reportadoPorId"         TEXT NOT NULL,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Siniestro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Siniestro_folio_key"
  ON "Siniestro"("folio");

CREATE INDEX IF NOT EXISTS "Siniestro_numeroEconomico_idx"
  ON "Siniestro"("numeroEconomico");

CREATE INDEX IF NOT EXISTS "Siniestro_estatus_idx"
  ON "Siniestro"("estatus");

DO $$ BEGIN
  ALTER TABLE "Siniestro"
    ADD CONSTRAINT "Siniestro_numeroEconomico_fkey"
    FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Siniestro"
    ADD CONSTRAINT "Siniestro_operadorId_fkey"
    FOREIGN KEY ("operadorId") REFERENCES "Operador"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Siniestro"
    ADD CONSTRAINT "Siniestro_reportadoPorId_fkey"
    FOREIGN KEY ("reportadoPorId") REFERENCES "Usuario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Columna siniestroId en Documento ───

ALTER TABLE "Documento"
  ADD COLUMN IF NOT EXISTS "siniestroId" TEXT;

CREATE INDEX IF NOT EXISTS "Documento_siniestroId_idx"
  ON "Documento"("siniestroId");

DO $$ BEGIN
  ALTER TABLE "Documento"
    ADD CONSTRAINT "Documento_siniestroId_fkey"
    FOREIGN KEY ("siniestroId") REFERENCES "Siniestro"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Renombrar rol "Coordinador de Proyecto" → "Gerente administrativo" ───

UPDATE "Rol"
SET "nombre" = 'Gerente administrativo'
WHERE "nombre" = 'Coordinador de Proyecto';
