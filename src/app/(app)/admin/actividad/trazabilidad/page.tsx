import Link from "next/link";
import { FileDown, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/table";
import { buscarTrazabilidad, MODULO_ACTIVIDAD_LABEL } from "@/lib/actividad";
import { ZONA_HORARIA_MX } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function fmtFecha(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "medium", timeZone: ZONA_HORARIA_MX }).format(d);
}

function fmtDetalle(detalle: unknown): string | null {
  if (!detalle || typeof detalle !== "object") return null;
  const d = detalle as Record<string, unknown>;
  if ("campo" in d) {
    return `${String(d.campo)}: ${JSON.stringify(d.anterior)} → ${JSON.stringify(d.nuevo)}`;
  }
  if ("anterior" in d && "nuevo" in d) {
    return `${JSON.stringify(d.anterior)} → ${JSON.stringify(d.nuevo)}`;
  }
  return JSON.stringify(d);
}

export default async function TrazabilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const eventos = q ? await buscarTrazabilidad(q) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Buscar por número económico o por entidad
        </h3>
        <form className="flex flex-wrap gap-2" data-no-print>
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--sidebar-text)" />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Ej. G-012, o el nombre de la entidad (Unidad, Operador...)"
              className="w-full rounded-md pl-9 pr-3"
              style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
            />
          </div>
          <button type="submit" className="rounded-md px-5 h-9 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            Buscar
          </button>
          {q && (
            <Link
              href={`/admin/actividad/trazabilidad/pdf?q=${encodeURIComponent(q)}`}
              className="flex items-center gap-1.5 rounded-md px-4 h-9"
              style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
              target="_blank"
            >
              <FileDown size={14} /> Exportar PDF
            </Link>
          )}
        </form>
      </div>

      {!q ? (
        <EmptyState>Escribe un número económico o una entidad para ver su historial.</EmptyState>
      ) : eventos.length === 0 ? (
        <EmptyState>Sin eventos registrados para &quot;{q}&quot;.</EmptyState>
      ) : (
        <div className="flex flex-col gap-1">
          {eventos.map((e, i) => {
            const detalleTexto = fmtDetalle(e.detalle);
            return (
              <div key={e.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: "var(--color-primary)" }} />
                  {i < eventos.length - 1 && <span className="w-px flex-1" style={{ background: "var(--field-border)" }} />}
                </div>
                <div className="mb-4 flex-1 rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                      {e.usuario} — {e.accion}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{fmtFecha(e.createdAt)}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                    {MODULO_ACTIVIDAD_LABEL[e.modulo] ?? e.modulo}
                    {e.entidad && ` · ${e.entidad}`}
                    {e.entidadId && ` · ${e.entidadId}`}
                  </div>
                  {detalleTexto && (
                    <div className="mt-1 rounded-md px-2.5 py-1.5" style={{ background: "var(--chip)", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--field-text)" }}>
                      {detalleTexto}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
