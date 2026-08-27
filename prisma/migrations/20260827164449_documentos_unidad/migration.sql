-- CreateEnum
CREATE TYPE "TipoDocumentoUnidad" AS ENUM ('FACTURA_VEHICULO', 'FACTURA_ELEVADOR', 'FACTURA_EXPORTACION', 'FACTURA_COMERCIAL', 'CARTA_FACTURA', 'PEDIMENTO', 'CERTIFICADO_MONTAJE', 'TARJETA_CIRCULACION', 'REFRENDO', 'DERECHOS_VEHICULARES', 'ORDEN_EMBARQUE', 'PROTOCOLO_ENTREGA', 'NOTA_ENTREGA', 'PEDIDO_COMPRA', 'ACTA_ENTREGA_DOCUMENTOS', 'OTRO');

-- CreateTable
CREATE TABLE "DocumentoUnidad" (
    "id" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumentoUnidad" NOT NULL,
    "anio" INTEGER,
    "descripcion" TEXT,
    "archivoId" TEXT NOT NULL,
    "subidoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoUnidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoUnidad_numeroEconomico_idx" ON "DocumentoUnidad"("numeroEconomico");

-- CreateIndex
CREATE INDEX "DocumentoUnidad_tipoDocumento_idx" ON "DocumentoUnidad"("tipoDocumento");

-- AddForeignKey
ALTER TABLE "DocumentoUnidad" ADD CONSTRAINT "DocumentoUnidad_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoUnidad" ADD CONSTRAINT "DocumentoUnidad_archivoId_fkey" FOREIGN KEY ("archivoId") REFERENCES "Documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoUnidad" ADD CONSTRAINT "DocumentoUnidad_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
