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
 *
 * `resizeWidth` se pasa directo a `createImageBitmap` en vez de decodificar
 * a resolución completa y luego escalar en un canvas: eso último obliga al
 * navegador a materializar el bitmap original sin comprimir en memoria antes
 * de poder reducirlo (una foto de cámara de 12-48MP decodificada son
 * 150-600+ MB de RGBA cruda), que es lo que tronaba la pestaña con "no se ha
 * podido completar la operación anterior por falta de memoria" en celulares
 * de gama media/baja al capturar la foto del checklist. Con `resizeWidth`,
 * el decodificador del navegador reduce la imagen como parte de la propia
 * decodificación, sin pasar nunca por ese pico de memoria a resolución
 * completa. Asume que el ancho de la foto es el lado mayor (cierto casi
 * siempre en fotos de cámara trasera, incluso en modo retrato — el sensor es
 * físicamente apaisado y la orientación se guarda aparte en EXIF); si no lo
 * fuera, el resultado solo queda un poco más grande de lo esperado, nunca
 * distorsionado.
 */
export async function comprimirImagen(file: File, maxDimension = 1600, calidad = 0.75): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { resizeWidth: maxDimension, resizeQuality: "medium" });

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", calidad));
    if (!blob || blob.size >= file.size) return file;

    const nombre = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
