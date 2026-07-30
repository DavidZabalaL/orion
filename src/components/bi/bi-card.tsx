"use client";

import { BiChart } from "@/components/bi/bi-chart";
import { useBiQuery } from "@/components/bi/use-bi-query";
import type { TipoGrafica } from "@/lib/bi/metadata";

export function BiCard({ label, dataset, ejeX, ejeY, tipoGrafica }: { label: string; dataset: string; ejeX: string; ejeY: string; tipoGrafica: TipoGrafica }) {
  const { datos, ejeYLabel, cargando, error } = useBiQuery(dataset, ejeX, ejeY);

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-md)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
        {label}
      </h3>
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
