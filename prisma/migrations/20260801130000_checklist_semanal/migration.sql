-- Soporte para el Checklist Semanal (59 campos), como un segundo tipo de
-- Checklist junto al Diario existente. Ver src/lib/checklist-semanal.ts.

-- CreateEnum
CREATE TYPE "TipoChecklist" AS ENUM ('DIARIO', 'SEMANAL');

-- AlterTable
ALTER TABLE "Checklist" ADD COLUMN "tipo" "TipoChecklist" NOT NULL DEFAULT 'DIARIO';
ALTER TABLE "Checklist" ALTER COLUMN "odometro" DROP NOT NULL;
ALTER TABLE "Checklist" ADD COLUMN "respuestasSemanal" JSONB;

-- CreateIndex
CREATE INDEX "Checklist_tipo_fecha_idx" ON "Checklist"("tipo", "fecha");
