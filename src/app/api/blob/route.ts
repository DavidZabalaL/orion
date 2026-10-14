import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { esRolGlobal, puedeDescargarPolizaSeguro, puedeVerPolizaSeguro, tienePermisoModulo } from "@/lib/permisos";

/**
 * Qué se necesita para ver un archivo, según la carpeta donde se guardó en
 * Vercel Blob (ver src/lib/subir-archivo.ts y subirFotoChecklist). Basta con
 * tener nivel "ver" en cualquiera de los módulos listados. Una carpeta que no
 * esté aquí solo la puede ver el rol global (falla cerrado).
 */
const PERMISO_POR_CARPETA: Record<string, () => Promise<boolean>> = {
  polizas: async () => (await puedeVerPolizaSeguro()) || (await puedeDescargarPolizaSeguro()),
  "documentos-unidad": () => algunModulo(["A", "B"]),
  tarjetas: () => algunModulo(["A", "B"]),
  licencias: () => algunModulo(["L"]),
  // Fotos de checklist; también las usan el reporte de accidentes (S) y la ficha de unidad (A).
  checklist: () => algunModulo(["A.1", "A", "S", "R"]),
  // Subidas directas desde el navegador (/api/checklist-upload), guardadas en la raíz del store.
  "": () => algunModulo(["L", "A.1"]),
};

async function algunModulo(modulos: string[]): Promise<boolean> {
  for (const m of modulos) if (await tienePermisoModulo(m)) return true;
  return false;
}

/** Tipos que se sirven en línea; cualquier otro se fuerza a descarga como binario. */
const TIPOS_EN_LINEA = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("URL requerida", { status: 400 });

  // Validación estricta contra SSRF / fuga del token de Blob.
  // Antes se usaba url.includes(".blob.vercel-storage.com"), que dejaba pasar
  // URLs como https://evil.com/x?.blob.vercel-storage.com y enviaba el token
  // Authorization a un host arbitrario del atacante.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("URL inválida", { status: 400 });
  }
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".blob.vercel-storage.com") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    (parsed.port !== "" && parsed.port !== "443")
  ) {
    return new NextResponse("URL no permitida", { status: 403 });
  }

  // Autorización por documento: según la carpeta del archivo, el usuario debe
  // tener acceso al módulo dueño de ese tipo de documento.
  const segmentos = parsed.pathname.replace(/^\/+/, "").split("/");
  const carpeta = segmentos.length > 1 ? segmentos[0] : "";
  const permiso = PERMISO_POR_CARPETA[carpeta];
  const autorizado = permiso ? await permiso() : await esRolGlobal();
  if (!autorizado) {
    return new NextResponse("No tienes permiso para ver este archivo", { status: 403 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const response = await fetch(parsed.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: "manual",
  });

  if (!response.ok) {
    return new NextResponse("No se pudo obtener el archivo", { status: response.status });
  }

  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const enLinea = TIPOS_EN_LINEA.has(contentType);
  return new NextResponse(response.body, {
    headers: {
      "Content-Type": enLinea ? contentType : "application/octet-stream",
      "Content-Disposition": enLinea ? "inline" : "attachment",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
