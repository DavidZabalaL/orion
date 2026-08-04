import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { obtenerActividadUsuario, MODULO_ACTIVIDAD_LABEL, type EventoActividadUsuario } from "@/lib/actividad";
import { ZONA_HORARIA_MX } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function fmtHora(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", { timeStyle: "short", timeZone: ZONA_HORARIA_MX }).format(d);
}

function fmtDiaCompleto(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: ZONA_HORARIA_MX }).format(d);
}

function claveDiaMx(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA_MX, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

const COLOR_MODULO: Record<string, string> = {
  auth: "var(--sidebar-text)",
  vehiculos: "var(--color-primary)",
  checklist: "var(--color-status-cerrado)",
  mantenimiento: "var(--color-status-revision)",
  combustible: "var(--color-status-asignado)",
  seguros: "var(--color-status-escena)",
  tag: "var(--color-status-asignado)",
  mapa: "var(--color-primary)",
  proyectos: "var(--color-status-cerrado)",
  usuarios: "var(--color-status-revision)",
  auditoria: "var(--color-status-escena)",
  reportes: "var(--color-primary)",
  dashboards: "var(--color-status-cerrado)",
  operadores: "var(--color-status-asignado)",
};

function agruparPorDia(eventos: EventoActividadUsuario[]): { clave: string; fecha: Date; eventos: EventoActividadUsuario[] }[] {
  const grupos = new Map<string, { fecha: Date; eventos: EventoActividadUsuario[] }>();
  for (const e of eventos) {
    const clave = claveDiaMx(e.createdAt);
    if (!grupos.has(clave)) grupos.set(clave, { fecha: e.createdAt, eventos: [] });
    grupos.get(clave)!.eventos.push(e);
  }
  return Array.from(grupos.entries()).map(([clave, v]) => ({ clave, ...v }));
}

function fmtDetalle(detalle: unknown): string | null {
  if (!detalle || typeof detalle !== "object") return null;
  const entradas = Object.entries(detalle as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entradas.length === 0) return null;
  return entradas.map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ");
}

export default async function ActividadUsuarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modulo?: string }>;
}) {
  const { id } = await params;
  const { modulo } = await searchParams;

  const perfil = await obtenerActividadUsuario(id, { modulo });
  if (!perfil) notFound();

  const grupos = agruparPorDia(perfil.eventos);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/actividad" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a adopción
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
              {perfil.usuario.nombre}
            </h2>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              {perfil.usuario.correo} · {perfil.usuario.rol}
              {perfil.usuario.estatus === "DESACTIVADO" && (
                <span style={{ color: "var(--color-status-escena)" }}> · Desactivado</span>
              )}
            </p>
          </div>
          <div className="text-right" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
            <div>{perfil.totalEventos} evento(s) registrado(s)</div>
            {perfil.primeraActividad && <div>Desde {fmtDiaCompleto(perfil.primeraActividad)}</div>}
          </div>
        </div>
      </div>

      <form className="flex flex-wrap gap-3" data-no-print>
        <select
          name="modulo"
          defaultValue={modulo ?? ""}
          className="rounded-md px-3"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          <option value="">Todos los módulos</option>
          {Object.entries(MODULO_ACTIVIDAD_LABEL).map(([mid, label]) => (
            <option key={mid} value={mid}>{label}</option>
          ))}
        </select>
        <button type="submit" className="rounded-md px-5 h-9 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          Filtrar
        </button>
      </form>

      {grupos.length === 0 ? (
        <EmptyState>Este usuario todavía no tiene actividad registrada.</EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {grupos.map((grupo) => (
            <div key={grupo.clave}>
              <div className="mb-2 capitalize" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text)" }}>
                {fmtDiaCompleto(grupo.fecha)}
              </div>
              <div className="rounded-xl overflow-hidden" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
                {grupo.eventos.map((e, i) => {
                  const detalle = fmtDetalle(e.detalle);
                  return (
                    <div
                      key={e.id}
                      className="flex items-start gap-3 px-4 py-3"
                      style={{ borderBottom: i < grupo.eventos.length - 1 ? "1px solid var(--field-border)" : "none" }}
                    >
                      <span className="mt-1.5 rounded-full shrink-0" style={{ width: 8, height: 8, background: COLOR_MODULO[e.modulo] ?? "var(--sidebar-text)" }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                            {e.descripcion}
                          </span>
                          <Badge label={MODULO_ACTIVIDAD_LABEL[e.modulo] ?? e.modulo} color={COLOR_MODULO[e.modulo] ?? "var(--sidebar-text)"} bg="var(--chip)" />
                        </div>
                        {detalle && (
                          <div className="mt-0.5 truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }} title={detalle}>
                            {detalle}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                        {fmtHora(e.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
