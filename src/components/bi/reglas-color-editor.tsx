"use client";

import { Plus, X } from "lucide-react";
import {
  OPERADOR_REGLA_COLOR_LABEL,
  COLORES_REGLA_PRESET,
  type OperadorReglaColor,
  type ReglaColorColumna,
} from "@/lib/bi/reglas-color";

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-sm)",
  borderRadius: "var(--radius-md)",
  padding: "0 10px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  display: "block",
  marginBottom: 6,
};

/**
 * Editor de "reglas de color" (semáforo condicional) — ver
 * src/lib/bi/reglas-color.ts. Cada regla es independiente
 * (mayor/menor/igual/entre/personalizada + color); si más de una aplica al
 * mismo valor, gana la primera de la lista. Compartido entre el panel de
 * widgets del Explorador BI (selectores-combinacion.tsx) y el modal de
 * "datos adicionales" del reporte de Estatus de flota (EstatusFlotaModal.tsx).
 */
export function ReglasColorEditor({
  reglas,
  onChange,
  titulo = "Reglas de color",
  mostrarColumna = true,
}: {
  reglas: ReglaColorColumna[];
  onChange: (reglas: ReglaColorColumna[]) => void;
  titulo?: string;
  /** false cuando el consumidor no tiene noción de "columnas" (ej. un solo campo/KPI) — oculta el campo de columna y las reglas aplican siempre al único valor. */
  mostrarColumna?: boolean;
}) {
  function agregar() {
    onChange([...reglas, { id: crypto.randomUUID(), columna: "", operador: "mayor", valor: 0, color: COLORES_REGLA_PRESET[0].valor }]);
  }
  function actualizar(id: string, patch: Partial<ReglaColorColumna>) {
    onChange(reglas.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function quitar(id: string) {
    onChange(reglas.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label style={{ ...labelStyle, marginBottom: 0 }}>{titulo}</label>
        <button type="button" onClick={agregar} className="flex items-center gap-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer" }}>
          <Plus size={12} /> Agregar regla
        </button>
      </div>
      {reglas.length === 0 && (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
          Sin reglas — los valores se muestran con su color normal.
        </p>
      )}
      {reglas.map((r) => (
        <div key={r.id} className="flex flex-col gap-1.5 rounded-md p-2" style={{ background: "var(--field-bg)" }}>
          <div className="flex flex-wrap items-center gap-1.5">
            {mostrarColumna && (
              <input
                value={r.columna}
                onChange={(e) => actualizar(r.id, { columna: e.target.value })}
                placeholder="Columna (vacío = todas)"
                className="rounded-md px-2"
                style={{ ...fieldStyle, height: 30, width: 150, fontSize: "var(--text-xs)" }}
              />
            )}
            <select
              value={r.operador}
              onChange={(e) => actualizar(r.id, { operador: e.target.value as OperadorReglaColor })}
              className="rounded-md px-2"
              style={{ ...fieldStyle, height: 30, width: 130, fontSize: "var(--text-xs)" }}
            >
              {(Object.entries(OPERADOR_REGLA_COLOR_LABEL) as [OperadorReglaColor, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>

            {(r.operador === "mayor" || r.operador === "menor" || r.operador === "igual") && (
              <input
                type="number"
                value={r.valor ?? ""}
                onChange={(e) => actualizar(r.id, { valor: e.target.value === "" ? undefined : Number(e.target.value) })}
                placeholder="Valor"
                className="rounded-md px-2"
                style={{ ...fieldStyle, height: 30, width: 90, fontSize: "var(--text-xs)" }}
              />
            )}
            {r.operador === "entre" && (
              <>
                <input
                  type="number"
                  value={r.valorMin ?? ""}
                  onChange={(e) => actualizar(r.id, { valorMin: e.target.value === "" ? undefined : Number(e.target.value) })}
                  placeholder="Mín."
                  className="rounded-md px-2"
                  style={{ ...fieldStyle, height: 30, width: 70, fontSize: "var(--text-xs)" }}
                />
                <input
                  type="number"
                  value={r.valorMax ?? ""}
                  onChange={(e) => actualizar(r.id, { valorMax: e.target.value === "" ? undefined : Number(e.target.value) })}
                  placeholder="Máx."
                  className="rounded-md px-2"
                  style={{ ...fieldStyle, height: 30, width: 70, fontSize: "var(--text-xs)" }}
                />
              </>
            )}
            {r.operador === "personalizada" && (
              <input
                value={r.expresion ?? ""}
                onChange={(e) => actualizar(r.id, { expresion: e.target.value })}
                placeholder="Ej. >=100 o !=0"
                className="rounded-md px-2"
                style={{ ...fieldStyle, height: 30, width: 110, fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)" }}
                title="Operadores permitidos: >= <= != > < =="
              />
            )}

            <select
              value={r.color}
              onChange={(e) => actualizar(r.id, { color: e.target.value })}
              className="rounded-md px-2"
              style={{ ...fieldStyle, height: 30, width: 100, fontSize: "var(--text-xs)", color: r.color, fontWeight: 600 }}
            >
              {COLORES_REGLA_PRESET.map((c) => (
                <option key={c.valor} value={c.valor} style={{ color: c.valor }}>{c.label}</option>
              ))}
            </select>

            <button type="button" onClick={() => quitar(r.id)} style={{ color: "var(--sidebar-text)", cursor: "pointer" }}>
              <X size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
