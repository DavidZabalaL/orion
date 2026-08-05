-- Soporte para el botón de encendido/apagado (disponibilidad): registra cuándo
-- fue el último cambio, para poder contar "días sin operar" desde ese momento.
ALTER TABLE "Unidad" ADD COLUMN "fechaCambioDisponibilidad" TIMESTAMP(3);
