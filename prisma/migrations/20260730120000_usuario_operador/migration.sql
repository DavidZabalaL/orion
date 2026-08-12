-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "operadorId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_operadorId_key" ON "Usuario"("operadorId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Operador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

