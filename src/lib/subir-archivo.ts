import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const TAMANO_MAXIMO_BYTES = 15 * 1024 * 1024;

export async function subirArchivo(file: File, carpeta: string): Promise<{ url: string }> {
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    throw new Error("Tipo de archivo no permitido. Solo se aceptan PDF o imágenes (JPG, PNG, WEBP, HEIC).");
  }
  if (file.size > TAMANO_MAXIMO_BYTES) {
    throw new Error("El archivo excede el tamaño máximo permitido (15MB).");
  }

  const nombre = `${carpeta}/${crypto.randomUUID()}-${file.name}`;
  const blob = await put(nombre, file, { access: "private", addRandomSuffix: false });
  return { url: blob.url };
}

export async function crearDocumento(
  file: File,
  opciones: { carpeta: string; entidadRelacionada: string; entidadId: string; tipo: string }
) {
  const { url } = await subirArchivo(file, opciones.carpeta);
  return prisma.documento.create({
    data: {
      entidadRelacionada: opciones.entidadRelacionada,
      entidadId: opciones.entidadId,
      url,
      tipo: opciones.tipo,
    },
  });
}
