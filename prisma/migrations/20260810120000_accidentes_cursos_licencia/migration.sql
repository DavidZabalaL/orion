-- CreateEnum
CREATE TYPE "TipoLicenciaManejo" AS ENUM ('TIPO_A', 'TIPO_B');

-- AlterTable: Operador — nuevos campos opcionales
ALTER TABLE "Operador"
  ADD COLUMN "tipoLicenciaManejo"      "TipoLicenciaManejo" NULL,
  ADD COLUMN "fechaUltimaCapacitacion" TIMESTAMP(3)         NULL,
  ADD COLUMN "licenciaDocumentoUrl"    TEXT                 NULL;

-- CreateTable: Accidente
CREATE TABLE "Accidente" (
    "id"              TEXT         NOT NULL,
    "fecha"           TIMESTAMP(3) NOT NULL,
    "descripcion"     TEXT         NOT NULL,
    "tipo"            TEXT         NOT NULL,
    "numeroEconomico" TEXT         NOT NULL,
    "operadorId"      TEXT,
    "evidencias"      TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "registradoPorId" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Accidente_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CursoOperador
CREATE TABLE "CursoOperador" (
    "id"           TEXT         NOT NULL,
    "operadorId"   TEXT         NOT NULL,
    "nombre"       TEXT         NOT NULL,
    "fecha"        TIMESTAMP(3) NOT NULL,
    "evidenciaUrl" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CursoOperador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Accidente_numeroEconomico_idx" ON "Accidente"("numeroEconomico");
CREATE INDEX "Accidente_operadorId_idx"      ON "Accidente"("operadorId");
CREATE INDEX "CursoOperador_operadorId_idx"  ON "CursoOperador"("operadorId");

-- AddForeignKey: Accidente → Unidad
ALTER TABLE "Accidente"
  ADD CONSTRAINT "Accidente_numeroEconomico_fkey"
  FOREIGN KEY ("numeroEconomico")
  REFERENCES "Unidad"("numeroEconomico")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Accidente → Operador (optional)
ALTER TABLE "Accidente"
  ADD CONSTRAINT "Accidente_operadorId_fkey"
  FOREIGN KEY ("operadorId")
  REFERENCES "Operador"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: CursoOperador → Operador
ALTER TABLE "CursoOperador"
  ADD CONSTRAINT "CursoOperador_operadorId_fkey"
  FOREIGN KEY ("operadorId")
  REFERENCES "Operador"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
