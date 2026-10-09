-- CreateEnum
CREATE TYPE "EstatusReporteFalla" AS ENUM ('ABIERTO', 'CERRADO');

-- AlterTable
ALTER TABLE "Checklist" ADD COLUMN     "estatusFalla" "EstatusReporteFalla",
ADD COLUMN     "fechaCierreFalla" TIMESTAMP(3),
ADD COLUMN     "costoResolucionFalla" DECIMAL(12,2);
