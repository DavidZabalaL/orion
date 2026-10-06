"use client";

import { BI_DATASETS, obtenerDataset } from "@/lib/bi/metadata";
import { fieldStyle, labelStyle } from "@/components/bi/selectores-combinacion";

export const MAX_COLUMNAS_TABLA_UI = 15;

/** Dataset + selección de columnas (checkboxes, en orden) para el widget "tabla de registros" (tipoWidget "tabla_filas") — a diferencia de SelectoresCombinacion, no hay ejeX/ejeY/agregacion/tipoGrafica: cada fila es un registro crudo del dataset. */
export function SelectorTablaFilas({
  datasetId,
  columnas,
  onChangeDataset,
  onChangeColumnas,
}: {
  datasetId: string;
  columnas: string[];
  onChangeDataset: (datasetId: string) => void;
  onChangeColumnas: (columnas: string[]) => void;
}) {
  const dataset = obtenerDataset(datasetId)!;

  function alternarColumna(campoId: string) {
    if (columnas.includes(campoId)) {
      onChangeColumnas(columnas.filter((c) => c !== campoId));
    } else if (columnas.length < MAX_COLUMNAS_TABLA_UI) {
      onChangeColumnas([...columnas, campoId]);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label style={labelStyle}>Dataset</label>
        <select
          value={datasetId}
          onChange={(e) => {
            const ds = obtenerDataset(e.target.value)!;
            onChangeDataset(e.target.value);
            onChangeColumnas([ds.campos[0].id]);
          }}
          style={fieldStyle}
        >
          {BI_DATASETS.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>
          Columnas ({columnas.length}/{MAX_COLUMNAS_TABLA_UI}) — la primera define el orden de las filas
        </label>
        <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto rounded-md p-3" style={{ border: "1px solid var(--field-border)" }}>
          {dataset.campos.map((c) => (
            <label key={c.id} className="flex items-center gap-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}>
              <input
                type="checkbox"
                checked={columnas.includes(c.id)}
                disabled={!columnas.includes(c.id) && columnas.length >= MAX_COLUMNAS_TABLA_UI}
                onChange={() => alternarColumna(c.id)}
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
