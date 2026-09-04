-- Autorregistro de Operadores: padrón de personal activo (validación de
-- identidad) + bitácora de intentos (freno de fuerza bruta).

CREATE TABLE "PersonalActivo" (
    "id" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "lugarDeTrabajo" TEXT NOT NULL,
    "curp" TEXT NOT NULL,
    "rfc" TEXT,
    "nss" TEXT,
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalActivo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonalActivo_curp_key" ON "PersonalActivo"("curp");
CREATE INDEX "PersonalActivo_curp_idx" ON "PersonalActivo"("curp");

CREATE TABLE "IntentoRegistroOperador" (
    "id" TEXT NOT NULL,
    "curp" TEXT NOT NULL,
    "exitoso" BOOLEAN NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentoRegistroOperador_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntentoRegistroOperador_curp_createdAt_idx" ON "IntentoRegistroOperador"("curp", "createdAt");
