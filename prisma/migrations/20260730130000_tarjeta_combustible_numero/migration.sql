-- DropForeignKey
ALTER TABLE "Unidad" DROP CONSTRAINT "Unidad_tarjetaCombustibleId_fkey";

-- DropIndex
DROP INDEX "Unidad_tarjetaCombustibleId_key";

-- AlterTable
ALTER TABLE "Unidad" DROP COLUMN "tarjetaCombustibleId",
ADD COLUMN     "numeroTarjetaCombustible" TEXT;

