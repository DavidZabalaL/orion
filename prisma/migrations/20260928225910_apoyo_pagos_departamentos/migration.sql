-- AlterTable
ALTER TABLE "GastoVehicular" ADD COLUMN     "apoyoPago" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "departamentoApoyoId" TEXT;

-- CreateTable
CREATE TABLE "DepartamentoApoyo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartamentoApoyo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepartamentoApoyo_nombre_key" ON "DepartamentoApoyo"("nombre");

-- CreateIndex
CREATE INDEX "GastoVehicular_departamentoApoyoId_idx" ON "GastoVehicular"("departamentoApoyoId");

-- AddForeignKey
ALTER TABLE "GastoVehicular" ADD CONSTRAINT "GastoVehicular_departamentoApoyoId_fkey" FOREIGN KEY ("departamentoApoyoId") REFERENCES "DepartamentoApoyo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
