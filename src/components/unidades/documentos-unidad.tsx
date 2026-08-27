"use client";

import { useMemo, useState, useTransition } from "react";
import { Upload, CheckCircle2, FileText, Image as ImageIcon, Plus } from "lucide-react";
import { subirDocumentoUnidad } from "@/app/(app)/unidades/actions";
import { EmptyState, Table } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { blobProxy } from "@/lib/blob";
import { fmtFecha } from "@/lib/formato";
import { Modal } from "@/components/ui/modal";
import { TIPOS_DOCUMENTO_UNIDAD, TIPO_DOCUMENTO_UNIDAD_LABEL, REQUIERE_ANIO } from "@/lib/catalogo-documentos-unidad";
import type { TipoDocumentoUnidad } from "@/generated/prisma/enums";

type DocumentoUnidadRow = {
  id: string;
  tipoDocumento: TipoDocumentoUnidad;
  anio: number | null;
  descripcion: string | null;
  createdAt: string;
  archivo: { url: string };
  subidoPor: { nombre: string } | null;
};

function esImagen(url: string) {
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(url);
}

function SubirDocumentoUnidadForm({ numeroEconomico, onExito }: { numeroEconomico: string; onExito: () => void }) {
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoUnidad>(TIPOS_DOCUMENTO_UNIDAD[0]);

  const fieldStyle: React.CSSProperties = {
    background: "var(--field-bg)",
    border: "1px solid var(--field-border)",
    color: "var(--field-text)",
    height: "var(--h-md)",
    fontFamily: "var(--font-ui)",
    fontSize: "var(--text-base)",
  };

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await subirDocumentoUnidad(formData);
          if (res.ok) {
            setOk(true);
            setTimeout(() => { setOk(false); onExito(); }, 900);
          } else {
            setError(res.error ?? "No se pudo subir el documento.");
          }
        });
      }}
    >
      <input type="hidden" name="numeroEconomico" value={numeroEconomico} />
      <div>
        <label className="block mb-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>
          Concepto *
        </label>
        <select
          name="tipoDocumento"
          required
          value={tipoDocumento}
          onChange={(e) => setTipoDocumento(e.target.value as TipoDocumentoUnidad)}
          className="w-full rounded-md px-3"
          style={fieldStyle}
        >
          {TIPOS_DOCUMENTO_UNIDAD.map((t) => (
            <option key={t} value={t}>{TIPO_DOCUMENTO_UNIDAD_LABEL[t]}</option>
          ))}
        </select>
      </div>

      {REQUIERE_ANIO.has(tipoDocumento) && (
        <div>
          <label className="block mb-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>
            Año *
          </label>
          <input name="anio" type="number" required min={2000} max={2100} className="w-full rounded-md px-3" style={fieldStyle} />
        </div>
      )}

      <div>
        <label className="block mb-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>
          Descripción (opcional)
        </label>
        <input name="descripcion" type="text" className="w-full rounded-md px-3" style={fieldStyle} placeholder="Notas adicionales sobre este documento" />
      </div>

      <div>
        <label className="block mb-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>
          Archivo (PDF o imagen) *
        </label>
        <input
          name="archivo"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
          required
          style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-md px-4 h-10 font-semibold disabled:opacity-60 w-fit"
        style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      >
        {ok ? <><CheckCircle2 size={16} /> Subido</> : pending ? "Subiendo…" : <><Upload size={15} /> Guardar documento</>}
      </button>
      {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>{error}</p>}
    </form>
  );
}

export function DocumentosUnidad({ numeroEconomico, documentos }: { numeroEconomico: string; documentos: DocumentoUnidadRow[] }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    const ordenados = [...documentos].sort((a, b) => {
      const conceptoA = TIPO_DOCUMENTO_UNIDAD_LABEL[a.tipoDocumento];
      const conceptoB = TIPO_DOCUMENTO_UNIDAD_LABEL[b.tipoDocumento];
      if (conceptoA !== conceptoB) return conceptoA.localeCompare(conceptoB);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    if (!q) return ordenados;
    return ordenados.filter((d) =>
      TIPO_DOCUMENTO_UNIDAD_LABEL[d.tipoDocumento].toUpperCase().includes(q) ||
      (d.descripcion ?? "").toUpperCase().includes(q) ||
      String(d.anio ?? "").includes(q)
    );
  }, [documentos, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar concepto, descripción o año…" />
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="flex items-center gap-2 rounded-md px-3 h-9 font-semibold"
          style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
        >
          <Plus size={14} /> Subir documento
        </button>
      </div>

      {abierto && (
        <Modal title={`Subir documento — ${numeroEconomico}`} onClose={() => setAbierto(false)}>
          <SubirDocumentoUnidadForm numeroEconomico={numeroEconomico} onExito={() => setAbierto(false)} />
        </Modal>
      )}

      {filtrados.length === 0 ? (
        <EmptyState>Sin documentos cargados todavía.</EmptyState>
      ) : (
        <Table headers={["Concepto", "Año", "Descripción", "Subido por", "Fecha", ""]} minWidth={760}>
          {filtrados.map((d) => (
            <tr key={d.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3 flex items-center gap-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                {esImagen(d.archivo.url) ? <ImageIcon size={15} color="var(--sidebar-text)" /> : <FileText size={15} color="var(--sidebar-text)" />}
                {TIPO_DOCUMENTO_UNIDAD_LABEL[d.tipoDocumento]}
              </td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{d.anio ?? "—"}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{d.descripcion ?? "—"}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{d.subidoPor?.nombre ?? "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFecha(d.createdAt)}</td>
              <td className="px-4 py-3">
                <a href={blobProxy(d.archivo.url)} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-primary)" }}>
                  Ver documento
                </a>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
