// Autoguardado de checklists en progreso, en localStorage del dispositivo.
//
// Android puede recuperar de golpe la memoria de una pestaña de Chrome en
// segundo plano (por ejemplo mientras la app de Cámara está al frente
// tomando una foto) y recargarla en silencio al volver — eso borra todo el
// estado en memoria del wizard sin que el usuario lo pida. Como esto ocurre
// a nivel del sistema operativo, no se puede evitar desde la página; lo que
// sí se puede hacer es que, al recargar, el wizard recupere dónde se había
// quedado en vez de forzar a empezar de cero. Los wizards solo se montan
// después de darle "Iniciar" (nunca en el render inicial del servidor), así
// que leer localStorage aquí no genera desajustes de hidratación SSR/cliente.
//
// Los archivos (File) de fotos que aún no habían terminado de subirse al
// momento de la recarga no se pueden recuperar (un File en memoria no
// sobrevive una recarga de página, sea cual sea el mecanismo) — el usuario
// deberá volver a tomar esas fotos puntuales; el resto del progreso sí se
// conserva.

const PREFIJO = "orion-checklist-borrador:";

export function leerBorrador<T>(clave: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIJO + clave);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function guardarBorrador<T>(clave: string, datos: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIJO + clave, JSON.stringify(datos));
  } catch {
    // Almacenamiento lleno o no disponible (modo privado, cuota) — el
    // borrador simplemente no persiste; no es crítico para poder seguir.
  }
}

export function borrarBorrador(clave: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIJO + clave);
  } catch {
    // no-op
  }
}
