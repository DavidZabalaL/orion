-- CreateTable
CREATE TABLE "HistoricoDisponibilidadUnidad" (
    "id" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "disponible" BOOLEAN NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3),

    CONSTRAINT "HistoricoDisponibilidadUnidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreferenciaUsuario" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,

    CONSTRAINT "PreferenciaUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoricoDisponibilidadUnidad_numeroEconomico_idx" ON "HistoricoDisponibilidadUnidad"("numeroEconomico");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenciaUsuario_usuarioId_clave_key" ON "PreferenciaUsuario"("usuarioId", "clave");

-- AddForeignKey
ALTER TABLE "HistoricoDisponibilidadUnidad" ADD CONSTRAINT "HistoricoDisponibilidadUnidad_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreferenciaUsuario" ADD CONSTRAINT "PreferenciaUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
