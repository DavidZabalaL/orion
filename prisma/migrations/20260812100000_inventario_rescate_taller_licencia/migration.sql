-- ─────────────────────────────────────────────────────────────────
-- Migración: inventario de insumos, módulo rescate, fechas taller,
--            licenciaRequerida en Unidad, limpieza enum TipoLicencia
-- Aplicar en Neon SQL Editor (pegar todo de un jalón)
-- ─────────────────────────────────────────────────────────────────

-- 1. Limpiar TipoLicencia en DocumentoOperador: llevar C/D/E → B.
--    Envuelto en DO para tolerar si el enum ya fue limpiado previamente.
DO $$ BEGIN
  UPDATE "DocumentoOperador"
  SET "tipoLicencia" = 'B'::"TipoLicencia"
  WHERE "tipoLicencia"::text IN ('C', 'D', 'E');

  ALTER TYPE "TipoLicencia" RENAME TO "TipoLicencia_old";
  CREATE TYPE "TipoLicencia" AS ENUM ('A', 'B');
  ALTER TABLE "DocumentoOperador"
    ALTER COLUMN "tipoLicencia" TYPE "TipoLicencia"
    USING ("tipoLicencia"::text::"TipoLicencia");
  DROP TYPE "TipoLicencia_old";
EXCEPTION WHEN OTHERS THEN
  NULL; -- enum ya tiene solo A/B, o no hay valores inválidos — continuar
END $$;

-- 2. licenciaRequerida en Unidad
ALTER TABLE "Unidad"
  ADD COLUMN IF NOT EXISTS "licenciaRequerida" "TipoLicenciaManejo";

-- Poblar automáticamente: las grúas requieren TIPO_B, el resto TIPO_A
UPDATE "Unidad" SET "licenciaRequerida" = 'TIPO_B'::"TipoLicenciaManejo" WHERE "tipoVehiculo" = 'GRUA';
UPDATE "Unidad" SET "licenciaRequerida" = 'TIPO_A'::"TipoLicenciaManejo" WHERE "tipoVehiculo" != 'GRUA';

-- 3. Fechas de taller en GastoVehicular
ALTER TABLE "GastoVehicular"
  ADD COLUMN IF NOT EXISTS "fechaIngresoTaller"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fechaEstimadaSalida" TIMESTAMP(3);

