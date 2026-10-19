import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { parsearExcelBuffer } from "@/lib/excel-parse";
import { sincronizarPadron } from "@/lib/sincronizar-padron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TAMANO_MAXIMO = 10 * 1024 * 1024;

function autorizado(request: Request): boolean {
  // Sin secreto configurado se rechaza todo: este endpoint puede revocar accesos.
  const secreto = process.env.PADRON_SYNC_SECRET;
  if (!secreto) return false;
  const recibido = Buffer.from(request.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secreto}`);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

/**
 * Lo llama un flujo de Power Automate con el archivo de RH (BASE CONTROL
 * VEHICULAR.xlsx). Formatos aceptados: texto plano con el archivo en base64
 * (el que usa el flujo), JSON { "$content": "<base64>" }, o el binario tal cual.
 * Power Automate manda un cuerpo de tipo archivo en streaming (chunked) y ese
 * cuerpo llega vacío a la función; como texto lo manda completo.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!autorizado(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const aBuffer = (base64: string) => {
    const bytes = Buffer.from(base64.trim().replace(/^"|"$/g, ""), "base64");
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  };
  const tipo = request.headers.get("content-type") ?? "";
  let buffer: ArrayBuffer;
  try {
    if (tipo.includes("text/plain")) {
      buffer = aBuffer(await request.text());
    } else if (tipo.includes("application/json")) {
      const cuerpo = (await request.json()) as { $content?: string };
      if (!cuerpo.$content) return NextResponse.json({ error: "El cuerpo JSON debe traer $content en base64." }, { status: 400 });
      buffer = aBuffer(cuerpo.$content);
    } else {
      buffer = await request.arrayBuffer();
    }
  } catch {
    return NextResponse.json({ error: "No se pudo leer el cuerpo de la solicitud." }, { status: 400 });
  }
  if (buffer.byteLength === 0) return NextResponse.json({ error: "Llegó un archivo vacío." }, { status: 400 });
  if (buffer.byteLength > TAMANO_MAXIMO) return NextResponse.json({ error: "El archivo excede 10 MB." }, { status: 413 });

  let hojas;
  try {
    hojas = parsearExcelBuffer(buffer, 20_000);
  } catch {
    return NextResponse.json({ error: "No se pudo leer el Excel (¿dañado o protegido con contraseña?)." }, { status: 400 });
  }

  const simular = new URL(request.url).searchParams.get("simular") === "1";
  const r = await sincronizarPadron(hojas, { simular });
  // Solo conteos en la respuesta: queda en el historial de ejecuciones de Power Automate.
  return NextResponse.json({
    simulacion: simular,
    aplicada: r.aplicada,
    motivoFreno: r.motivoFreno,
    filasArchivo: r.filasArchivo,
    validas: r.validas,
    invalidas: r.invalidas.length,
    altasPadron: r.altasPadron,
    bajasPadron: r.bajasPadron,
    revocados: r.revocados.length,
    reactivados: r.reactivados.length,
    enObservacion: r.enObservacion.length,
    coincidenPorNombre: r.coincidenPorNombre.length,
  }, { status: r.aplicada ? 200 : 422 });
}
