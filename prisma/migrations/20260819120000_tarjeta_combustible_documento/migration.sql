-- AlterTable
ALTER TABLE "Unidad" ADD COLUMN "tarjetaCombustibleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_tarjetaCombustibleId_key" ON "Unidad"("tarjetaCombustibleId");

-- AddForeignKey
ALTER TABLE "Unidad" ADD CONSTRAINT "Unidad_tarjetaCombustibleId_fkey" FOREIGN KEY ("tarjetaCombustibleId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
