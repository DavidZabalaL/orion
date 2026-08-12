-- CreateEnum
CREATE TYPE "FrecuenciaReporte" AS ENUM ('DIARIO', 'SEMANAL', 'MENSUAL');

-- CreateTable
CREATE TABLE "ReporteProgramado" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "camposJson" JSONB NOT NULL,
    "filtrosJson" JSONB NOT NULL,
    "destinatarios" JSONB NOT NULL,
    "hora" TEXT NOT NULL,
    "frecuencia" "FrecuenciaReporte" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReporteProgramado_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReporteProgramado" ADD CONSTRAINT "ReporteProgramado_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
