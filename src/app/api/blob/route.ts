import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
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

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const response = await fetch(parsed.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: "manual",
  });

  if (!response.ok) {
    return new NextResponse("No se pudo obtener el archivo", { status: response.status });
  }

  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  return new NextResponse(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
