"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, FileBadge, Pencil, TriangleAlert, Car, GraduationCap, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, EmptyState, Field, panelStyle, tdStyle } from "@/components/ui/table";
import {
  ESTATUS_OPERADOR_LABEL,
  ESTATUS_DOCUMENTAL_LABEL,
  ESTATUS_DOCUMENTAL_STYLE,
  TIPO_DOCUMENTO_LABEL,
  TIPO_SANGRE_LABEL,
} from "@/lib/estatus-operador";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import { fmtFecha, diasPara } from "@/lib/formato";
import { FormAccidente } from "@/components/accidentes/form-accidente";
import { FormCurso } from "@/components/operadores/form-curso";
import { blobProxy } from "@/lib/blob";
import { Panel, FilaItem } from "@/components/ui/documento-panel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Operador = any;

// Solo existen dos tipos de licencia: A (autos, camionetas, motos) y B (solo grúas) —
// debe coincidir con el enum TipoLicencia del schema y con el bloqueo real en
// src/app/(app)/unidades/actions.ts (actualizarUnidad).
const LICENCIA_ORDEN = ["A", "B"];
const LICENCIA_REQUERIDA: Record<string, string> = {
  AUTO: "A",
  MOTO: "A",
  CAMIONETA: "A",
  GRUA: "B",
  OTRO: "A",
};

const TIPO_LICENCIA_MANEJO_LABEL: Record<string, string> = {
  TIPO_A: "Tipo A — Autos / camionetas / motos",
  TIPO_B: "Tipo B — Solo grúas",
};

