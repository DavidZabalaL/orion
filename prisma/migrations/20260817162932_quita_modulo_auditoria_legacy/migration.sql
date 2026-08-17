/*
  Warnings:

  - You are about to drop the `Auditoria` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Auditoria" DROP CONSTRAINT "Auditoria_numeroEconomico_fkey";

-- DropForeignKey
ALTER TABLE "Auditoria" DROP CONSTRAINT "Auditoria_revisorId_fkey";

-- DropTable
DROP TABLE "Auditoria";

-- DropEnum
DROP TYPE "CategoriaAuditoria";

-- DropEnum
DROP TYPE "EstatusAuditoria";

-- DropEnum
DROP TYPE "TipoDiscrepancia";
