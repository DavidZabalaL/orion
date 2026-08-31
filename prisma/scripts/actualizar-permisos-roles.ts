// Script de un solo uso: aplica a la base ya viva los permisos nuevos de
// Control Vehicular y Gerente administrativo (B, N, R, S) sin correr el
// seed completo (que insertaría datos mock). Bórralo después de correrlo.
// Uso: npx tsx prisma/scripts/actualizar-permisos-roles.ts
import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const editar = { ver: true, editar: true };
const ver = { ver: true };

async function main() {
  const cv = await prisma.rol.update({
    where: { nombre: "Control Vehicular" },
    data: {
      permisos: {
        A: editar, "A.1": editar, B: editar, C: editar, D: editar, E: editar,
        F: editar, G: editar, "G.1": editar, H: editar, I: editar, J: editar,
        L: editar, M: editar, N: ver, R: ver, S: ver,
      },
    },
  });
  console.log("Control Vehicular actualizado:", cv.id);

  const coordinador = await prisma.rol.update({
    where: { nombre: "Gerente administrativo" },
    data: {
      permisos: {
        A: ver, "A.1": editar, B: ver, C: ver, D: editar, E: editar, F: ver,
        G: ver, "G.1": ver, H: ver, I: ver, J: editar, L: ver, M: editar,
        N: ver, R: ver, S: ver,
      },
    },
  });
  console.log("Gerente administrativo actualizado:", coordinador.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
