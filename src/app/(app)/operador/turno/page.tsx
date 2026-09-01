import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { obtenerDatosTurno, obtenerBitacoraUsoTodos } from "./actions";
import { PanelTurnoOperador } from "@/components/operadores/panel-turno-operador";
import { esRolGlobal } from "@/lib/permisos";
import { inicioDeMesMx, parseFechaLocalMx } from "@/lib/timezone";
import { fmtFechaHora } from "@/lib/formato";
import { Table, EmptyState, tdStyle } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mi Turno · Orión" };

function duracionTexto(inicio: Date, fin: Date | null): string {
  const ms = (fin ?? new Date()).getTime() - new Date(inicio).getTime();
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function PageTurnoOperador({
  searchParams,
}: {
  searchParams: Promise<{ proyectoId?: string; desde?: string; hasta?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/iniciar-sesion");

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { operadorId: true, operador: { select: { nombre: true } } },
  });

  if (usuario?.operadorId) {
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

  if (!(await esRolGlobal())) redirect("/sin-acceso");

  const { proyectoId, desde: desdeParam, hasta: hastaParam } = await searchParams;
  const desde = parseFechaLocalMx(desdeParam) ?? inicioDeMesMx();
  const hasta = parseFechaLocalMx(hastaParam) ?? new Date();

  const [proyectos, registros] = await Promise.all([
    prisma.proyecto.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    obtenerBitacoraUsoTodos({ proyectoId: proyectoId || undefined, desde, hasta }),
  ]);

  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Mi Turno — Bitácora de uso de unidades
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Consulta de qué unidad tomó cada operador, cuándo y por cuánto tiempo.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2" data-no-print>
        <div>
          <label style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", marginBottom: 4 }}>Proyecto</label>
          <select
            name="proyectoId"
            defaultValue={proyectoId ?? ""}
            className="rounded-md px-3"
            style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            <option value="">Todos los proyectos</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", marginBottom: 4 }}>Desde</label>
          <input
            type="date"
            name="desde"
            defaultValue={desdeParam ?? desde.toISOString().slice(0, 10)}
            className="rounded-md px-3"
            style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", marginBottom: 4 }}>Hasta</label>
          <input
            type="date"
            name="hasta"
            defaultValue={hastaParam ?? hasta.toISOString().slice(0, 10)}
            className="rounded-md px-3"
            style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          />
        </div>
        <button type="submit" className="rounded-md px-5 h-9 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          Filtrar
        </button>
      </form>

      {registros.length === 0 ? (
        <EmptyState>Sin registros de uso de unidades en el rango elegido.</EmptyState>
      ) : (
        <Table headers={["Proyecto", "Operador", "Unidad", "Inicio", "Fin", "Duración"]} minWidth={900}>
          {registros.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3" style={tdStyle}>{r.proyectoNombre}</td>
              <td className="px-4 py-3" style={tdStyle}>{r.operadorNombre}</td>
              <td className="px-4 py-3" style={{ ...tdStyle, fontFamily: "var(--font-mono)" }}>
                {r.numeroEconomico} <span style={{ fontFamily: "var(--font-ui)", color: "var(--sidebar-text)" }}>· {r.marcaModelo}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap" style={tdStyle}>{fmtFechaHora(r.inicio)}</td>
              <td className="px-4 py-3 whitespace-nowrap" style={tdStyle}>{r.fin ? fmtFechaHora(r.fin) : "Activo"}</td>
              <td className="px-4 py-3" style={{ ...tdStyle, fontFamily: "var(--font-mono)" }}>{duracionTexto(r.inicio, r.fin)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
