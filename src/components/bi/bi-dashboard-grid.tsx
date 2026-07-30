"use client";

import { BI_COMBINACIONES_SUGERIDAS } from "@/lib/bi/metadata";
import { BiCard } from "@/components/bi/bi-card";

export function BiDashboardGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {BI_COMBINACIONES_SUGERIDAS.map((c) => (
        <BiCard key={c.label} label={c.label} dataset={c.dataset} ejeX={c.ejeX} ejeY={c.ejeY} tipoGrafica={c.tipoGrafica} />
      ))}
    </div>
  );
}
