import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { TIPOS_DOCUMENTO, nombreArchivoSeguro, validarTipoArchivo } from "@/lib/validar-archivo";

const TAMANO_MAXIMO_BYTES = 15 * 1024 * 1024;

export async function subirArchivo(file: File, carpeta: string): Promise<{ url: string }> {
  if (file.size > TAMANO_MAXIMO_BYTES) {
    throw new Error("El archivo excede el tamaño máximo permitido (15MB).");
  }
  // Se valida el contenido real del archivo, no el tipo que declara el navegador.
  const tipo = await validarTipoArchivo(file, TIPOS_DOCUMENTO);
  if (!tipo) {
    throw new Error("Tipo de archivo no permitido. Solo se aceptan PDF o imágenes (JPG, PNG, WEBP, HEIC).");
  }

  const nombre = `${carpeta}/${crypto.randomUUID()}-${nombreArchivoSeguro(file.name, tipo)}`;
  const blob = await put(nombre, file, { access: "private", addRandomSuffix: false, contentType: tipo });
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
