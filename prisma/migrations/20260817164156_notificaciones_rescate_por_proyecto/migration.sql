-- CreateTable
CREATE TABLE "ConfiguracionNotificacionProyecto" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "destinatariosRescate" JSONB NOT NULL,
    "actualizadoPorId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionNotificacionProyecto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionNotificacionProyecto_proyectoId_key" ON "ConfiguracionNotificacionProyecto"("proyectoId");

-- AddForeignKey
ALTER TABLE "ConfiguracionNotificacionProyecto" ADD CONSTRAINT "ConfiguracionNotificacionProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionNotificacionProyecto" ADD CONSTRAINT "ConfiguracionNotificacionProyecto_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
