-- CreateTable
CREATE TABLE "EntradaInsumo" (
    "id" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "proveedor" TEXT,
    "costoUnitario" DECIMAL(12,2),
    "nota" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntradaInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntradaInsumo_insumoId_idx" ON "EntradaInsumo"("insumoId");

-- AddForeignKey
ALTER TABLE "EntradaInsumo" ADD CONSTRAINT "EntradaInsumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "InsumoInventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntradaInsumo" ADD CONSTRAINT "EntradaInsumo_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
