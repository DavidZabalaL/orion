-- CreateTable
CREATE TABLE "SincronizacionPadron" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aplicada" BOOLEAN NOT NULL,
    "motivoFreno" TEXT,
    "filasArchivo" INTEGER NOT NULL,
    "validas" INTEGER NOT NULL,
    "altasPadron" INTEGER NOT NULL,
    "bajasPadron" INTEGER NOT NULL,
    "invalidas" JSONB NOT NULL,
    "revocados" JSONB NOT NULL,
    "reactivados" JSONB NOT NULL,
    "enObservacion" JSONB NOT NULL,
    "coincidenPorNombre" JSONB NOT NULL,

    CONSTRAINT "SincronizacionPadron_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AusenciaPadron" (
    "curp" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "primeraAusencia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lecturas" INTEGER NOT NULL DEFAULT 1,
    "revocadoEn" TIMESTAMP(3),

    CONSTRAINT "AusenciaPadron_pkey" PRIMARY KEY ("curp")
);

-- CreateIndex
CREATE INDEX "SincronizacionPadron_createdAt_idx" ON "SincronizacionPadron"("createdAt");
