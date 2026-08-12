-- CreateEnum
CREATE TYPE "OrigenPresupuesto" AS ENUM ('IMPORTADO_EXCEL', 'MANUAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CategoriaGasto" ADD VALUE 'GASOLINA';
ALTER TYPE "CategoriaGasto" ADD VALUE 'VIATICOS_OPERACION';

-- DropForeignKey
ALTER TABLE "GastoVehicular" DROP CONSTRAINT "GastoVehicular_numeroEconomico_fkey";

-- AlterTable
ALTER TABLE "ConfiguracionNotificaciones" ADD COLUMN     "alertaRecargaPresupuestoActiva" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "GastoVehicular" ADD COLUMN     "proyectoReportanteId" TEXT,
ALTER COLUMN "numeroEconomico" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PresupuestoPartida" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "montoPresupuestado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "origen" "OrigenPresupuesto" NOT NULL DEFAULT 'MANUAL',
    "archivoOrigenNombre" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "cargadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresupuestoPartida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PresupuestoPartida_proyectoId_anio_idx" ON "PresupuestoPartida"("proyectoId", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "PresupuestoPartida_proyectoId_categoria_anio_mes_key" ON "PresupuestoPartida"("proyectoId", "categoria", "anio", "mes");

-- CreateIndex
CREATE INDEX "GastoVehicular_proyectoReportanteId_idx" ON "GastoVehicular"("proyectoReportanteId");

-- AddForeignKey
ALTER TABLE "PresupuestoPartida" ADD CONSTRAINT "PresupuestoPartida_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoPartida" ADD CONSTRAINT "PresupuestoPartida_cargadoPorId_fkey" FOREIGN KEY ("cargadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoVehicular" ADD CONSTRAINT "GastoVehicular_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoVehicular" ADD CONSTRAINT "GastoVehicular_proyectoReportanteId_fkey" FOREIGN KEY ("proyectoReportanteId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
