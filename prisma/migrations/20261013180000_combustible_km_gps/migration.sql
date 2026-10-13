-- CreateEnum
CREATE TYPE "FuenteKmRecorridos" AS ENUM ('GPS', 'CAPTURA');

-- AlterTable
ALTER TABLE "Combustible" ADD COLUMN     "kmGps" INTEGER,
ADD COLUMN     "kmRecorridos" INTEGER,
ADD COLUMN     "fuenteKmRecorridos" "FuenteKmRecorridos";
