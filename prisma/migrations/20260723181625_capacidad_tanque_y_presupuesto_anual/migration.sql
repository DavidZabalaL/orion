-- AlterTable
ALTER TABLE "Combustible" ADD COLUMN     "alertaSobrellenado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nivelEstimadoDespues" DECIMAL(6,2);

-- AlterTable
ALTER TABLE "Proyecto" DROP COLUMN "presupuestoSemanal",
DROP COLUMN "semanaActualGastado",
ADD COLUMN     "presupuestoAprobadoAnual" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Unidad" ADD COLUMN     "capacidadTanqueLitros" DECIMAL(6,2);

-- CreateTable
CREATE TABLE "PresupuestoMensual" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "montoAsignado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresupuestoMensual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PresupuestoMensual_proyectoId_anio_idx" ON "PresupuestoMensual"("proyectoId", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "PresupuestoMensual_proyectoId_anio_mes_key" ON "PresupuestoMensual"("proyectoId", "anio", "mes");

-- AddForeignKey
ALTER TABLE "PresupuestoMensual" ADD CONSTRAINT "PresupuestoMensual_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

