-- CreateTable
CREATE TABLE "BitacoraUsoUnidad" (
    "id" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fin" TIMESTAMP(3),

    CONSTRAINT "BitacoraUsoUnidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BitacoraUsoUnidad_operadorId_idx" ON "BitacoraUsoUnidad"("operadorId");

-- CreateIndex
CREATE INDEX "BitacoraUsoUnidad_numeroEconomico_idx" ON "BitacoraUsoUnidad"("numeroEconomico");

-- CreateIndex
CREATE INDEX "BitacoraUsoUnidad_inicio_idx" ON "BitacoraUsoUnidad"("inicio");

-- AddForeignKey
ALTER TABLE "BitacoraUsoUnidad" ADD CONSTRAINT "BitacoraUsoUnidad_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Operador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitacoraUsoUnidad" ADD CONSTRAINT "BitacoraUsoUnidad_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;
