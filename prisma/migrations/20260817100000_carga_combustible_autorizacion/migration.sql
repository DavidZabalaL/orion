-- Add CARGA_COMBUSTIBLE to TipoChecklist enum
ALTER TYPE "TipoChecklist" ADD VALUE IF NOT EXISTS 'CARGA_COMBUSTIBLE';

-- CreateTable: SolicitudAutorizacionCombustible
CREATE TABLE "SolicitudAutorizacionCombustible" (
    "id"                     TEXT NOT NULL,
    "proyectoId"             TEXT NOT NULL,
    "numeroEconomico"        TEXT,
    "monto"                  DECIMAL(12,2) NOT NULL,
    "litros"                 DECIMAL(10,2),
    "motivo"                 TEXT NOT NULL,
    "excedente"              DECIMAL(12,2),
    "periodoPresupuesto"     TEXT,
    "estatus"                TEXT NOT NULL DEFAULT 'PENDIENTE',
    "solicitadoPorId"        TEXT NOT NULL,
    "aprobadoPorId"          TEXT,
    "fechaRespuesta"         TIMESTAMP(3),
    "observacionesAprobador" TEXT,
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudAutorizacionCombustible_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SolicitudAutorizacionCombustible"
    ADD CONSTRAINT "SolicitudAutorizacionCombustible_proyectoId_fkey"
    FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudAutorizacionCombustible"
    ADD CONSTRAINT "SolicitudAutorizacionCombustible_solicitadoPorId_fkey"
    FOREIGN KEY ("solicitadoPorId") REFERENCES "Usuario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudAutorizacionCombustible"
    ADD CONSTRAINT "SolicitudAutorizacionCombustible_aprobadoPorId_fkey"
    FOREIGN KEY ("aprobadoPorId") REFERENCES "Usuario"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "SolicitudAutorizacionCombustible_proyectoId_idx"
    ON "SolicitudAutorizacionCombustible"("proyectoId");

CREATE INDEX "SolicitudAutorizacionCombustible_estatus_idx"
    ON "SolicitudAutorizacionCombustible"("estatus");

CREATE INDEX "SolicitudAutorizacionCombustible_createdAt_idx"
    ON "SolicitudAutorizacionCombustible"("createdAt");
