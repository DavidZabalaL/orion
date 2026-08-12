-- CreateTable
CREATE TABLE "ConfiguracionNotificaciones" (
    "id" TEXT NOT NULL,
    "alertaGpsSinSenalHoras" INTEGER NOT NULL DEFAULT 48,
    "alertaGpsSinSenalActiva" BOOLEAN NOT NULL DEFAULT true,
    "alertaMantenimientoDiasPrevios" INTEGER[] DEFAULT ARRAY[15, 5]::INTEGER[],
    "alertaMantenimientoActiva" BOOLEAN NOT NULL DEFAULT true,
    "alertaRendimientoUmbralPct" INTEGER NOT NULL DEFAULT 20,
    "alertaRendimientoActiva" BOOLEAN NOT NULL DEFAULT true,
    "alertaSeguroDiasPrevios" INTEGER[] DEFAULT ARRAY[30, 7]::INTEGER[],
    "alertaSeguroActiva" BOOLEAN NOT NULL DEFAULT true,
    "alertaSenalPerdidaMinutos" INTEGER NOT NULL DEFAULT 15,
    "alertaSenalPerdidaActiva" BOOLEAN NOT NULL DEFAULT true,
    "alertaChecklistFaltanteActiva" BOOLEAN NOT NULL DEFAULT true,
    "alertaChecklistHoraLimite" TEXT NOT NULL DEFAULT '18:00',
    "alertaDocumentoOperadorDiasPrevios" INTEGER[] DEFAULT ARRAY[60, 30, 7]::INTEGER[],
    "alertaDocumentoOperadorActiva" BOOLEAN NOT NULL DEFAULT true,
    "destinatariosCorreo" JSONB NOT NULL,
    "actualizadoPorId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionNotificaciones_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ConfiguracionNotificaciones" ADD CONSTRAINT "ConfiguracionNotificaciones_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
