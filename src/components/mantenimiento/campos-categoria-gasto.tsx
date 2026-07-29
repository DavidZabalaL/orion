"use client";

import { useState } from "react";
import { CATEGORIA_APLICA_A_UNIDAD, CATEGORIA_GASTO_LABEL_MANTENIMIENTO } from "@/lib/categorias-gasto";

type Props = {
  unidades: { numeroEconomico: string }[];
  proyectos: { id: string; nombre: string }[];
  fieldStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
};

export function CamposCategoriaGasto({ unidades, proyectos, fieldStyle, labelStyle }: Props) {
  const [categoria, setCategoria] = useState(Object.keys(CATEGORIA_GASTO_LABEL_MANTENIMIENTO)[0]);
  const aplicaAUnidad = CATEGORIA_APLICA_A_UNIDAD[categoria] ?? true;

  return (
    <>
      <div>
        <label style={labelStyle}>Categoría *</label>
        <select name="categoria" required style={fieldStyle} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {Object.entries(CATEGORIA_GASTO_LABEL_MANTENIMIENTO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      {aplicaAUnidad ? (
        <div>
          <label style={labelStyle}>Número económico *</label>
          <select name="numeroEconomico" required style={fieldStyle}>
            {unidades.map((u) => (
              <option key={u.numeroEconomico} value={u.numeroEconomico}>{u.numeroEconomico}</option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label style={labelStyle}>Proyecto *</label>
          <select name="proyectoReportanteId" required style={fieldStyle}>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
