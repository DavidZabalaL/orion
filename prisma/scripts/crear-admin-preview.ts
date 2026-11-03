import dotenv from "dotenv";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const CORREO = "admin@orion.local";

function obtenerPasswordPreview(): string {
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new Error("Este script nunca debe ejecutarse en producción.");
  }
  const password = process.env.PREVIEW_ADMIN_PASSWORD?.trim();
  if (!password || password.length < 12) {
    throw new Error("Define PREVIEW_ADMIN_PASSWORD (mínimo 12 caracteres) en el entorno antes de ejecutar este script.");
  }
  return password;
}

async function crearAdminEnBd(envPath: string, passwordPlano: string) {
  if (envPath === ".env" || envPath.endsWith("/.env")) {
    throw new Error("Por seguridad, este script no permite apuntar a .env (producción). Usa .env.staging.");
  }
  const env = dotenv.config({ path: envPath }).parsed;
  if (!env?.DATABASE_URL) {
    console.log(`[Saltando] No se encontró DATABASE_URL en ${envPath}`);
    return;
  }

  const maskedDb = env.DATABASE_URL.split("@")[1] || "local";
  console.log(`\nConectando a ${envPath} (${maskedDb})...`);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });

  try {
    const rolAdmin = await prisma.rol.findFirst({
      where: { nombre: "Administrador" },
    });

    if (!rolAdmin) {
      console.error(`Error: No se encontró el rol 'Administrador' en ${envPath}`);
      return;
    }

    const passwordHash = await hash(passwordPlano, 10);

    const usuario = await prisma.usuario.upsert({
      where: { correo: CORREO },
      update: {
        nombre: "Administrador Preview",
        rolId: rolAdmin.id,
        estatus: "ACTIVO",
        metodoAcceso: "CORREO_PASSWORD",
        passwordHash,
      },
      create: {
        nombre: "Administrador Preview",
        correo: CORREO,
        rolId: rolAdmin.id,
        estatus: "ACTIVO",
        metodoAcceso: "CORREO_PASSWORD",
        passwordHash,
      },
    });

    console.log(`✓ Usuario admin creado/actualizado con éxito en ${envPath}:`);
    console.log(`  ID: ${usuario.id}`);
    console.log(`  Correo: ${usuario.correo}`);
    console.log(`  Rol: Administrador`);
    console.log(`  Método: CORREO_PASSWORD`);
  } catch (err: any) {
    console.error(`Error al procesar ${envPath}:`, err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("=== Creación de Usuario Administrador para Preview ===");
  const passwordPlano = obtenerPasswordPreview();
  await crearAdminEnBd(".env.staging", passwordPlano);
}

main();
