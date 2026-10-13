-- CreateEnum
CREATE TYPE "PosicionLlanta" AS ENUM ('DELANTERA_IZQUIERDA', 'DELANTERA_DERECHA', 'TRASERA_IZQUIERDA_EXTERIOR', 'TRASERA_IZQUIERDA_INTERIOR', 'TRASERA_DERECHA_EXTERIOR', 'TRASERA_DERECHA_INTERIOR');

-- AlterTable
ALTER TABLE "Unidad" ADD COLUMN     "dobleRodadoTrasero" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "HistorialLlanta" (
    "id" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "posicion" "PosicionLlanta" NOT NULL,
    "marca" TEXT,
    "medida" TEXT,
    "fechaInstalacion" TIMESTAMP(3) NOT NULL,
    "kmInstalacion" INTEGER,
    "fechaRetiro" TIMESTAMP(3),
    "kmRetiro" INTEGER,
    "motivoRetiro" TEXT,
    "gastoInstalacionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialLlanta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistorialLlanta_numeroEconomico_posicion_idx" ON "HistorialLlanta"("numeroEconomico", "posicion");

-- AddForeignKey
ALTER TABLE "HistorialLlanta" ADD CONSTRAINT "HistorialLlanta_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialLlanta" ADD CONSTRAINT "HistorialLlanta_gastoInstalacionId_fkey" FOREIGN KEY ("gastoInstalacionId") REFERENCES "GastoVehicular"("id") ON DELETE SET NULL ON UPDATE CASCADE;
