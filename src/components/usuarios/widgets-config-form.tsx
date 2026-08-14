"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { actualizarConfiguracionWidgets } from "@/app/(app)/usuarios/widgets/actions";
import { TAMANO_WIDGET_LABEL, tamanoWidgetPorDefecto, type DefinicionWidget, type WidgetConfigItem } from "@/lib/widgets";

const selectStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-sm)",
  height: "var(--h-sm)",
  borderRadius: "var(--radius-md)",
  padding: "0 10px",
};

export function WidgetsConfigForm({
  moduloId,
  catalogo,
  widgetsActuales,
}: {
  moduloId: string;
  catalogo: DefinicionWidget[];
  widgetsActuales: WidgetConfigItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) => {
        startTransition(async () => {
          await actualizarConfiguracionWidgets(formData);
          setOk(true);
          setTimeout(() => setOk(false), 2500);
        });
      }}
    >
      <input type="hidden" name="moduloId" value={moduloId} />
      <div className="flex flex-col gap-3">
        {catalogo.map((w) => {
          const actual = widgetsActuales.find((a) => a.id === w.id);
          return (
            <div key={w.id} className="flex items-center gap-3 rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
              <input type="checkbox" name={`activo_${w.id}`} defaultChecked={actual?.activo ?? false} />
              <span className="flex-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
                {w.labelDefault}
              </span>
              <select name={`tamano_${w.id}`} defaultValue={actual?.tamano ?? tamanoWidgetPorDefecto(w.tipo)} style={selectStyle}>
                {Object.entries(TAMANO_WIDGET_LABEL).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>{etiqueta}</option>
                ))}
              </select>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textTransform: "uppercase" }}>
                {w.tipo === "contador" ? "Contador" : "Desglose"}
              </span>
            </div>
          );
        })}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-md px-5 h-10 font-semibold disabled:opacity-60 w-fit"
        style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      >
        {ok ? <><CheckCircle2 size={16} /> Guardado</> : pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
