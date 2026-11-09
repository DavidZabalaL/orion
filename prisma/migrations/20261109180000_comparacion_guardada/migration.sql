-- CreateTable
CREATE TABLE "ComparacionGuardada" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComparacionGuardada_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ComparacionGuardada" ADD CONSTRAINT "ComparacionGuardada_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
