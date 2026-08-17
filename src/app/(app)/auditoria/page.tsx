import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/table";
import { MODULO_ACTIVIDAD_LABEL, descripcionEvento } from "@/lib/actividad";
import { buscarMovimientos, type TipoEntidadMovimiento } from "@/lib/movimientos";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { ZONA_HORARIA_MX } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const TIPOS: { value: TipoEntidadMovimiento; label: string; placeholder: string }[] = [
  { value: "unidad", label: "Unidad", placeholder: "Ej. G-012" },
  { value: "proyecto", label: "Proyecto", placeholder: "Nombre del proyecto" },
  { value: "operador", label: "Operador", placeholder: "Nombre del operador" },
];

function fmtFecha(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "medium", timeZone: ZONA_HORARIA_MX }).format(d);
}

function fmtDetalle(detalle: unknown): string | null {
  if (!detalle || typeof detalle !== "object") return null;
  const d = detalle as Record<string, unknown>;
  if ("campo" in d) return `${String(d.campo)}: ${JSON.stringify(d.anterior)} → ${JSON.stringify(d.nuevo)}`;
  if ("anterior" in d && "nuevo" in d) return `${JSON.stringify(d.anterior)} → ${JSON.stringify(d.nuevo)}`;
  return JSON.stringify(d);
}

export default async function BitacoraMovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; q?: string }>;
}) {
  await requerirPermisoModulo("I");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("I");

  const { tipo: tipoParam, q } = await searchParams;
  const tipo: TipoEntidadMovimiento = tipoParam === "proyecto" || tipoParam === "operador" ? tipoParam : "unidad";
  const tipoActual = TIPOS.find((t) => t.value === tipo)!;

  const { eventos, coincidencias } = q ? await buscarMovimientos(tipo, q, proyectosPermitidos) : { eventos: [], coincidencias: [] };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Bitácora de movimientos
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Consulta cualquier movimiento registrado de una unidad, un proyecto o un operador: gastos, cargas de combustible, peajes, seguros, checklists, documentos y más.
        </p>
      </div>

      <form className="flex flex-wrap gap-2" data-no-print>
        <select
          name="tipo"
          defaultValue={tipo}
          className="rounded-md px-3"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--sidebar-text)" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={tipoActual.placeholder}
            className="w-full rounded-md pl-9 pr-3"
            style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          />
        </div>
        <button type="submit" className="rounded-md px-5 h-9 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          Buscar
        </button>
      </form>

      {!q ? (
        <EmptyState>Elige un tipo y escribe para buscar sus movimientos.</EmptyState>
      ) : coincidencias.length === 0 ? (
        <EmptyState>Sin resultados para &quot;{q}&quot;.</EmptyState>
      ) : (
        <>
          {coincidencias.length > 1 && (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              {coincidencias.length} coincidencias: {coincidencias.map((c) => c.label).join(" · ")}
            </p>
          )}
          {eventos.length === 0 ? (
            <EmptyState>Sin movimientos registrados para esta búsqueda.</EmptyState>
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
                          {e.usuario} — {descripcionEvento(e.modulo, e.accion, e.entidad)}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{fmtFecha(e.createdAt)}</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                        {MODULO_ACTIVIDAD_LABEL[e.modulo] ?? e.modulo}
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
        </>
      )}
    </div>
  );
}
