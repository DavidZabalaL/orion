import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/table";
import { ZONA_HORARIA_MX } from "@/lib/timezone";
import { obtenerDataset } from "@/lib/bi/metadata";

export const dynamic = "force-dynamic";

const ACCION_LABEL: Record<string, string> = {
  vio: "Vio",
  exporto_pdf: "Exportó PDF",
  exporto_excel: "Exportó Excel",
  exporto_imagen: "Exportó imagen",
  recibio_correo: "Recibió por correo",
};

const RECURSO_LABEL: Record<string, string> = {
  vista_dashboard: "Dashboard guardado",
  explorador: "Explorador libre",
  reporte_programado: "Reporte programado",
};

function fmtFecha(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "medium", timeZone: ZONA_HORARIA_MX }).format(d);
}

export default async function ReportesBIGobernanzaPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string; accion?: string }>;
}) {
  const { usuario, accion } = await searchParams;

  const eventos = await prisma.accesoReporteBI.findMany({
    where: {
      ...(usuario ? { usuario: { correo: { contains: usuario, mode: "insensitive" } } } : {}),
      ...(accion ? { accion } : {}),
    },
    include: { usuario: { select: { nombre: true, correo: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-1" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Auditoría de acceso a reportes y dashboards de BI
        </h3>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Quién vio, exportó o recibió qué — incluye los datasets y el alcance de proyecto involucrados en cada acceso.
        </p>
      </div>

      <form className="flex flex-wrap gap-2" data-no-print>
        <input
          name="usuario"
          defaultValue={usuario ?? ""}
          placeholder="Filtrar por correo del usuario…"
          className="rounded-md px-3"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", minWidth: 240 }}
        />
        <select
          name="accion"
          defaultValue={accion ?? ""}
          className="rounded-md px-3"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          <option value="">Todas las acciones</option>
          {Object.entries(ACCION_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button type="submit" className="rounded-md px-5 h-9 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          Filtrar
        </button>
      </form>

      {eventos.length === 0 ? (
        <EmptyState>Sin eventos registrados.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {eventos.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-3" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                  {e.usuario.nombre} — {ACCION_LABEL[e.accion] ?? e.accion}
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                  {RECURSO_LABEL[e.tipoRecurso] ?? e.tipoRecurso}
                  {e.datasetIds.length > 0 ? ` · ${e.datasetIds.map((id) => obtenerDataset(id)?.label ?? id).join(", ")}` : ""}
                  {e.proyectoIds.length > 0 ? ` · ${e.proyectoIds.length} proyecto(s)` : ""}
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{fmtFecha(e.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
