import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { esRolGlobal, puedeDescargarPolizaSeguro, puedeVerPolizaSeguro, tienePermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo, unidadRestringidaParaOperador } from "@/lib/proyectos-usuario";

const MODULOS_POR_CARPETA: Record<string, string[]> = {
  polizas: ["F"],
  "documentos-unidad": ["A", "B"],
  tarjetas: ["A", "B"],
  licencias: ["L"],
  checklist: ["A.1", "A", "S", "R"],
  "": ["L", "A.1"],
};

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

async function tieneAccesoProyectoEnAlgunModulo(modulos: string[], proyectoId: string | null): Promise<boolean> {
  for (const m of modulos) {
    if (m !== "F" && !(await tienePermisoModulo(m))) continue;
    const permitidos = await proyectosPermitidosParaModulo(m);
    if (permitidos === null) return true;
    if (proyectoId ? permitidos.includes(proyectoId) : permitidos.length > 0) return true;
  }
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

  if (!(await esRolGlobal())) {
    const modulosCarpeta = MODULOS_POR_CARPETA[carpeta] ?? [];
    const doc = await prisma.documento.findFirst({
      where: { url: parsed.toString() },
      include: {
        seguros: { select: { unidad: { select: { proyectoId: true, numeroEconomico: true } } } },
        documentosUnidad: { select: { unidad: { select: { proyectoId: true, numeroEconomico: true } } } },
        unidadTarjetaCirculacion: { select: { proyectoId: true, numeroEconomico: true } },
        unidadTarjetaCombustible: { select: { proyectoId: true, numeroEconomico: true } },
        checklists: { select: { numeroEconomico: true, unidad: { select: { proyectoId: true } } } },
        gastos: { select: { proyectoReportanteId: true, numeroEconomico: true, unidad: { select: { proyectoId: true } } } },
        siniestro: { select: { numeroEconomico: true, unidad: { select: { proyectoId: true } } } },
        documentosOperador: { select: { operador: { select: { proyectoId: true } } } },
        operadoresFoto: { select: { proyectoId: true } },
      },
    });

    let proyectoId: string | null = null;
    let numeroEconomico: string | null = null;

    if (doc) {
      if (doc.seguros[0]?.unidad) {
        proyectoId = doc.seguros[0].unidad.proyectoId;
        numeroEconomico = doc.seguros[0].unidad.numeroEconomico;
      } else if (doc.documentosUnidad[0]?.unidad) {
        proyectoId = doc.documentosUnidad[0].unidad.proyectoId;
        numeroEconomico = doc.documentosUnidad[0].unidad.numeroEconomico;
      } else if (doc.unidadTarjetaCirculacion) {
        proyectoId = doc.unidadTarjetaCirculacion.proyectoId;
        numeroEconomico = doc.unidadTarjetaCirculacion.numeroEconomico;
      } else if (doc.unidadTarjetaCombustible) {
        proyectoId = doc.unidadTarjetaCombustible.proyectoId;
        numeroEconomico = doc.unidadTarjetaCombustible.numeroEconomico;
      } else if (doc.checklists[0]) {
        proyectoId = doc.checklists[0].unidad?.proyectoId ?? null;
        numeroEconomico = doc.checklists[0].numeroEconomico;
      } else if (doc.gastos[0]) {
        proyectoId = doc.gastos[0].proyectoReportanteId ?? doc.gastos[0].unidad?.proyectoId ?? null;
        numeroEconomico = doc.gastos[0].numeroEconomico;
      } else if (doc.siniestro) {
        proyectoId = doc.siniestro.unidad?.proyectoId ?? null;
        numeroEconomico = doc.siniestro.numeroEconomico;
      } else if (doc.documentosOperador[0]?.operador) {
        proyectoId = doc.documentosOperador[0].operador.proyectoId;
      } else if (doc.operadoresFoto[0]) {
        proyectoId = doc.operadoresFoto[0].proyectoId;
      } else if (doc.entidadId) {
        if (doc.entidadRelacionada === "DocumentoOperador" || doc.entidadRelacionada === "Operador") {
          const op = await prisma.operador.findUnique({ where: { id: doc.entidadId }, select: { proyectoId: true } });
          proyectoId = op?.proyectoId ?? null;
        } else if (doc.entidadRelacionada === "Unidad" || doc.entidadRelacionada === "DocumentoUnidad") {
          const u = await prisma.unidad.findUnique({
            where: { numeroEconomico: doc.entidadId },
            select: { proyectoId: true, numeroEconomico: true },
          });
          proyectoId = u?.proyectoId ?? null;
          numeroEconomico = u?.numeroEconomico ?? null;
        }
      }
    }

    const restringida = await unidadRestringidaParaOperador();
    if (restringida.esOperador && numeroEconomico && !restringida.numerosEconomicos.includes(numeroEconomico)) {
      return new NextResponse("No tienes permiso para ver este archivo", { status: 403 });
    }

    if (!(await tieneAccesoProyectoEnAlgunModulo(modulosCarpeta, proyectoId))) {
      return new NextResponse("No tienes permiso para ver este archivo", { status: 403 });
    }
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
