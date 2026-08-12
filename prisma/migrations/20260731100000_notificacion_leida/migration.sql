-- CreateTable
CREATE TABLE "NotificacionLeida" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "notificacionId" TEXT NOT NULL,
    "leidaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacionLeida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificacionLeida_usuarioId_idx" ON "NotificacionLeida"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificacionLeida_usuarioId_notificacionId_key" ON "NotificacionLeida"("usuarioId", "notificacionId");

-- AddForeignKey
ALTER TABLE "NotificacionLeida" ADD CONSTRAINT "NotificacionLeida_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

