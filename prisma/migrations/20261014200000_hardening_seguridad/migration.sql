-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "entraOid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_entraOid_key" ON "Usuario"("entraOid");

-- CreateIndex
CREATE INDEX "IntentoRegistroOperador_ip_createdAt_idx" ON "IntentoRegistroOperador"("ip", "createdAt");

-- CreateTable
CREATE TABLE "IntentoAcceso" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "ip" TEXT,
    "exitoso" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentoAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntentoAcceso_tipo_clave_createdAt_idx" ON "IntentoAcceso"("tipo", "clave", "createdAt");

-- CreateIndex
CREATE INDEX "IntentoAcceso_tipo_ip_createdAt_idx" ON "IntentoAcceso"("tipo", "ip", "createdAt");

-- Data: los tokens de invitación/recuperación pasan a guardarse como SHA-256
-- (hex) del token en claro (ver src/lib/secreto.ts → hashToken). Se convierten
-- los pendientes para que los enlaces ya enviados sigan funcionando.
UPDATE "Usuario"
SET "invitacionToken" = encode(sha256(convert_to("invitacionToken", 'UTF8')), 'hex')
WHERE "invitacionToken" IS NOT NULL;
