"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, FileX, Receipt, Clock, FileQuestion, Download, Mail, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Table, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora, fmtMoney } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar-excel";
import { ETIQUETA_ESTADO, diferencia, hojaConciliacion, type EstadoConciliacion } from "@/lib/conciliacion-combustible";
import type { SearchParamsFiltros } from "@/lib/filtros-gasto";
import { enviarConciliacionPorCorreo } from "@/app/(app)/combustible/conciliacion/actions";

type Fila = {
  estado: EstadoConciliacion;
  numeroEconomico: string;
  fecha: string;
  checklist: { id: string; litros: number | null; importe: number | null } | null;
  transaccion: { litros: number; importe: number; estacion: string | null; fecha: string } | null;
};

const ESTADOS: { estado: EstadoConciliacion; icon: LucideIcon; color: string; bg: string }[] = [
  { estado: "CONCILIADA", icon: CheckCircle2, color: "var(--color-status-cerrado)", bg: "var(--status-cerrado-bg)" },
  { estado: "DIFERENCIA", icon: AlertTriangle, color: "var(--color-status-escena)", bg: "var(--status-escena-bg)" },
  { estado: "SIN_CHECKLIST", icon: FileX, color: "var(--color-status-escena)", bg: "var(--status-escena-bg)" },
  { estado: "SIN_TRANSACCION", icon: Receipt, color: "var(--color-status-revision)", bg: "var(--status-revision-bg)" },
  { estado: "PENDIENTE", icon: Clock, color: "var(--sidebar-text)", bg: "var(--chip)" },
  { estado: "INCOMPLETO", icon: FileQuestion, color: "var(--sidebar-text)", bg: "var(--chip)" },
];
const INFO = Object.fromEntries(ESTADOS.map((e) => [e.estado, e])) as Record<EstadoConciliacion, (typeof ESTADOS)[number]>;

const td: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" };
const boton: React.CSSProperties = { background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", height: "var(--h-md)" };
const litrosTxt = (n: number | null | undefined) => (n == null ? "—" : `${n.toFixed(2)} L`);
const conSigno = (n: number, txt: string) => `${n > 0 ? "+" : ""}${txt}`;

export function ConciliacionCombustibleTabla({ filas, filtros, rango }: { filas: Fila[]; filtros: SearchParamsFiltros; rango: string }) {
  const [estado, setEstado] = useState<EstadoConciliacion | null>(null);
  const [destinatarios, setDestinatarios] = useState("");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, startEnvio] = useTransition();
  const conteo = useMemo(() => {
    const m = new Map<EstadoConciliacion, number>();
    filas.forEach((f) => m.set(f.estado, (m.get(f.estado) ?? 0) + 1));
    return m;
  }, [filas]);
  const visibles = estado ? filas.filter((f) => f.estado === estado) : filas;

  function enviar() {
    setMensaje(null);
    startEnvio(async () => {
      const r = await enviarConciliacionPorCorreo({ filtros, destinatarios: destinatarios.split(",") });
      setMensaje(r.ok ? { ok: true, texto: "Correo enviado." } : { ok: false, texto: r.error });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {ESTADOS.map((e) => (
          <StatCard
            key={e.estado}
            label={ETIQUETA_ESTADO[e.estado]}
            value={conteo.get(e.estado) ?? 0}
            icon={e.icon}
            accent={e.color}
            onClick={() => setEstado((actual) => (actual === e.estado ? null : e.estado))}
            seleccionado={estado === e.estado}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => exportarExcel(`conciliacion-combustible-${rango}`, [hojaConciliacion(visibles)])}
          disabled={visibles.length === 0}
          className="flex items-center gap-1.5 rounded-md px-3 disabled:opacity-50"
          style={boton}
        >
          <Download size={14} /> Exportar a Excel{estado ? ` (${ETIQUETA_ESTADO[estado]})` : ""}
        </button>
        <input
          value={destinatarios}
          onChange={(e) => setDestinatarios(e.target.value)}
          placeholder="correo1@grupokabat.com, correo2@grupokabat.com"
          className="flex-1 min-w-[240px] rounded-md px-3"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", height: "var(--h-md)" }}
        />
        <button type="button" onClick={enviar} disabled={enviando || !destinatarios.trim()} className="flex items-center gap-1.5 rounded-md px-3 disabled:opacity-50" style={boton}>
          {enviando ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Enviar por correo
        </button>
        {mensaje && <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: mensaje.ok ? "var(--color-status-cerrado)" : "var(--color-error)" }}>{mensaje.texto}</span>}
      </div>

      {visibles.length === 0 ? (
        <EmptyState>No hay cargas en este rango{estado ? " con ese estado" : ""}.</EmptyState>
      ) : (
        <Table headers={["Fecha", "Unidad", "Estado", "Checklist (litros · importe)", "Transacción (litros · importe)", "Diferencia", "Estación", ""]} minWidth={1000}>
          {visibles.map((f, i) => {
            const difLitros = diferencia(f.checklist?.litros, f.transaccion?.litros);
            const difImporte = diferencia(f.checklist?.importe, f.transaccion?.importe);
            const partes = [difLitros ? conSigno(difLitros, `${difLitros.toFixed(2)} L`) : null, difImporte ? conSigno(difImporte, fmtMoney(difImporte)) : null].filter(Boolean);
            return (
              <tr key={`${f.checklist?.id ?? ""}-${i}`} style={{ borderBottom: "1px solid var(--field-border)" }}>
                <td className="px-4 py-3 whitespace-nowrap" style={td}>{fmtFechaHora(f.transaccion?.fecha ?? f.fecha)}</td>
                <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{f.numeroEconomico}</td>
                <td className="px-4 py-3"><Badge label={ETIQUETA_ESTADO[f.estado]} color={INFO[f.estado].color} bg={INFO[f.estado].bg} /></td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ ...td, fontFamily: "var(--font-mono)" }}>
                  {f.checklist ? `${litrosTxt(f.checklist.litros)} · ${f.checklist.importe == null ? "—" : fmtMoney(f.checklist.importe)}` : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ ...td, fontFamily: "var(--font-mono)" }}>
                  {f.transaccion ? `${litrosTxt(f.transaccion.litros)} · ${fmtMoney(f.transaccion.importe)}` : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ ...td, fontFamily: "var(--font-mono)", color: f.estado === "DIFERENCIA" ? "var(--color-status-escena)" : td.color }}>
                  {f.estado === "DIFERENCIA" || f.estado === "CONCILIADA" ? partes.join(" · ") || "—" : "—"}
                </td>
                <td className="px-4 py-3" style={td}>{f.transaccion?.estacion ?? "—"}</td>
                <td className="px-4 py-3">
                  {f.checklist && (
                    <Link href={`/checklist/${f.checklist.id}`} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-primary)" }}>
                      Ver checklist
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
        Diferencia = checklist − transacción. Una carga con diferencia o sin pareja puede ser un error de captura del operador, una carga no documentada o una transacción a revisar.
        El correo envía todas las cargas del rango y filtros actuales; la descarga respeta además la tarjeta seleccionada.
      </p>
    </div>
  );
}
