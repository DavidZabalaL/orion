"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { actualizarConfiguracionWidgets } from "@/app/(app)/usuarios/widgets/actions";
import type { DefinicionWidget, WidgetConfigItem } from "@/lib/widgets";

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
  width: "100%",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
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
              <input
                name={`label_${w.id}`}
                defaultValue={actual?.label ?? w.labelDefault}
                style={{ ...fieldStyle, maxWidth: 320 }}
              />
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
