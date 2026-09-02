-- AlterTable: operadorId pasa a opcional, se agrega usuarioId opcional —
-- exactamente uno de los dos debe ir lleno (CHECK al final).
ALTER TABLE "BitacoraUsoUnidad" ALTER COLUMN "operadorId" DROP NOT NULL;
ALTER TABLE "BitacoraUsoUnidad" ADD COLUMN "usuarioId" TEXT;

-- CreateIndex
CREATE INDEX "BitacoraUsoUnidad_usuarioId_idx" ON "BitacoraUsoUnidad"("usuarioId");

-- AddForeignKey
ALTER TABLE "BitacoraUsoUnidad" ADD CONSTRAINT "BitacoraUsoUnidad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheck: exactamente uno de operadorId/usuarioId, nunca ambos ni ninguno.
ALTER TABLE "BitacoraUsoUnidad" ADD CONSTRAINT "BitacoraUsoUnidad_operador_o_usuario_check"
  CHECK (("operadorId" IS NOT NULL) <> ("usuarioId" IS NOT NULL));
