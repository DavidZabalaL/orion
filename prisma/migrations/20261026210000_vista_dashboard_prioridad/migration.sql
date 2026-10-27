-- AlterTable
ALTER TABLE "VistaDashboardBI" ADD COLUMN "rolesPrioritarios" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "proyectosPrioritarios" TEXT[] DEFAULT ARRAY[]::TEXT[];
