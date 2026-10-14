"use server";

import { hash } from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { enviarBienvenidaOperador } from "@/lib/email";
import { ipDeEncabezados } from "@/lib/limite-intentos";

const MIN_PASSWORD = 8;
const VENTANA_INTENTOS_MS = 15 * 60 * 1000; // 15 minutos
const MAX_INTENTOS = 5;

function normalizar(v: unknown): string {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

const MAX_INTENTOS_POR_IP = 10;
const MENSAJE_DEMASIADOS_INTENTOS = "Demasiados intentos. Espera unos minutos e intenta de nuevo, o contacta a Recursos Humanos.";

async function ip(): Promise<string | null> {
  try {
    return ipDeEncabezados(await headers());
  } catch {
    return null;
  }
}

// Se limita por CURP (adivinar el nombre de una persona) y por IP (probar
// muchos CURP distintos desde el mismo origen).
async function demasiadosIntentos(curp: string, registroIp: string | null): Promise<boolean> {
  const desde = new Date(Date.now() - VENTANA_INTENTOS_MS);
  const [porCurp, porIp] = await Promise.all([
    prisma.intentoRegistroOperador.count({ where: { curp, exitoso: false, createdAt: { gte: desde } } }),
    registroIp ? prisma.intentoRegistroOperador.count({ where: { ip: registroIp, exitoso: false, createdAt: { gte: desde } } }) : Promise.resolve(0),
  ]);
  return porCurp >= MAX_INTENTOS || porIp >= MAX_INTENTOS_POR_IP;
}

// No usa exigirPermisoModulo: es una ruta pública (sin sesión) — la
// "autorización" es que el CURP + nombre coincidan con el padrón de personal
// activo (ver src/app/(app)/usuarios/padron). Los mensajes de error son
// deliberadamente genéricos (no dicen si falló el CURP o el nombre) para no
// ayudar a alguien a ir adivinando datos de terceros.

export type ResultadoValidarIdentidad =
  | { ok: true; datos: { nombreCompleto: string } }
  | { ok: false; error: string };

export async function validarIdentidadOperador(formData: FormData): Promise<ResultadoValidarIdentidad> {
  const curp = normalizar(formData.get("curp"));
  const nombreCompleto = normalizar(formData.get("nombreCompleto"));

  if (!curp || !nombreCompleto) {
    return { ok: false, error: "Captura tu CURP y tu nombre completo." };
  }

  const registroIp = await ip();
  if (await demasiadosIntentos(curp, registroIp)) {
    return { ok: false, error: MENSAJE_DEMASIADOS_INTENTOS };
  }

  const personal = await prisma.personalActivo.findUnique({ where: { curp } });
  const coincide = !!personal && personal.nombreCompleto === nombreCompleto;

  if (!coincide) {
    await prisma.intentoRegistroOperador.create({ data: { curp, exitoso: false, ip: registroIp } });
    return { ok: false, error: "No encontramos esa combinación de CURP y nombre en el padrón de personal activo. Verifica los datos o contacta a Recursos Humanos." };
  }

  const operadorExistente = await prisma.operador.findUnique({ where: { curp }, select: { usuario: { select: { id: true } } } });
  if (operadorExistente?.usuario) {
    await prisma.intentoRegistroOperador.create({ data: { curp, exitoso: false, ip: registroIp } });
    return { ok: false, error: "Ya existe una cuenta registrada con este CURP. Si olvidaste tu contraseña, usa \"Recuperar contraseña\" en el inicio de sesión, o contacta a tu administrador." };
  }

  await prisma.intentoRegistroOperador.create({ data: { curp, exitoso: true, ip: registroIp } });
  return { ok: true, datos: { nombreCompleto: personal!.nombreCompleto } };
}

export type ResultadoRegistrarOperador = { ok: boolean; error?: string };

export async function registrarOperador(formData: FormData): Promise<ResultadoRegistrarOperador> {
  const curp = normalizar(formData.get("curp"));
  const nombreCompleto = normalizar(formData.get("nombreCompleto"));
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmarPassword = String(formData.get("confirmarPassword") ?? "");
  const proyectoId = String(formData.get("proyectoId") ?? "");

  if (!curp || !nombreCompleto || !correo || !proyectoId) {
    return { ok: false, error: "Faltan campos obligatorios." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { ok: false, error: "El correo no es válido." };
  }
  if (password.length < MIN_PASSWORD) {
    return { ok: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` };
  }
  if (password !== confirmarPassword) {
    return { ok: false, error: "Las contraseñas no coinciden." };
  }

  // Se revalida todo de nuevo aquí — nunca se confía en que el paso anterior
  // (validarIdentidadOperador) realmente haya corrido tal como lo vio el cliente.
  const registroIp = await ip();
  if (await demasiadosIntentos(curp, registroIp)) {
    return { ok: false, error: MENSAJE_DEMASIADOS_INTENTOS };
  }
  const personal = await prisma.personalActivo.findUnique({ where: { curp } });
  if (!personal || personal.nombreCompleto !== nombreCompleto) {
    await prisma.intentoRegistroOperador.create({ data: { curp, exitoso: false, ip: registroIp } });
    return { ok: false, error: "No encontramos esa combinación de CURP y nombre en el padrón de personal activo. Verifica los datos o contacta a Recursos Humanos." };
  }

  const proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { id: true, estatus: true } });
  if (!proyecto || proyecto.estatus !== "ACTIVO") {
    return { ok: false, error: "Selecciona un proyecto válido." };
  }

  const correoEnUso = await prisma.usuario.findUnique({ where: { correo }, select: { id: true } });
  if (correoEnUso) {
    return { ok: false, error: "Ese correo ya está en uso por otra cuenta." };
  }

  try {
    let operador = await prisma.operador.findUnique({ where: { curp }, select: { id: true, usuario: { select: { id: true } } } });
    if (operador?.usuario) {
      return { ok: false, error: "Ya existe una cuenta registrada con este CURP. Si olvidaste tu contraseña, usa \"Recuperar contraseña\" en el inicio de sesión." };
    }

    if (!operador) {
      const placeholderDoc = await prisma.documento.create({
        data: { entidadRelacionada: "Operador", entidadId: "pendiente", url: "/mock/placeholder.jpg", tipo: "foto" },
      });
      operador = await prisma.operador.create({
        data: {
          nombre: personal.nombreCompleto,
          curp,
          rfc: personal.rfc,
          nss: personal.nss,
          telefono: personal.telefono,
          fotoId: placeholderDoc.id,
          proyectoId,
          estatus: "ACTIVO",
          estatusDocumental: "INCOMPLETO",
        },
        select: { id: true, usuario: { select: { id: true } } },
      });
    }

    const rol = await prisma.rol.findUnique({ where: { nombre: "Operador" }, select: { id: true } });
    if (!rol) return { ok: false, error: "No se encontró el rol de Operador. Contacta a tu administrador." };

    const passwordHash = await hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nombre: personal.nombreCompleto,
        correo,
        rolId: rol.id,
        operadorId: operador.id,
        estatus: "ACTIVO",
        metodoAcceso: "CORREO_PASSWORD",
        passwordHash,
        proyectos: { create: [{ proyectoId }] },
      },
    });

    await logActivity({ userId: usuario.id, modulo: "usuarios", accion: "create", entidad: "Usuario", entidadId: usuario.id, detalle: { evento: "autoregistro_operador", curp } });
    await enviarBienvenidaOperador({ correo, nombre: personal.nombreCompleto });

    return { ok: true };
  } catch (e) {
    // No se refleja el error de BD al cliente (filtra detalles internos del esquema).
    console.error("registrarOperador: fallo al crear la cuenta", e);
    return { ok: false, error: "No se pudo crear tu cuenta. Intenta de nuevo o contacta a tu administrador." };
  }
}
