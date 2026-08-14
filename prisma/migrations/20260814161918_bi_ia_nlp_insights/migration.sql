-- CreateTable
CREATE TABLE "NlQueryLog" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "interpretacion" JSONB,
    "parametros" JSONB,
    "exito" BOOLEAN NOT NULL,
    "motivoRechazo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NlQueryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightCache" (
    "id" TEXT NOT NULL,
    "claveConsulta" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "datosHash" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsightCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NlQueryLog_usuarioId_createdAt_idx" ON "NlQueryLog"("usuarioId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InsightCache_claveConsulta_key" ON "InsightCache"("claveConsulta");

-- CreateIndex
CREATE INDEX "InsightCache_tipo_expiraEn_idx" ON "InsightCache"("tipo", "expiraEn");

-- AddForeignKey
ALTER TABLE "NlQueryLog" ADD CONSTRAINT "NlQueryLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
