-- CreateEnum
CREATE TYPE "FormatoReporte" AS ENUM ('PDF', 'EXCEL');

-- AlterTable
ALTER TABLE "ReporteProgramado" ADD COLUMN     "formato" "FormatoReporte" NOT NULL DEFAULT 'EXCEL',
ADD COLUMN     "ultimaEjecucionEn" TIMESTAMP(3),
ADD COLUMN     "ultimoErrorDetalle" TEXT,
ADD COLUMN     "ultimoEstatus" TEXT;

-- CreateTable
CREATE TABLE "EjecucionReporteProgramado" (
    "id" TEXT NOT NULL,
    "reporteId" TEXT NOT NULL,
    "ejecutadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estatus" TEXT NOT NULL,
    "detalle" TEXT,
    "destinatariosCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EjecucionReporteProgramado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EjecucionReporteProgramado_reporteId_ejecutadoEn_idx" ON "EjecucionReporteProgramado"("reporteId", "ejecutadoEn");

-- AddForeignKey
ALTER TABLE "EjecucionReporteProgramado" ADD CONSTRAINT "EjecucionReporteProgramado_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "ReporteProgramado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
