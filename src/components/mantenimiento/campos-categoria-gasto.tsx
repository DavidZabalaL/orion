"use client";

import { useState } from "react";
import { CATEGORIA_APLICA_A_UNIDAD, CATEGORIA_GASTO_LABEL_MANTENIMIENTO } from "@/lib/categorias-gasto";
import { CampoAyuda } from "@/components/ui/campo-ayuda";
import { ComboboxUnidad } from "@/components/ui/combobox-unidad";

type Props = {
  unidades: { numeroEconomico: string }[];
  proyectos: { id: string; nombre: string }[];
  fieldStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  // Cuando se captura desde la ficha de una unidad ya se sabe cuál es —
  // se fija por hidden input y la categoría se limita a las que aplican a unidad.
  numeroEconomicoFijo?: string;
};

const CATEGORIAS_DE_UNIDAD = Object.fromEntries(
  Object.entries(CATEGORIA_GASTO_LABEL_MANTENIMIENTO).filter(([k]) => CATEGORIA_APLICA_A_UNIDAD[k] ?? true)
);

export function CamposCategoriaGasto({ unidades, proyectos, fieldStyle, labelStyle, numeroEconomicoFijo }: Props) {
  const opciones = numeroEconomicoFijo ? CATEGORIAS_DE_UNIDAD : CATEGORIA_GASTO_LABEL_MANTENIMIENTO;
  const [categoria, setCategoria] = useState(Object.keys(opciones)[0]);
  const aplicaAUnidad = numeroEconomicoFijo ? true : (CATEGORIA_APLICA_A_UNIDAD[categoria] ?? true);

  return (
    <>
      <div>
        <CampoAyuda style={labelStyle} texto="Tipo de gasto que se está registrando.">Categoría *</CampoAyuda>
        <select name="categoria" required style={fieldStyle} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {Object.entries(opciones).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      {numeroEconomicoFijo ? (
        <div>
          <CampoAyuda style={labelStyle} texto="Unidad a la que corresponde este gasto.">Número económico</CampoAyuda>
          <input type="hidden" name="numeroEconomico" value={numeroEconomicoFijo} />
          <div style={{ ...fieldStyle, display: "flex", alignItems: "center", fontFamily: "var(--font-mono)" }}>{numeroEconomicoFijo}</div>
        </div>
      ) : aplicaAUnidad ? (
        <div>
          <CampoAyuda style={labelStyle} texto="Unidad a la que corresponde este gasto.">Número económico *</CampoAyuda>
          <ComboboxUnidad name="numeroEconomico" unidades={unidades} required style={fieldStyle} />
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
