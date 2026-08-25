"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { editarSeguro } from "@/app/(app)/seguros/actions";
import { TIPO_COBERTURA_LABEL } from "@/lib/estatus";
import { CampoAyuda } from "@/components/ui/campo-ayuda";
import { Modal } from "@/components/ui/modal";

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

type Cobertura = { tipoCobertura: string; sumaAsegurada: string; deducible: string };

type SeguroEditable = {
  id: string;
  aseguradora: string;
  numeroPoliza: string;
  fechaInicio: string;
  fechaVencimiento: string;
  costo: string;
  coberturas: Cobertura[];
};

/** Botón + modal de edición completa de una póliza. Solo debe renderizarse cuando el llamador
 * ya confirmó (con esRolGlobal en el servidor) que el usuario actual es Administrador. */
export function EditarSeguroForm({ seguro }: { seguro: SeguroEditable }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-md px-4 h-10 w-fit"
        style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", boxShadow: "var(--shadow-sm)" }}
      >
        <Pencil size={15} /> Editar póliza
      </button>
      {abierto && (
        <Modal title={`Editar póliza — ${seguro.numeroPoliza}`} onClose={() => setAbierto(false)} maxWidth={720}>
          <FormularioEdicionSeguro seguro={seguro} onExito={() => setAbierto(false)} />
        </Modal>
      )}
    </>
  );
}

function FormularioEdicionSeguro({ seguro, onExito }: { seguro: SeguroEditable; onExito: () => void }) {
  const [coberturas, setCoberturas] = useState<Cobertura[]>(
    seguro.coberturas.length ? seguro.coberturas : [{ tipoCobertura: "RC_TERCEROS", sumaAsegurada: "0", deducible: "0" }]
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-6"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await editarSeguro(formData);
          if (!res.ok) {
            setError(res.error ?? "No se pudo guardar la póliza.");
            return;
          }
          onExito();
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="id" value={seguro.id} />
      <input type="hidden" name="coberturasJson" value={JSON.stringify(coberturas)} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <CampoAyuda style={labelStyle} texto="Compañía que emite la póliza.">Aseguradora *</CampoAyuda>
          <input name="aseguradora" defaultValue={seguro.aseguradora} required style={fieldStyle} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Folio de la póliza asignado por la aseguradora.">Número de póliza *</CampoAyuda>
          <input name="numeroPoliza" defaultValue={seguro.numeroPoliza} required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Prima total pagada por la póliza.">Costo *</CampoAyuda>
          <input name="costo" type="number" step="0.01" defaultValue={seguro.costo} required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Fecha en que empieza a tener vigencia la póliza.">Fecha de inicio *</CampoAyuda>
          <input name="fechaInicio" type="date" defaultValue={seguro.fechaInicio} required style={fieldStyle} />
        </div>
        <div>
          <CampoAyuda style={labelStyle} texto="Fecha en que vence la vigencia de la póliza.">Fecha de vencimiento *</CampoAyuda>
          <input name="fechaVencimiento" type="date" defaultValue={seguro.fechaVencimiento} required style={fieldStyle} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 style={{ fontFamily: "var(--font)", fontSize: "var(--text-md)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Coberturas
          </h4>
          <button
            type="button"
            onClick={() => setCoberturas((c) => [...c, { tipoCobertura: "ROBO_TOTAL", sumaAsegurada: "0", deducible: "0" }])}
            className="flex items-center gap-1 rounded-md px-2.5 py-1"
            style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
          >
            <Plus size={13} /> Agregar
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {coberturas.map((c, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_1fr_1fr_auto] items-end">
              <div>
                {i === 0 && <label style={labelStyle}>Tipo de cobertura</label>}
                <select
                  value={c.tipoCobertura}
                  onChange={(e) => setCoberturas((cs) => cs.map((x, xi) => xi === i ? { ...x, tipoCobertura: e.target.value } : x))}
                  style={fieldStyle}
                >
                  {Object.entries(TIPO_COBERTURA_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                {i === 0 && <label style={labelStyle}>Suma asegurada</label>}
                <input
                  type="number"
                  value={c.sumaAsegurada}
                  onChange={(e) => setCoberturas((cs) => cs.map((x, xi) => xi === i ? { ...x, sumaAsegurada: e.target.value } : x))}
                  style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }}
                />
              </div>
              <div>
                {i === 0 && <label style={labelStyle}>Deducible</label>}
                <input
                  type="number"
                  value={c.deducible}
                  onChange={(e) => setCoberturas((cs) => cs.map((x, xi) => xi === i ? { ...x, deducible: e.target.value } : x))}
                  style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }}
                />
              </div>
              <button
                type="button"
                onClick={() => setCoberturas((cs) => cs.filter((_, xi) => xi !== i))}
                className="flex items-center justify-center rounded-md"
                style={{ height: "var(--h-md)", width: "var(--h-md)", color: "var(--color-status-escena)" }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md px-5 h-10 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
