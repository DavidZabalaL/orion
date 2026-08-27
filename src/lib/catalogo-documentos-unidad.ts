import type { TipoDocumentoUnidad } from "@/generated/prisma/enums";

export const TIPO_DOCUMENTO_UNIDAD_LABEL: Record<TipoDocumentoUnidad, string> = {
  FACTURA_VEHICULO: "Factura del vehículo",
  FACTURA_ELEVADOR: "Factura del elevador/grúa",
  FACTURA_EXPORTACION: "Factura de exportación",
  FACTURA_COMERCIAL: "Factura comercial de venta",
  CARTA_FACTURA: "Carta factura",
  PEDIMENTO: "Pedimento de importación",
  CERTIFICADO_MONTAJE: "Certificado de montaje",
  TARJETA_CIRCULACION: "Tarjeta de circulación",
  REFRENDO: "Refrendo",
  DERECHOS_VEHICULARES: "Derechos vehiculares",
  ORDEN_EMBARQUE: "Orden de embarque",
  PROTOCOLO_ENTREGA: "Protocolo de entrega/embarque",
  NOTA_ENTREGA: "Nota de entrega",
  PEDIDO_COMPRA: "Pedido de compra",
  ACTA_ENTREGA_DOCUMENTOS: "Acta de entrega de documentos",
  OTRO: "Otro",
};

export const TIPOS_DOCUMENTO_UNIDAD = Object.keys(TIPO_DOCUMENTO_UNIDAD_LABEL) as TipoDocumentoUnidad[];

export const REQUIERE_ANIO = new Set<TipoDocumentoUnidad>(["REFRENDO", "DERECHOS_VEHICULARES"]);
