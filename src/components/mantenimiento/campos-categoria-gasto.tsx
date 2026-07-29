"use client";

import { useState } from "react";
import { CATEGORIA_APLICA_A_UNIDAD, CATEGORIA_GASTO_LABEL_MANTENIMIENTO } from "@/lib/categorias-gasto";
import { CampoAyuda } from "@/components/ui/campo-ayuda";

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
        <CampoAyuda style={labelStyle} texto="Tipo de gasto que se está registrando.">Categoría *</CampoAyuda>
        <select name="categoria" required style={fieldStyle} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {Object.entries(CATEGORIA_GASTO_LABEL_MANTENIMIENTO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      {aplicaAUnidad ? (
        <div>
          <CampoAyuda style={labelStyle} texto="Unidad a la que corresponde este gasto.">Número económico *</CampoAyuda>
          <select name="numeroEconomico" required style={fieldStyle}>
            {unidades.map((u) => (
              <option key={u.numeroEconomico} value={u.numeroEconomico}>{u.numeroEconomico}</option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <CampoAyuda style={labelStyle} texto="Proyecto que reporta este gasto, ya que no se liga a una unidad.">Proyecto *</CampoAyuda>
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
