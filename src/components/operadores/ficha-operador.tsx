import Link from "next/link";
import { ChevronLeft, FileBadge, Pencil, TriangleAlert, Car } from "lucide-react";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Operador = any;

const LICENCIA_ORDEN = ["A", "B", "C", "D", "E"];
const LICENCIA_REQUERIDA: Record<string, string> = {
  AUTO: "A",
  MOTO: "A",
  CAMIONETA: "B",
  GRUA: "C",
  OTRO: "B",
};

export function FichaOperador({ operador }: { operador: Operador }) {
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

          <button className="flex items-center gap-2 rounded-md px-3 h-9" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <Pencil size={15} /> Editar
          </button>
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
          </div>
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
          <Table headers={["Documento", "Número", "Emisión", "Vencimiento", "Verificado", "Estado"]} minWidth={760}>
            {operador.documentos.map((d: Operador) => {
              const dias = diasPara(d.fechaVencimiento);
              const vencido = dias !== null && dias < 0;
              const porVencer = dias !== null && dias >= 0 && dias <= 60;
              return (
                <tr key={d.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
                  <td className="px-4 py-3" style={tdStyle}>
                    <div className="flex items-center gap-2">
                      <FileBadge size={14} color="var(--sidebar-text)" />
                      {TIPO_DOCUMENTO_LABEL[d.tipoDocumento] ?? d.tipoDocumento}
                      {d.tipoLicencia && <span style={{ fontFamily: "var(--font-mono)", color: "var(--sidebar-text)" }}> (tipo {d.tipoLicencia})</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ ...tdStyle, fontFamily: "var(--font-mono)" }}>{d.numero ?? "—"}</td>
                  <td className="px-4 py-3" style={tdStyle}>{fmtFecha(d.fechaEmision)}</td>
                  <td className="px-4 py-3" style={tdStyle}>{d.fechaVencimiento ? fmtFecha(d.fechaVencimiento) : "Sin vigencia"}</td>
                  <td className="px-4 py-3">
                    <Badge label={d.verificado ? "Verificado" : "Pendiente"} color={d.verificado ? "var(--color-status-cerrado)" : "var(--sidebar-text)"} bg={d.verificado ? "var(--status-cerrado-bg)" : "var(--chip)"} />
                  </td>
                  <td className="px-4 py-3">
                    {vencido ? (
                      <Badge label="Vencido" color="var(--color-status-escena)" bg="var(--status-escena-bg)" />
                    ) : porVencer ? (
                      <Badge label={`Vence en ${dias}d`} color="var(--color-status-revision)" bg="var(--status-revision-bg)" />
                    ) : (
                      <Badge label="Vigente" color="var(--color-status-cerrado)" bg="var(--status-cerrado-bg)" />
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Historial de resguardo
        </h3>
        {operador.resguardos.length === 0 ? (
          <EmptyState>Sin historial de unidades resguardadas.</EmptyState>
        ) : (
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
        )}
      </div>
    </div>
  );
}
