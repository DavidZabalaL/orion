import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { obtenerDatosTurno } from "./actions";
import { PanelTurnoOperador } from "@/components/operadores/panel-turno-operador";

export const metadata = { title: "Mi Turno · Orión" };

export default async function PageTurnoOperador() {
  const session = await auth();
  if (!session?.user?.id) redirect("/iniciar-sesion");

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { operadorId: true, operador: { select: { nombre: true } } },
  });

  if (!usuario?.operadorId) redirect("/sin-acceso");

  const datos = await obtenerDatosTurno();

  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1
          style={{
            fontFamily: "var(--font)",
            fontSize: "var(--text-2xl)",
            fontWeight: 700,
            color: "var(--sidebar-text-active)",
          }}
        >
          Mi Turno
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", marginTop: 4 }}>
          {usuario.operador?.nombre} · {new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <PanelTurnoOperador datos={datos} />
    </div>
  );
}
