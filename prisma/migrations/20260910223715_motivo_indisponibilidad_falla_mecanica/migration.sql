-- AlterEnum
ALTER TYPE "MotivoIndisponibilidad" ADD VALUE 'FALLA_MECANICA';

-- DropForeignKey
ALTER TABLE "BitacoraUsoUnidad" DROP CONSTRAINT "BitacoraUsoUnidad_operadorId_fkey";

-- DropForeignKey
ALTER TABLE "BitacoraUsoUnidad" DROP CONSTRAINT "BitacoraUsoUnidad_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Combustible" DROP CONSTRAINT "Combustible_numeroEconomico_fkey";

-- AddForeignKey
ALTER TABLE "BitacoraUsoUnidad" ADD CONSTRAINT "BitacoraUsoUnidad_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Operador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitacoraUsoUnidad" ADD CONSTRAINT "BitacoraUsoUnidad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combustible" ADD CONSTRAINT "Combustible_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE SET NULL ON UPDATE CASCADE;
