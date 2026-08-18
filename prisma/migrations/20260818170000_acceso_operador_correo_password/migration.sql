-- CreateEnum
CREATE TYPE "MetodoAcceso" AS ENUM ('MICROSOFT', 'CORREO_PASSWORD');

-- AlterTable
ALTER TABLE "Usuario"
  ADD COLUMN "metodoAcceso" "MetodoAcceso" NOT NULL DEFAULT 'MICROSOFT',
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "invitacionToken" TEXT,
  ADD COLUMN "invitacionExpiraEn" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_invitacionToken_key" ON "Usuario"("invitacionToken");
