/**
 * Comprime/redimensiona una foto en el navegador antes de subirla. Las
 * funciones serverless de Vercel rechazan el cuerpo de la petición si supera
 * ~4.5 MB — un límite de la plataforma, independiente del `bodySizeLimit`
 * que declara next.config.ts — y una foto de cámara sin comprimir (las
 * capturas de "capture=environment" van sin editar) lo supera fácilmente en
 * celulares modernos. La respuesta de ese rechazo no es JSON, así que en el
 * cliente se ve como "An unexpected response was received from the server"
 * en vez de un error claro. Si algo falla al comprimir, se regresa el
 * archivo original tal cual — nunca debe bloquear la subida.
 */
export async function comprimirImagen(file: File, maxDimension = 1600, calidad = 0.75): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", calidad));
    if (!blob || blob.size >= file.size) return file;

    const nombre = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
