-- AlterTable
ALTER TABLE "Checklist" ADD COLUMN     "horometro" INTEGER;

-- AlterTable
ALTER TABLE "Unidad" ADD COLUMN     "tarjetaCirculacionId" TEXT,
ADD COLUMN     "tarjetaCombustibleId" TEXT;

-- CreateTable
CREATE TABLE "Placa" (
    "id" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "fechaDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaHasta" TIMESTAMP(3),
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Placa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionMantenimientoPreventivo" (
    "id" TEXT NOT NULL,
    "tipoVehiculo" "TipoVehiculo" NOT NULL,
    "intervaloKm" INTEGER NOT NULL,
    "intervaloHoras" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionMantenimientoPreventivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionWidgets" (
    "id" TEXT NOT NULL,
    "moduloId" TEXT NOT NULL,
    "widgets" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionWidgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Placa_numeroEconomico_idx" ON "Placa"("numeroEconomico");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionMantenimientoPreventivo_tipoVehiculo_key" ON "ConfiguracionMantenimientoPreventivo"("tipoVehiculo");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionWidgets_moduloId_key" ON "ConfiguracionWidgets"("moduloId");

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_tarjetaCombustibleId_key" ON "Unidad"("tarjetaCombustibleId");

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_tarjetaCirculacionId_key" ON "Unidad"("tarjetaCirculacionId");

-- AddForeignKey
ALTER TABLE "Unidad" ADD CONSTRAINT "Unidad_tarjetaCombustibleId_fkey" FOREIGN KEY ("tarjetaCombustibleId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unidad" ADD CONSTRAINT "Unidad_tarjetaCirculacionId_fkey" FOREIGN KEY ("tarjetaCirculacionId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placa" ADD CONSTRAINT "Placa_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;

