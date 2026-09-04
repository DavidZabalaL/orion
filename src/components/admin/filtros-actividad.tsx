"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";

type Opcion = { value: string; label: string };

const botonStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  height: "var(--h-md)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  padding: "0 12px",
  minWidth: 160,
};

function FiltroMultiple({
  etiquetaTodos,
  opciones,
  seleccion,
  onCambiar,
}: {
  etiquetaTodos: string;
  opciones: Opcion[];
  seleccion: string[];
  onCambiar: (valores: string[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);

  function alternar(value: string) {
    const nuevo = seleccion.includes(value) ? seleccion.filter((v) => v !== value) : [...seleccion, value];
    onCambiar(nuevo);
  }

  const etiquetaBoton =
    seleccion.length === 0
      ? etiquetaTodos
      : seleccion.length === 1
        ? opciones.find((o) => o.value === seleccion[0])?.label ?? etiquetaTodos
        : `${seleccion.length} seleccionados`;

  return (
    <div
      className="relative"
      tabIndex={-1}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierto(false);
      }}
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center justify-between gap-2 rounded-md"
        style={{ ...botonStyle, color: seleccion.length ? "var(--field-text)" : "var(--sidebar-text)" }}
      >
        {etiquetaBoton}
        <ChevronDown size={15} color="var(--sidebar-text)" />
      </button>

      {abierto && (
        <div
          className="absolute z-10 mt-1 min-w-full max-h-64 overflow-y-auto rounded-md flex flex-col"
          style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-md, var(--shadow-sm))", border: "1px solid var(--field-border)" }}
        >
          {opciones.length === 0 ? (
            <div className="px-3 py-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              Sin opciones.
            </div>
          ) : (
            opciones.map((o) => (
              <label key={o.value} className="flex items-center gap-2 px-3 py-2 whitespace-nowrap cursor-pointer" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                <input type="checkbox" checked={seleccion.includes(o.value)} onChange={() => alternar(o.value)} />
                {o.label}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function FiltrosActividad({
  roles,
  modulos,
  proyectos,
}: {
  roles: Opcion[];
  modulos: Opcion[];
  proyectos: Opcion[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const leer = (param: string) => searchParams.getAll(param);

  function actualizar(param: string, valores: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    for (const v of valores) params.append(param, v);
    router.push(`${pathname}?${params.toString()}`);
  }

  const rolIds = leer("rolId");
  const moduloIds = leer("modulo");
  const proyectoIds = leer("proyectoId");
  const hayFiltros = rolIds.length > 0 || moduloIds.length > 0 || proyectoIds.length > 0;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3" data-no-print>
      <FiltroMultiple etiquetaTodos="Todos los roles" opciones={roles} seleccion={rolIds} onCambiar={(v) => actualizar("rolId", v)} />
      <FiltroMultiple etiquetaTodos="Todos los módulos" opciones={modulos} seleccion={moduloIds} onCambiar={(v) => actualizar("modulo", v)} />
      <FiltroMultiple etiquetaTodos="Todos los proyectos" opciones={proyectos} seleccion={proyectoIds} onCambiar={(v) => actualizar("proyectoId", v)} />
      {hayFiltros && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="flex items-center gap-1 rounded-md px-3 h-9"
          style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}
        >
          <X size={14} /> Limpiar filtros
        </button>
      )}
    </div>
  );
}
