"use client";

import { useMemo } from "react";
import { X, Pencil, GripVertical, Download } from "lucide-react";
import { Table, EmptyState } from "@/components/ui/table";
import { useBiTablaFilasQuery } from "@/components/bi/use-bi-tabla-filas-query";
import { exportarExcel } from "@/lib/exportar-excel";
import { colorParaValor, promedioDe, type ReglaColorColumna } from "@/lib/bi/reglas-color";
import type { FiltroGuardable } from "@/lib/bi/metadata";

export function BiCardTablaFilas({
  label,
  dataset,
  columnas,
  filtros,
  proyectoIds,
  reglasColor,
  editMode = false,
  onEditar,
  onEliminar,
}: {
  label: string;
  dataset: string;
  columnas: string[];
  filtros?: FiltroGuardable[];
  proyectoIds?: string[];
  reglasColor?: ReglaColorColumna[];
  editMode?: boolean;
  onEditar?: () => void;
  onEliminar?: () => void;
}) {
  const params = useMemo(() => ({ dataset, columnas, filtros, proyectoIds }), [dataset, columnas, filtros, proyectoIds]);
  const { columnas: columnasResueltas, filas, truncado, cargando, error } = useBiTablaFilasQuery(params);

  // Promedio por columna (solo celdas numéricas) — necesario para los
  // operadores "sobre/bajo promedio" de las reglas de color, igual que en
  // TablaSimple/BiTablaCruzada.
  const promedioPorColumna = useMemo(
    () => Object.fromEntries(columnasResueltas.map((c) => [c.id, promedioDe(filas.map((f) => f[c.id]).filter((v): v is number => typeof v === "number"))])),
    [columnasResueltas, filas]
  );

  function exportar() {
    exportarExcel(label.replace(/\s+/g, "-").toLowerCase() || "tabla", [
      {
        nombre: label.slice(0, 31) || "Tabla",
        headers: columnasResueltas.map((c) => c.label),
        filas: filas.map((f) => columnasResueltas.map((c) => f[c.id] ?? "")),
      },
    ]);
  }

  return (
    <div className="flex h-full flex-col rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div className={`mb-3 flex items-center justify-between gap-2 ${editMode ? "bi-drag-handle cursor-move" : ""}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          {editMode && <GripVertical size={14} color="var(--sidebar-text)" className="shrink-0" data-no-print />}
          <h3
            style={{
              fontFamily: "var(--font)",
              fontSize: "var(--text-md)",
              fontWeight: 600,
              color: "var(--sidebar-text-active)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {label}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1.5" data-no-print>
          {!cargando && !error && filas.length > 0 && (
            <button
              type="button"
              onClick={exportar}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-6 items-center gap-1 rounded-md px-2"
              style={{ background: "var(--chip)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)" }}
              title="Exportar a Excel"
            >
              <Download size={12} /> Excel
            </button>
          )}
          {editMode && (
            <>
              <button
                type="button"
                onClick={onEditar}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{ background: "var(--chip)", color: "var(--sidebar-text-active)" }}
                title="Editar este widget"
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={onEliminar}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)" }}
                title="Quitar de la vista"
              >
                <X size={13} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {cargando ? (
          <div className="flex items-center justify-center p-10" style={{ color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
            Cargando…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-10" style={{ color: "var(--color-error)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
            {error}
          </div>
        ) : filas.length === 0 ? (
          <EmptyState>Sin registros.</EmptyState>
        ) : (
          <>
            <Table headers={columnasResueltas.map((c) => c.label)} minWidth={columnasResueltas.length * 140}>
              {filas.map((fila, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--field-border)" }}>
                  {columnasResueltas.map((c) => {
                    const valor = fila[c.id];
                    const color = typeof valor === "number" ? colorParaValor(valor, c.label, reglasColor, promedioPorColumna[c.id]) : null;
                    return (
                      <td
                        key={c.id}
                        className="px-4 py-2.5 whitespace-nowrap"
                        style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: color ?? "var(--field-text)", fontWeight: color ? 700 : 400 }}
                      >
                        {valor ?? "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Table>
            {truncado && (
              <p className="mt-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                Mostrando los primeros {filas.length} registros — hay más, acota con filtros.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
