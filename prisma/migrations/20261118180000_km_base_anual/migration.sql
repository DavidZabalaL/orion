-- CreateTable
CREATE TABLE "KmBaseAnual" (
    "id" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "km" INTEGER NOT NULL,
    "fuente" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KmBaseAnual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KmBaseAnual_numeroEconomico_anio_key" ON "KmBaseAnual"("numeroEconomico", "anio");

-- AddForeignKey
ALTER TABLE "KmBaseAnual" ADD CONSTRAINT "KmBaseAnual_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;