-- 4. Inventario de insumos
CREATE TABLE IF NOT EXISTS "InsumoInventario" (
  "id"          TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "proyectoId"  TEXT         NOT NULL,
  "nombre"      TEXT         NOT NULL,
  "categoria"   TEXT,
  "unidad"      TEXT         NOT NULL DEFAULT 'pza',
  "existencias" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "minimoStock" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InsumoInventario_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InsumoInventario_proyectoId_fkey"
    FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "InsumoInventario_proyectoId_idx" ON "InsumoInventario"("proyectoId");

-- 5. Enums de Rescate
DO $$ BEGIN
  CREATE TYPE "CategoriaRescate" AS ENUM (
    'MECANICO','ELECTRICO','NEUMATICO','ACCIDENTE','SEGURIDAD','COMBUSTIBLE','OTRO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PrioridadRescate" AS ENUM ('BAJA','MEDIA','ALTA','URGENTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EstatusTicketRescate" AS ENUM (
    'ABIERTO','ASIGNADO','EN_ATENCION','EN_TRANSITO','RESUELTO','CERRADO','CANCELADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Catálogo de motivos de rescate
CREATE TABLE IF NOT EXISTS "CatalogoMotivoRescate" (
  "id"               TEXT              NOT NULL DEFAULT gen_random_uuid()::text,
  "nombre"           TEXT              NOT NULL,
  "categoria"        "CategoriaRescate" NOT NULL,
  "prioridadDefault" "PrioridadRescate" NOT NULL DEFAULT 'MEDIA',
  "activo"           BOOLEAN           NOT NULL DEFAULT TRUE,
  "createdAt"        TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CatalogoMotivoRescate_pkey"   PRIMARY KEY ("id"),
  CONSTRAINT "CatalogoMotivoRescate_nombre_key" UNIQUE ("nombre")
);

-- Seed inicial
INSERT INTO "CatalogoMotivoRescate" ("nombre","categoria","prioridadDefault") VALUES
  ('Pinchazo de llanta',              'NEUMATICO',   'MEDIA'),
  ('Falla de motor',                  'MECANICO',    'ALTA'),
  ('Batería descargada',              'ELECTRICO',   'MEDIA'),
  ('Sin combustible',                 'COMBUSTIBLE', 'ALTA'),
  ('Accidente vial',                  'ACCIDENTE',   'URGENTE'),
  ('Situación de seguridad (SEG)',    'SEGURIDAD',   'URGENTE'),
  ('Falla de frenos',                 'MECANICO',    'URGENTE'),
  ('Transmisión dañada',              'MECANICO',    'ALTA'),
  ('Sobrecalentamiento',              'MECANICO',    'ALTA'),
  ('Falla eléctrica general',         'ELECTRICO',   'MEDIA'),
  ('Fuga de aceite',                  'MECANICO',    'ALTA'),
  ('Fuga de anticongelante',          'MECANICO',    'ALTA'),
  ('Daño en suspensión',              'MECANICO',    'MEDIA'),
  ('Vidrio roto',                     'ACCIDENTE',   'MEDIA'),
  ('Otro',                            'OTRO',        'MEDIA')
ON CONFLICT ("nombre") DO NOTHING;

-- 7. Tickets de rescate
CREATE TABLE IF NOT EXISTS "TicketRescate" (
  "id"              TEXT                  NOT NULL DEFAULT gen_random_uuid()::text,
  "folio"           TEXT                  NOT NULL,
  "numeroEconomico" TEXT                  NOT NULL,
  "motivoId"        TEXT                  NOT NULL,
  "descripcion"     TEXT,
  "prioridad"       "PrioridadRescate"    NOT NULL DEFAULT 'MEDIA',
  "estatus"         "EstatusTicketRescate" NOT NULL DEFAULT 'ABIERTO',
  "ubicacion"       TEXT,
  "latitud"         DECIMAL(10,7),
  "longitud"        DECIMAL(10,7),
  "reportadoPorId"  TEXT                  NOT NULL,
  "asignadoAId"     TEXT,
  "proyectoId"      TEXT,
  "cerradoAt"       TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TicketRescate_pkey"  PRIMARY KEY ("id"),
  CONSTRAINT "TicketRescate_folio_key" UNIQUE ("folio"),
  CONSTRAINT "TicketRescate_numeroEconomico_fkey"
    FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico"),
  CONSTRAINT "TicketRescate_motivoId_fkey"
    FOREIGN KEY ("motivoId") REFERENCES "CatalogoMotivoRescate"("id"),
  CONSTRAINT "TicketRescate_reportadoPorId_fkey"
    FOREIGN KEY ("reportadoPorId") REFERENCES "Usuario"("id"),
  CONSTRAINT "TicketRescate_asignadoAId_fkey"
    FOREIGN KEY ("asignadoAId") REFERENCES "Usuario"("id"),
  CONSTRAINT "TicketRescate_proyectoId_fkey"
    FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id")
);
CREATE INDEX IF NOT EXISTS "TicketRescate_numeroEconomico_idx" ON "TicketRescate"("numeroEconomico");
CREATE INDEX IF NOT EXISTS "TicketRescate_estatus_idx"         ON "TicketRescate"("estatus");
CREATE INDEX IF NOT EXISTS "TicketRescate_proyectoId_idx"      ON "TicketRescate"("proyectoId");
CREATE INDEX IF NOT EXISTS "TicketRescate_folio_idx"           ON "TicketRescate"("folio");

-- 8. Histórico de tickets de rescate
CREATE TABLE IF NOT EXISTS "HistoricoTicketRescate" (
  "id"         TEXT                  NOT NULL DEFAULT gen_random_uuid()::text,
  "ticketId"   TEXT                  NOT NULL,
  "estatus"    "EstatusTicketRescate" NOT NULL,
  "comentario" TEXT,
  "usuarioId"  TEXT                  NOT NULL,
  "createdAt"  TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HistoricoTicketRescate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HistoricoTicketRescate_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "TicketRescate"("id") ON DELETE CASCADE,
  CONSTRAINT "HistoricoTicketRescate_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
);
CREATE INDEX IF NOT EXISTS "HistoricoTicketRescate_ticketId_idx" ON "HistoricoTicketRescate"("ticketId");
