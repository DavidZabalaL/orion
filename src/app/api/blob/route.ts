import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("URL requerida", { status: 400 });

  if (!url.includes(".blob.vercel-storage.com")) {
    return new NextResponse("URL no permitida", { status: 403 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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
