// Lista proyectos con id y nombre — uso diagnóstico.
// GET /api/admin/proyectos?q=SYM-293
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esRolGlobal } from "@/lib/permisos";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!(await esRolGlobal()))
    return NextResponse.json({ error: "Solo administradores globales." }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q") ?? "";

  const proyectos = await prisma.proyecto.findMany({
    where: q ? { nombre: { contains: q, mode: "insensitive" } } : {},
    select: { id: true, nombre: true, estatus: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ total: proyectos.length, proyectos });
}
