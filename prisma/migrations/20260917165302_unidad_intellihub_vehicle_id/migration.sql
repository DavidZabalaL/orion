-- AlterTable
ALTER TABLE "Unidad" ADD COLUMN     "intellihubVehicleId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_intellihubVehicleId_key" ON "Unidad"("intellihubVehicleId");
