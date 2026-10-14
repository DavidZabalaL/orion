/**
 * Validación de archivos subidos por su contenido real (magic bytes), no por
 * `file.type`, que lo declara el cliente y se puede falsificar.
 */
export type TipoArchivoDetectado = "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "image/heic";

export const TIPOS_IMAGEN: TipoArchivoDetectado[] = ["image/jpeg", "image/png", "image/webp", "image/heic"];
export const TIPOS_DOCUMENTO: TipoArchivoDetectado[] = ["application/pdf", ...TIPOS_IMAGEN];

const MARCAS_HEIF = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1", "heif"]);

function ascii(bytes: Uint8Array, desde: number, hasta: number): string {
  return String.fromCharCode(...bytes.subarray(desde, hasta));
}

export function detectarTipoArchivo(bytes: Uint8Array): TipoArchivoDetectado | null {
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 4) === "PNG" && bytes[4] === 0x0d && bytes[5] === 0x0a) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp" && MARCAS_HEIF.has(ascii(bytes, 8, 12))) return "image/heic";
  return null;
}

/**
 * Lee la cabecera del archivo y regresa su tipo real si está en `permitidos`;
 * si no, null. El tipo detectado es el que debe usarse como contentType al
 * guardarlo (nunca el que declaró el cliente).
 */
export async function validarTipoArchivo(file: File, permitidos: TipoArchivoDetectado[]): Promise<TipoArchivoDetectado | null> {
  const cabecera = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const tipo = detectarTipoArchivo(cabecera);
  return tipo && permitidos.includes(tipo) ? tipo : null;
}

const EXTENSION: Record<TipoArchivoDetectado, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

/**
 * Nombre seguro para la ruta del blob: solo [a-zA-Z0-9._-], sin rutas
 * (`../`), longitud acotada y con la extensión del tipo real detectado.
 */
export function nombreArchivoSeguro(nombreOriginal: string, tipo: TipoArchivoDetectado): string {
  const base = nombreOriginal
    .replace(/\.[^.]*$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return `${base || "archivo"}.${EXTENSION[tipo]}`;
}
