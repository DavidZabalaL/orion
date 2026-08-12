-- CreateTable
CREATE TABLE "VistaDashboardBI" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "widgets" JSONB NOT NULL,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VistaDashboardBI_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VistaDashboardBI" ADD CONSTRAINT "VistaDashboardBI_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
