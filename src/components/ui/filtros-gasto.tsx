"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import type { FiltrosGasto as Filtros } from "@/lib/filtros-gasto";

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
  borderRadius: "var(--radius-md)",
  padding: "0 10px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  marginBottom: 4,
};

const PARAM: Record<keyof Filtros, string> = { desde: "desde", hasta: "hasta", proyectoId: "proyecto", tipoVehiculo: "tipo", q: "q" };

/** Barra de filtros que vive en la URL (?desde&hasta&proyecto&tipo&q) — la página filtra en el servidor, así los totales también respetan el filtro. */
export function FiltrosGasto({
  filtros,
  proyectos,
  placeholderBusqueda,
}: {
  filtros: Filtros;
  proyectos: { id: string; nombre: string }[];
  placeholderBusqueda: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filtros.q);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  function aplicar(cambios: Partial<Filtros>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [clave, valor] of Object.entries(cambios) as [keyof Filtros, string][]) {
      if (valor) params.set(PARAM[clave], valor);
      else params.delete(PARAM[clave]);
    }
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function cambiarBusqueda(valor: string) {
    setQ(valor);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => aplicar({ q: valor.trim() }), 400);
  }

  function limpiar() {
    if (temporizador.current) clearTimeout(temporizador.current);
    setQ("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  const activos = Boolean(filtros.desde || filtros.hasta || filtros.proyectoId || filtros.tipoVehiculo || filtros.q);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex-1 min-w-[220px]">
        <label style={labelStyle}>Buscar</label>
        <BuscadorTexto value={q} onChange={cambiarBusqueda} placeholder={placeholderBusqueda} className="w-full" />
      </div>
      <div>
        <label style={labelStyle}>Desde</label>
        <input type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => aplicar({ desde: e.target.value })} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
      </div>
      <div>
        <label style={labelStyle}>Hasta</label>
        <input type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => aplicar({ hasta: e.target.value })} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
      </div>
      <div className="min-w-[180px]">
        <label style={labelStyle}>Proyecto</label>
        <select value={filtros.proyectoId} onChange={(e) => aplicar({ proyectoId: e.target.value })} style={{ ...fieldStyle, width: "100%" }}>
          <option value="">Todos los proyectos</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>
      <div className="min-w-[160px]">
        <label style={labelStyle}>Tipo de unidad</label>
        <select value={filtros.tipoVehiculo} onChange={(e) => aplicar({ tipoVehiculo: e.target.value })} style={{ ...fieldStyle, width: "100%" }}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_VEHICULO_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>{label}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2" style={{ height: "var(--h-md)" }}>
        {pending && <Loader2 size={16} className="animate-spin" color="var(--sidebar-text)" />}
        {activos && (
          <button
            type="button"
            onClick={limpiar}
            className="flex items-center gap-1 rounded-md px-3"
            style={{ height: "var(--h-md)", background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
          >
            <X size={14} /> Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
