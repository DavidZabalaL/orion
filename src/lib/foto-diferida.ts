import { comprimirImagen } from "@/lib/comprimir-imagen";
import { subirFotoChecklist } from "@/app/(app)/checklist/actions";
import { recargarSiVersionNueva, MENSAJE_VERSION_NUEVA } from "@/lib/version-nueva";

export type ResultadoFotoDiferida = { ok: true; url: string } | { ok: false; error: string };

/**
 * Comprime la foto y arranca su subida a Vercel Blob EN SEGUNDO PLANO, sin
 * esperar a que termine — quien llama recibe el archivo comprimido de
 * inmediato (para marcar el campo como "listo" y dejar avanzar el wizard) y
 * por separado una promesa `subida` que resuelve cuando la subida real
 * termina (o falla).
 *
 * Por qué: antes cada foto se subía de inmediato bloqueando ese paso del
 * wizard (dependía de tener red en el momento exacto de cada foto); el
 * arreglo siguiente pasó al extremo contrario, comprimir todo y subirlo en
 * bloque hasta el final (dependía de retener en memoria las ~15-50 fotos de
 * toda la sesión). En campo, con equipos ya justos de memoria, eso seguía
 * tronando alrededor de la foto 15 del semanal. Este diseño intermedio no
 * bloquea el avance (la subida real pasa en segundo plano) Y libera cada
 * foto de la memoria en cuanto su subida termina, en vez de retenerlas
 * todas hasta el final — quien la usa debe borrar su copia local del
 * archivo apenas `subida` resuelva con éxito (ver wizards de checklist).
 */
export async function prepararFotoDiferida(file: File): Promise<{ archivo: File; subida: Promise<ResultadoFotoDiferida> }> {
  const archivo = await comprimirImagen(file);
  const subida = (async (): Promise<ResultadoFotoDiferida> => {
    const fd = new FormData();
    fd.set("file", archivo);
    let r: Awaited<ReturnType<typeof subirFotoChecklist>>;
    try {
      r = await subirFotoChecklist(fd);
    } catch (e) {
      // Nunca rechazar: los wizards solo usan .then(), y una promesa rechazada dejaba la foto sin URL ni aviso.
      return { ok: false, error: recargarSiVersionNueva(e) ? MENSAJE_VERSION_NUEVA : "No se pudo subir la foto. Revisa tu conexión." };
    }
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, url: r.url };
  })();
  return { archivo, subida };
}
