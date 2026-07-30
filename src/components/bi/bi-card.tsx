"use client";

import { X } from "lucide-react";
import { BiChart } from "@/components/bi/bi-chart";
import { useBiQuery } from "@/components/bi/use-bi-query";
import type { TipoGrafica, TamanoWidget } from "@/lib/bi/metadata";

const TAMANOS: { value: TamanoWidget; label: string }[] = [
  { value: "sm", label: "S" },
  { value: "md", label: "M" },
  { value: "lg", label: "L" },
];

export function BiCard({
  label,
  dataset,
  ejeX,
  ejeY,
  tipoGrafica,
  tamano,
  editMode = false,
  onCambiarTamano,
  onEliminar,
}: {
  label: string;
  dataset: string;
  ejeX: string;
  ejeY: string;
  tipoGrafica: TipoGrafica;
  tamano?: TamanoWidget;
  editMode?: boolean;
  onCambiarTamano?: (tamano: TamanoWidget) => void;
  onEliminar?: () => void;
}) {
  const { datos, ejeYLabel, cargando, error } = useBiQuery(dataset, ejeX, ejeY);

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-md)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          {label}
        </h3>
        {editMode && (
          <div className="flex items-center gap-1 shrink-0" data-no-print>
            <div className="flex overflow-hidden rounded-md" style={{ border: "1px solid var(--field-border)" }}>
              {TAMANOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onCambiarTamano?.(t.value)}
                  className="w-6 h-6 flex items-center justify-center"
                  style={{
                    background: tamano === t.value ? "var(--color-primary)" : "var(--field-bg)",
                    color: tamano === t.value ? "#fff" : "var(--sidebar-text)",
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                  }}
                  title={`Tamaño ${t.label}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onEliminar}
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)" }}
              title="Quitar de la vista"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>
      {cargando ? (
        <div className="flex items-center justify-center p-10" style={{ color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
          Cargando…
        </div>
      ) : error ? (
        <div className="flex items-center justify-center p-10" style={{ color: "var(--color-error)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
          {error}
        </div>
      ) : (
        <BiChart datos={datos} tipoGrafica={tipoGrafica} ejeYLabel={ejeYLabel} />
      )}
    </div>
  );
}
