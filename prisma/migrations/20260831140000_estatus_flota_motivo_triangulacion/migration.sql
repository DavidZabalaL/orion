-- CreateEnum
CREATE TYPE "MotivoIndisponibilidad" AS ENUM ('MANTENIMIENTO', 'SINIESTRO', 'SIN_OPERADOR', 'TRAMITE_DOCUMENTACION', 'SIN_COMBUSTIBLE', 'OTRO');

-- AlterTable
ALTER TABLE "Unidad" ADD COLUMN     "motivoIndisponibilidad" "MotivoIndisponibilidad",
ADD COLUMN     "motivoIndisponibilidadDetalle" TEXT;

-- AlterTable
ALTER TABLE "HistoricoDisponibilidadUnidad" ADD COLUMN     "motivo" "MotivoIndisponibilidad",
ADD COLUMN     "motivoDetalle" TEXT;

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "conciliado";

-- AlterTable
ALTER TABLE "ConfiguracionNotificaciones" ADD COLUMN     "alertaCombustibleSinActividadActiva" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "alertaDisponibleSinGpsDias" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "alertaDisponibleSinGpsDiasActiva" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "alertaTagSinGpsActiva" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "alertaTagSinGpsMinutos" INTEGER NOT NULL DEFAULT 60;
