-- DropForeignKey
ALTER TABLE "HistoricoTicketRescate" DROP CONSTRAINT "HistoricoTicketRescate_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "HistoricoTicketRescate" DROP CONSTRAINT "HistoricoTicketRescate_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "InsumoInventario" DROP CONSTRAINT "InsumoInventario_proyectoId_fkey";

-- DropForeignKey
ALTER TABLE "TicketRescate" DROP CONSTRAINT "TicketRescate_asignadoAId_fkey";

-- DropForeignKey
ALTER TABLE "TicketRescate" DROP CONSTRAINT "TicketRescate_motivoId_fkey";

-- DropForeignKey
ALTER TABLE "TicketRescate" DROP CONSTRAINT "TicketRescate_numeroEconomico_fkey";

-- DropForeignKey
ALTER TABLE "TicketRescate" DROP CONSTRAINT "TicketRescate_proyectoId_fkey";

-- DropForeignKey
ALTER TABLE "TicketRescate" DROP CONSTRAINT "TicketRescate_reportadoPorId_fkey";

-- DropIndex
DROP INDEX "GastoVehicular_historicoProyectoId_idx";

-- AlterTable
ALTER TABLE "Accidente" ALTER COLUMN "evidencias" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CatalogoMotivoRescate" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HistoricoTicketRescate" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InsumoInventario" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Siniestro" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TicketRescate" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "MetricaBI" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "datasetId" TEXT NOT NULL,
    "campoId" TEXT NOT NULL,
    "agregacion" TEXT NOT NULL,
    "filtrosBaseJson" JSONB,
    "formatoJson" JSONB,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricaBI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccesoReporteBI" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipoRecurso" TEXT NOT NULL,
    "recursoId" TEXT,
    "accion" TEXT NOT NULL,
    "datasetIds" TEXT[],
    "proyectoIds" TEXT[],
    "detalle" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccesoReporteBI_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MetricaBI_clave_key" ON "MetricaBI"("clave");

-- CreateIndex
CREATE INDEX "MetricaBI_datasetId_idx" ON "MetricaBI"("datasetId");

-- CreateIndex
CREATE INDEX "AccesoReporteBI_userId_createdAt_idx" ON "AccesoReporteBI"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AccesoReporteBI_tipoRecurso_recursoId_idx" ON "AccesoReporteBI"("tipoRecurso", "recursoId");

-- CreateIndex
CREATE INDEX "Siniestro_folio_idx" ON "Siniestro"("folio");

-- AddForeignKey
ALTER TABLE "MetricaBI" ADD CONSTRAINT "MetricaBI_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoReporteBI" ADD CONSTRAINT "AccesoReporteBI_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsumoInventario" ADD CONSTRAINT "InsumoInventario_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketRescate" ADD CONSTRAINT "TicketRescate_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketRescate" ADD CONSTRAINT "TicketRescate_motivoId_fkey" FOREIGN KEY ("motivoId") REFERENCES "CatalogoMotivoRescate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketRescate" ADD CONSTRAINT "TicketRescate_reportadoPorId_fkey" FOREIGN KEY ("reportadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketRescate" ADD CONSTRAINT "TicketRescate_asignadoAId_fkey" FOREIGN KEY ("asignadoAId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketRescate" ADD CONSTRAINT "TicketRescate_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoTicketRescate" ADD CONSTRAINT "HistoricoTicketRescate_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "TicketRescate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoTicketRescate" ADD CONSTRAINT "HistoricoTicketRescate_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