const TABS = [
  { id: "historial", label: "Historial de resguardo" },
  { id: "siniestros", label: "Siniestros" },
  { id: "cursos", label: "Cursos" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function FichaOperador({ operador }: { operador: Operador }) {
  const [tab, setTab] = useState<TabId>("historial");
  const licencia = operador.documentos.find((d: Operador) => d.tipoDocumento === "LICENCIA");
  const licenciaIdx = licencia?.tipoLicencia ? LICENCIA_ORDEN.indexOf(licencia.tipoLicencia) : -1;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/operadores" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a operadores
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--brand-navy)", color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "var(--text-lg)" }}>
              {operador.nombre.split(" ").slice(0, 2).map((p: string) => p[0]).join("")}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
                  {operador.nombre}
                </h1>
                <Badge
                  label={ESTATUS_DOCUMENTAL_LABEL[operador.estatusDocumental]}
                  color={ESTATUS_DOCUMENTAL_STYLE[operador.estatusDocumental]?.color}
                  bg={ESTATUS_DOCUMENTAL_STYLE[operador.estatusDocumental]?.bg}
                />
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
                {operador.proyecto?.nombre ?? "Sin proyecto"} · {ESTATUS_OPERADOR_LABEL[operador.estatus]}
              </div>
            </div>
          </div>

          <Link href={`/operadores/${operador.id}/editar`} className="flex items-center gap-2 rounded-md px-3 h-9" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <Pencil size={15} /> Editar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl p-5" style={panelStyle}>
          <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Datos personales
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="CURP" value={<span style={{ fontFamily: "var(--font-mono)" }}>{operador.curp}</span>} />
            <Field label="RFC" value={<span style={{ fontFamily: "var(--font-mono)" }}>{operador.rfc ?? "—"}</span>} />
            <Field label="NSS" value={<span style={{ fontFamily: "var(--font-mono)" }}>{operador.nss ?? "—"}</span>} />
            <Field label="Tipo de sangre" value={operador.tipoSangre ? TIPO_SANGRE_LABEL[operador.tipoSangre] : "—"} />
            <Field label="Teléfono" value={operador.telefono ?? "—"} />
            <Field label="Contacto de emergencia" value={operador.contactoEmergencia ?? "—"} />
            <Field
              label="Tipo de licencia"
              value={
                operador.tipoLicenciaManejo
                  ? <Badge
                      label={TIPO_LICENCIA_MANEJO_LABEL[operador.tipoLicenciaManejo] ?? operador.tipoLicenciaManejo}
                      color="var(--color-primary)"
                      bg="var(--chip)"
                    />
                  : "—"
              }
            />
            <Field
              label="Última capacitación"
              value={operador.fechaUltimaCapacitacion ? fmtFecha(operador.fechaUltimaCapacitacion) : "—"}
            />
          </div>
          {operador.licenciaDocumentoUrl && (
            <a
              href={blobProxy(operador.licenciaDocumentoUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 rounded-md px-3 h-8"
              style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
            >
              <FileBadge size={14} /> Ver documento de licencia
            </a>
          )}
        </div>

        <div className="rounded-xl p-5" style={panelStyle}>
          <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Unidades resguardadas actualmente
          </h3>
          {operador.unidadesResguardadas.length === 0 ? (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}>Sin unidades asignadas.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {operador.unidadesResguardadas.map((u: Operador) => {
                const requerida = LICENCIA_REQUERIDA[u.tipoVehiculo] ?? "A";
                const requeridaIdx = LICENCIA_ORDEN.indexOf(requerida);
                const incompatible = licenciaIdx >= 0 && licenciaIdx < requeridaIdx;
                return (
                  <div key={u.numeroEconomico} className="flex items-center justify-between gap-3 rounded-md px-3 py-2" style={{ background: "var(--field-bg)" }}>
                    <Link href={`/unidades/${u.numeroEconomico}`} className="flex items-center gap-2" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                      <Car size={15} color="var(--sidebar-text)" />
                      {u.numeroEconomico}
                    </Link>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                      {u.marca} {u.unidadModelo} · {TIPO_VEHICULO_LABEL[u.tipoVehiculo]}
                    </span>
                    {incompatible && (
                      <Badge label={`Requiere licencia ${requerida}`} color="var(--color-status-escena)" bg="var(--status-escena-bg)" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {licenciaIdx >= 0 && operador.unidadesResguardadas.some((u: Operador) => LICENCIA_ORDEN.indexOf(LICENCIA_REQUERIDA[u.tipoVehiculo] ?? "A") > licenciaIdx) && (
            <div className="mt-3 flex items-center gap-2 rounded-md px-3 py-2" style={{ background: "var(--status-escena-bg)" }}>
              <TriangleAlert size={15} color="var(--color-status-escena)" />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-escena)" }}>
                Incompatibilidad de licencia detectada para alguna unidad asignada.
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Documentación
        </h3>
        {operador.documentos.length === 0 ? (
          <EmptyState>Sin documentos capturados.</EmptyState>
        ) : (
          <Panel>
            {operador.documentos.map((d: Operador) => {
              const esPermanente = d.tipoDocumento === "LICENCIA" && d.fechaVencimiento === null;
              const dias = diasPara(d.fechaVencimiento);
              const vencido = dias !== null && dias < 0;
              const porVencer = dias !== null && dias >= 0 && dias <= 60;
              return (
                <FilaItem
                  key={d.id}
                  label={
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-2" style={{ fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                        <FileBadge size={14} color="var(--sidebar-text)" />
                        {TIPO_DOCUMENTO_LABEL[d.tipoDocumento] ?? d.tipoDocumento}
                        {d.tipoLicencia && <span style={{ fontFamily: "var(--font-mono)", color: "var(--sidebar-text)" }}> (tipo {d.tipoLicencia})</span>}
                      </span>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                        {d.numero ? <span style={{ fontFamily: "var(--font-mono)" }}>{d.numero}</span> : "Sin número"} · Emitido {fmtFecha(d.fechaEmision)} ·{" "}
                        {esPermanente ? "Permanente" : d.fechaVencimiento ? `Vence ${fmtFecha(d.fechaVencimiento)}` : "Sin vigencia"} ·{" "}
                        {d.verificado ? "Verificado" : "Pendiente de verificar"}
                      </span>
                    </div>
                  }
                  badge={
                    esPermanente ? (
                      <Badge label="Permanente" color="var(--color-primary)" bg="var(--chip)" />
                    ) : vencido ? (
                      <Badge label="Vencido" color="var(--color-status-escena)" bg="var(--status-escena-bg)" />
                    ) : porVencer ? (
                      <Badge label={`Vence en ${dias}d`} color="var(--color-status-revision)" bg="var(--status-revision-bg)" />
                    ) : (
                      <Badge label="Vigente" color="var(--color-status-cerrado)" bg="var(--status-cerrado-bg)" />
                    )
                  }
                  foto={d.archivo?.url}
                />
              );
            })}
          </Panel>
        )}
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 overflow-x-auto border-b" style={{ borderColor: "var(--field-border)" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2.5 whitespace-nowrap border-b-2 -mb-px transition-colors"
              style={{
                borderColor: tab === t.id ? "var(--color-primary)" : "transparent",
                color: tab === t.id ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-base)",
                fontWeight: tab === t.id ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="pt-5">
          {tab === "historial" && <TabHistorial operador={operador} />}
          {tab === "siniestros" && <TabSiniestros operador={operador} />}
          {tab === "cursos" && <TabCursos operador={operador} />}
        </div>
      </div>
    </div>
  );
}

function TabHistorial({ operador }: { operador: Operador }) {
  if (operador.resguardos.length === 0) return <EmptyState>Sin historial de unidades resguardadas.</EmptyState>;
  return (
    <Table headers={["Unidad", "Desde", "Hasta", "Motivo del cambio"]} minWidth={640}>
      {operador.resguardos.map((r: Operador) => (
        <tr key={r.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
          <td className="px-4 py-3" style={{ ...tdStyle, fontFamily: "var(--font-mono)" }}>{r.unidad.numeroEconomico}</td>
          <td className="px-4 py-3" style={tdStyle}>{fmtFecha(r.fechaDesde)}</td>
          <td className="px-4 py-3" style={tdStyle}>{r.fechaHasta ? fmtFecha(r.fechaHasta) : "Actual"}</td>
          <td className="px-4 py-3" style={tdStyle}>{r.motivoCambio ?? "—"}</td>
        </tr>
      ))}
    </Table>
  );
}

function TabSiniestros({ operador }: { operador: Operador }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <h3 className="flex items-center gap-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          <AlertTriangle size={18} color="var(--color-status-revision)" />
          Accidentes / siniestros
        </h3>
        <FormAccidente numeroEconomico={operador.unidadesResguardadas[0]?.numeroEconomico ?? ""} operadorId={operador.id} />
      </div>
      {!operador.accidentes || operador.accidentes.length === 0 ? (
        <EmptyState>Sin accidentes registrados.</EmptyState>
      ) : (
        <Table headers={["Fecha", "Unidad", "Tipo", "Descripción", "Evidencias"]} minWidth={700}>
          {operador.accidentes.map((a: Operador) => (
            <tr key={a.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3 whitespace-nowrap" style={tdStyle}>{fmtFecha(a.fecha)}</td>
              <td className="px-4 py-3" style={{ ...tdStyle, fontFamily: "var(--font-mono)" }}>
                {a.numeroEconomico ? <Link href={`/unidades/${a.numeroEconomico}`} style={{ color: "var(--color-primary)" }}>{a.numeroEconomico}</Link> : "—"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap" style={tdStyle}>{a.tipo}</td>
              <td className="px-4 py-3" style={tdStyle}>{a.descripcion}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1 flex-wrap">
                  {(a.evidencias ?? []).map((url: string, i: number) => (
                    <a key={url} href={blobProxy(url)} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--color-primary)" }}>
                      Foto {i + 1}
                    </a>
                  ))}
                  {(!a.evidencias || a.evidencias.length === 0) && <span style={{ color: "var(--sidebar-text)" }}>—</span>}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function TabCursos({ operador }: { operador: Operador }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <h3 className="flex items-center gap-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          <GraduationCap size={18} color="var(--color-primary)" />
          Cursos y capacitaciones
        </h3>
        <FormCurso operadorId={operador.id} />
      </div>
      {!operador.cursos || operador.cursos.length === 0 ? (
        <EmptyState>Sin cursos registrados.</EmptyState>
      ) : (
        <Table headers={["Fecha", "Nombre del curso", "Evidencia"]} minWidth={500}>
          {operador.cursos.map((c: Operador) => (
            <tr key={c.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3 whitespace-nowrap" style={tdStyle}>{fmtFecha(c.fecha)}</td>
              <td className="px-4 py-3" style={tdStyle}>{c.nombre}</td>
              <td className="px-4 py-3">
                {c.evidenciaUrl ? (
                  <a href={blobProxy(c.evidenciaUrl)} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-primary)" }}>
                    Ver constancia
                  </a>
                ) : (
                  <span style={{ color: "var(--sidebar-text)" }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
