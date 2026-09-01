import { renderToBuffer } from "@react-pdf/renderer";
import { EstatusFlotaDocument } from "@/components/dashboard/EstatusFlotaDocument";
import type { EstatusFlotaReporte } from "@/lib/reportes/estatus-flota";

// Server-only a propósito: `renderToBuffer` arrastra internals de Node
// (fs/stream) que no deben terminar en el bundle del navegador. Por eso vive
// separado de EstatusFlotaDocument.tsx, que sí se importa dinámicamente desde
// el cliente (EstatusFlotaModal, para armar el PDF de descarga en el navegador
// con `pdf(...).toBlob()`, la mitad universal de @react-pdf/renderer).
export async function generarEstatusFlotaBuffer(datos: EstatusFlotaReporte): Promise<Buffer> {
  return renderToBuffer(<EstatusFlotaDocument datos={datos} />);
}
