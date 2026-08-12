"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function marcarNotificacionLeida(notificacionId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.notificacionLeida.upsert({
    where: { usuarioId_notificacionId: { usuarioId: session.user.id, notificacionId } },
    update: {},
    create: { usuarioId: session.user.id, notificacionId },
  });

  revalidatePath("/", "layout");
}
