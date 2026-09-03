import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { PUNTOS_INSPECCION } from "@/lib/checklist";
import { SECCIONES_CHECKLIST_SEMANAL } from "@/lib/checklist-semanal";
import { SECCIONES_CARGA_COMBUSTIBLE } from "@/lib/checklist-carga-combustible";
import { SECCIONES_REPORTE_FALLA } from "@/lib/checklist-reporte-falla";
import { blobProxy } from "@/lib/blob";
import { PrintButton } from "@/components/checklist/print-button";
import { SeccionTitulo, FilaItem, Panel } from "@/components/ui/documento-panel";

export const dynamic = "force-dynamic";

const PRINT_CSS = `
@media print {
  [data-no-print], nav, aside { display: none !important; }
  body { background: white !important; }
  .checklist-wrap { padding: 12px !important; max-width: 100% !important; }
  .print-section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 14px; }
  .print-row { break-inside: avoid; page-break-inside: avoid; }
  .print-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
`;

function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Piezas visuales ──────────────────────────────────────────────────────────

function ColorChip({ value }: { value: string }) {
  const v = value?.toUpperCase() ?? "";
  let bg = "var(--chip)";
  let color = "var(--sidebar-text)";
  if (["BUEN ESTADO", "MAXIMO", "Y", "OK", "SÍ", "CON VIGENCIA"].includes(v)) { bg = "var(--status-cerrado-bg)"; color = "var(--color-status-cerrado)"; }
  else if (["MAL ESTADO", "MINIMO", "N", "REVISAR", "FALLA", "NO", "SIN VIGENCIA", "ROTO", "ESTRELLADO"].includes(v)) { bg = "var(--status-escena-bg, #fef2f2)"; color = "var(--color-status-escena)"; }
  else if (v === "MEDIO") { bg = "var(--status-revision-bg)"; color = "var(--color-status-revision)"; }
  return (
    <span
      className="inline-block rounded-full whitespace-nowrap"
      style={{ background: bg, color, fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 700, padding: "3px 10px", letterSpacing: "0.03em" }}
    >
      {value}
    </span>
  );
}

// ─── Detalle Diario ───────────────────────────────────────────────────────────

function DetalleDiario({
  puntos,
  evidenciaUrl,
  odometro,
  horometro,
  respuestasExtra = {},
}: {
  puntos: Record<string, string>;
  evidenciaUrl?: string;
  odometro?: number | null;
  horometro?: number | null;
  respuestasExtra?: Record<string, string>;
}) {
  const fotoHorometro = puntos["horometro_foto"];

  return (
    <div className="flex flex-col gap-5">
      {/* Datos generales (nueva sección) */}
      {(respuestasExtra["gen_zona"] || respuestasExtra["gen_municipio"]) && (
        <Panel>
          <SeccionTitulo titulo="Datos generales" />
          {[
            { label: "Estado", key: "gen_zona" },
            { label: "Municipio", key: "gen_municipio" },
            { label: "Área", key: "gen_area" },
            { label: "Responsable", key: "gen_responsable" },
            { label: "Tipo de licencia", key: "gen_tipo_licencia" },
          ].filter((f) => respuestasExtra[f.key]).map((f) => (
            <FilaItem key={f.key} label={f.label} badge={<ColorChip value={respuestasExtra[f.key]} />} />
          ))}
          {respuestasExtra["gen_foto_licencia"] && (
            <FilaItem label="Foto de licencia" badge={null} foto={respuestasExtra["gen_foto_licencia"]} />
          )}
        </Panel>
      )}

      {/* Puntos de inspección */}
      <Panel>
        <SeccionTitulo titulo="Puntos de inspección" />
        {PUNTOS_INSPECCION.map((p) => {
          const estado = puntos[p.key] ?? "—";
          const ok = estado === "ok";
          const foto = puntos[`${p.key}_foto`];
          return (
            <FilaItem
              key={p.key}
              label={
                <span className="flex items-center gap-2">
                  {ok
                    ? <CheckCircle2 size={15} color="var(--color-status-cerrado)" className="shrink-0" />
                    : <AlertTriangle size={15} color="var(--color-status-escena)" className="shrink-0" />}
                  {p.label}
                </span>
              }
              badge={<ColorChip value={ok ? "OK" : estado === "falla" ? "REVISAR" : estado.toUpperCase()} />}
              foto={foto}
            />
          );
        })}
      </Panel>

      {/* Niveles (nueva sección) */}
      {(respuestasExtra["niv_luz_check"] || respuestasExtra["niv_nivel_combustible"]) && (
        <Panel>
          <SeccionTitulo titulo="Niveles" />
          {respuestasExtra["niv_luz_check"] && (
            <FilaItem label="Luz de check encendida" badge={<ColorChip value={respuestasExtra["niv_luz_check"]} />} foto={respuestasExtra["niv_evidencia_luz_check"]} />
          )}
          {respuestasExtra["niv_nivel_combustible"] && (
            <FilaItem label="Nivel de combustible" badge={<ColorChip value={respuestasExtra["niv_nivel_combustible"]} />} foto={respuestasExtra["niv_evidencia_combustible"]} />
          )}
        </Panel>
      )}

      {/* Exterior (nueva sección) */}
      {(respuestasExtra["ext_tiene_golpes"] || respuestasExtra["ext_parabrisas_espejos"] || respuestasExtra["ext_evidencia_frente"]) && (
        <Panel>
          <SeccionTitulo titulo="Exterior" />
          {respuestasExtra["ext_tiene_golpes"] && (
            <FilaItem label="¿Tiene golpes?" badge={<ColorChip value={respuestasExtra["ext_tiene_golpes"]} />} />
          )}
          {respuestasExtra["ext_parabrisas_espejos"] && (
            <FilaItem label="Parabrisas y espejos" badge={<ColorChip value={respuestasExtra["ext_parabrisas_espejos"]} />} foto={respuestasExtra["ext_evidencia_parabrisas_espejos"]} />
          )}
          {[
            { key: "ext_evidencia_frente", label: "Foto frente" },
            { key: "ext_evidencia_lado_derecho", label: "Foto lado derecho" },
            { key: "ext_evidencia_parte_trasera", label: "Foto parte trasera" },
            { key: "ext_evidencia_lado_izquierdo", label: "Foto lado izquierdo" },
            { key: "ext_brazo_grua", label: "Foto brazo de grúa" },
          ].filter((f) => respuestasExtra[f.key]).map((f) => (
            <FilaItem key={f.key} label={f.label} badge={null} foto={respuestasExtra[f.key]} />
          ))}
        </Panel>
      )}

      {/* Interior (nueva sección) */}
      {(respuestasExtra["int_evidencia_tarjeta_circulacion"] || respuestasExtra["int_evidencia_tarjeta_combustible"]) && (
        <Panel>
          <SeccionTitulo titulo="Documentos en cabina" />
          {respuestasExtra["int_evidencia_tarjeta_circulacion"] && (
            <FilaItem label="Tarjeta de circulación" badge={null} foto={respuestasExtra["int_evidencia_tarjeta_circulacion"]} />
          )}
          {respuestasExtra["int_evidencia_tarjeta_combustible"] && (
            <FilaItem label="Tarjeta de combustible" badge={null} foto={respuestasExtra["int_evidencia_tarjeta_combustible"]} />
          )}
        </Panel>
      )}

      {/* Lecturas y evidencia */}
      {(odometro != null || horometro != null) && (
        <Panel>
          <SeccionTitulo titulo="Lecturas y evidencia" />
          <div className="grid gap-0" style={{ gridTemplateColumns: odometro != null && horometro != null ? "1fr 1fr" : "1fr" }}>
            {odometro != null && (
              <div
                className="flex flex-col gap-3 p-5"
                style={{ borderRight: horometro != null ? "1px solid var(--field-border)" : undefined }}
              >
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Odómetro
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--field-text)", marginTop: 4 }}>
                    {odometro.toLocaleString("es-MX")} <span style={{ fontSize: "var(--text-sm)", fontWeight: 400 }}>km</span>
                  </div>
                </div>
                {evidenciaUrl && (
                  <a href={blobProxy(evidenciaUrl)} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={blobProxy(evidenciaUrl)}
                      alt="Foto odómetro"
                      style={{ width: "100%", maxWidth: 200, height: 130, objectFit: "cover", borderRadius: 8, border: "1px solid var(--field-border)" }}
                    />
                  </a>
                )}
              </div>
            )}
            {horometro != null && (
              <div className="flex flex-col gap-3 p-5">
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Horómetro
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--field-text)", marginTop: 4 }}>
                    {horometro.toLocaleString("es-MX")} <span style={{ fontSize: "var(--text-sm)", fontWeight: 400 }}>h</span>
                  </div>
                </div>
                {fotoHorometro && (
                  <a href={blobProxy(fotoHorometro)} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={blobProxy(fotoHorometro)}
                      alt="Foto horómetro"
                      style={{ width: "100%", maxWidth: 200, height: 130, objectFit: "cover", borderRadius: 8, border: "1px solid var(--field-border)" }}
                    />
                  </a>
                )}
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Seguridad y equipamiento (nueva sección) */}
      {(respuestasExtra["seg_llanta_refaccion"] || respuestasExtra["seg_gato"] || respuestasExtra["seg_cables_corriente"]) && (
        <Panel>
          <SeccionTitulo titulo="Seguridad y equipamiento" />
          {[
            { label: "Llanta de refacción", key: "seg_llanta_refaccion", fotoKey: "seg_evidencia_llanta_refaccion" },
            { label: "Gato", key: "seg_gato", fotoKey: "seg_evidencia_gato" },
            { label: "Cables de corriente", key: "seg_cables_corriente", fotoKey: "seg_evidencia_cables_corriente" },
          ].filter((f) => respuestasExtra[f.key]).map((f) => (
            <FilaItem key={f.key} label={f.label} badge={<ColorChip value={respuestasExtra[f.key]} />} foto={respuestasExtra[f.fotoKey] || undefined} />
          ))}
          {respuestasExtra["seg_observaciones"] && (
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--field-border)" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Observaciones
              </div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                {respuestasExtra["seg_observaciones"]}
              </p>
            </div>
          )}
          {respuestasExtra["seg_firma_responsable"] && (
            <div className="px-4 py-3 flex flex-col gap-2">
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Firma del responsable
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={respuestasExtra["seg_firma_responsable"]}
                alt="Firma"
                style={{ maxWidth: 260, height: 90, objectFit: "contain", background: "#fff", border: "1px solid var(--field-border)", borderRadius: 8, padding: 8 }}
              />
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}


// ─── Detalle Semanal ──────────────────────────────────────────────────────────

function DetalleSemanal({ respuestas }: { respuestas: Record<string, string> }) {
  const fotosEncabezado = [
    { url: respuestas.fotoLicenciaUrl, label: "Foto de licencia" },
    { url: respuestas.gen_foto_odometro, label: "Foto odómetro" },
    { url: respuestas.gen_foto_horometro, label: "Foto horómetro" },
  ].filter((f) => f.url);

  const generalesTexto = [
    { label: "Oficina / Sede", value: respuestas.oficinaSede },
    { label: "Modelo", value: respuestas.modelo },
    { label: "Tipo de vehículo", value: respuestas.tipoVehiculo },
    { label: "Licencia permanente", value: respuestas.licenciaPermanente },
    { label: "Odómetro", value: respuestas.gen_odometro ? `${respuestas.gen_odometro} km` : undefined },
    { label: "Horómetro", value: respuestas.gen_horometro ? `${respuestas.gen_horometro} h` : undefined },
  ].filter((c) => c.value);

  return (
    <div className="flex flex-col gap-5">
      {/* Datos generales */}
      {(generalesTexto.length > 0 || fotosEncabezado.length > 0) && (
        <Panel>
          <SeccionTitulo titulo="Datos generales" />
          {generalesTexto.map((c) => (
            <FilaItem
              key={c.label}
              label={c.label}
              badge={
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)", fontWeight: 500 }}>
                  {c.value}
                </span>
              }
            />
          ))}
          {fotosEncabezado.map((f) => (
            <FilaItem key={f.label} label={f.label} badge={null} foto={f.url!} />
          ))}
        </Panel>
      )}

      {/* Secciones de inspección */}
      {SECCIONES_CHECKLIST_SEMANAL.map((seccion) => {
        const filas: { label: string; valor: string | null; foto: string | null }[] = [];
        for (const campo of seccion.campos) {
          if (campo.tipo === "foto") {
            const url = respuestas[campo.key];
            if (url) filas.push({ label: campo.label, valor: null, foto: url });
          } else {
            const valor = respuestas[campo.key];
            if (!valor) continue;
            const foto = "fotoKey" in campo && campo.fotoKey ? (respuestas[campo.fotoKey] || null) : null;
            filas.push({ label: campo.label, valor, foto });
          }
        }
        if (!filas.length) return null;

        return (
          <Panel key={seccion.key}>
            <SeccionTitulo titulo={seccion.titulo} />
            {filas.map((fila, i) => (
              <FilaItem
                key={i}
                label={fila.label}
                badge={fila.valor ? <ColorChip value={fila.valor} /> : null}
                foto={fila.foto ?? undefined}
              />
            ))}
          </Panel>
        );
      })}
    </div>
  );
}

// ─── Detalle Carga de Combustible ─────────────────────────────────────────────

function DetalleCargaCombustible({ respuestas }: { respuestas: Record<string, string> }) {
  return (
    <div className="flex flex-col gap-5">
      {SECCIONES_CARGA_COMBUSTIBLE.map((seccion) => {
        const textoCampos = seccion.campos
          .map((c) => ({ label: c.label, value: respuestas[c.key] }))
          .filter((c) => c.value);
        const fotoCampos = seccion.fotos
          .map((f) => ({ label: f.label, url: respuestas[f.key] }))
          .filter((f) => f.url);
        const firma = "firma" in seccion && seccion.firma ? respuestas[seccion.firma.key] : undefined;

        if (!textoCampos.length && !fotoCampos.length && !firma) return null;

        return (
          <Panel key={seccion.key}>
            <SeccionTitulo titulo={seccion.titulo} />
            {textoCampos.map((c) => (
              <FilaItem
                key={c.label}
                label={c.label}
                badge={
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)", fontWeight: 500 }}>
                    {c.value}
                  </span>
                }
              />
            ))}
            {fotoCampos.length > 0 && (
              <div className="px-5 py-4" style={{ borderTop: "1px solid var(--field-border)" }}>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                  Evidencia fotográfica
                </p>
                <div className="flex flex-wrap gap-4">
                  {fotoCampos.map((f) => (
                    <div key={f.label} className="flex flex-col gap-1.5 items-center">
                      <a href={blobProxy(f.url!)} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={blobProxy(f.url!)}
                          alt={f.label}
                          style={{ width: 110, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid var(--field-border)" }}
                        />
                      </a>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textAlign: "center", maxWidth: 110 }}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {firma && (
              <div className="px-5 py-4 flex flex-col gap-2" style={{ borderTop: "1px solid var(--field-border)" }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Firma del responsable
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={firma}
                  alt="Firma"
                  style={{ maxWidth: 260, height: 90, objectFit: "contain", background: "#fff", border: "1px solid var(--field-border)", borderRadius: 8, padding: 8 }}
                />
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

function DetalleReporteFalla({ respuestas }: { respuestas: Record<string, string> }) {
  return (
    <div className="flex flex-col gap-5">
      {SECCIONES_REPORTE_FALLA.map((seccion) => {
        const textoCampos = seccion.campos
          .map((c) => ({ label: c.label, value: respuestas[c.key] }))
          .filter((c) => c.value);
        const fotoCampos = seccion.fotos
          .map((f) => ({ label: f.label, url: respuestas[f.key] }))
          .filter((f) => f.url);

        if (!textoCampos.length && !fotoCampos.length) return null;

        return (
          <Panel key={seccion.key}>
            <SeccionTitulo titulo={seccion.titulo} />
            {textoCampos.map((c) => (
              <FilaItem
                key={c.label}
                label={c.label}
                badge={
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)", fontWeight: 500 }}>
                    {c.value}
                  </span>
                }
              />
            ))}
            {fotoCampos.length > 0 && (
              <div className="px-5 py-4" style={{ borderTop: "1px solid var(--field-border)" }}>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                  Fotos
                </p>
                <div className="flex flex-wrap gap-4">
                  {fotoCampos.map((f) => (
                    <div key={f.label} className="flex flex-col gap-1.5 items-center">
                      <a href={blobProxy(f.url!)} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={blobProxy(f.url!)}
                          alt={f.label}
                          style={{ width: 110, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid var(--field-border)" }}
                        />
                      </a>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textAlign: "center", maxWidth: 110 }}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DetalleChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requerirPermisoModulo("A.1");
  const { id } = await params;

  const checklist = await prisma.checklist.findUnique({
    where: { id },
    include: {
      unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } },
      evidencia: { select: { url: true } },
      capturadoPor: { select: { nombre: true } },
    },
  });

  if (!checklist) notFound();

  const tipoLabel =
    checklist.tipo === "DIARIO"
      ? "Diario"
      : checklist.tipo === "SEMANAL"
        ? "Semanal"
        : checklist.tipo === "CARGA_COMBUSTIBLE"
          ? "Carga de Combustible"
          : "Reporte de Falla";

  const tipoBadgeColor =
    checklist.tipo === "DIARIO"
      ? { bg: "var(--status-cerrado-bg)", color: "var(--color-status-cerrado)" }
      : checklist.tipo === "SEMANAL"
        ? { bg: "var(--chip)", color: "var(--sidebar-text-active)" }
        : checklist.tipo === "CARGA_COMBUSTIBLE"
          ? { bg: "var(--status-revision-bg)", color: "var(--color-status-revision)" }
          : { bg: "var(--status-escena-bg, #fef2f2)", color: "var(--color-status-escena)" };

  const puntos = (checklist.puntosInspeccion ?? {}) as Record<string, string>;
  const respuestas = (checklist.respuestasSemanal ?? {}) as Record<string, string>;

  const metaItems = [
    { label: "Unidad", value: `${checklist.unidad.numeroEconomico} — ${checklist.unidad.marca} ${checklist.unidad.unidadModelo}` },
    { label: "Fecha y hora", value: fmtFecha(checklist.fecha) },
    ...(checklist.odometro != null ? [{ label: "Odómetro", value: `${checklist.odometro.toLocaleString("es-MX")} km` }] : []),
    ...(checklist.horometro != null ? [{ label: "Horómetro", value: `${checklist.horometro.toLocaleString("es-MX")} h` }] : []),
    { label: "Capturado por", value: checklist.capturadoPor?.nombre ?? "—" },
  ];

  return (
    <>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="checklist-wrap flex flex-col gap-5 p-4 md:p-6 max-w-3xl">
        {/* ── Cabecera ── */}
        <div className="flex flex-wrap items-start justify-between gap-3" data-no-print={undefined}>
          <div className="flex flex-col gap-1.5">
            <Link
              href={`/unidades/${checklist.numeroEconomico}`}
              data-no-print
              className="flex items-center gap-1 w-fit"
              style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}
            >
              <ChevronLeft size={14} />
              Volver a {checklist.numeroEconomico}
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
                Checklist {tipoLabel}
              </h1>
              <span
                className="rounded-full"
                style={{ background: tipoBadgeColor.bg, color: tipoBadgeColor.color, fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 700, padding: "3px 10px", letterSpacing: "0.04em" }}
              >
                {tipoLabel.toUpperCase()}
              </span>
            </div>
          </div>
          <PrintButton />
        </div>

        {/* ── Meta resumen ── */}
        <div
          className="print-card rounded-xl overflow-hidden"
          style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
        >
          <div className="grid divide-y sm:divide-y-0 sm:divide-x sm:grid-cols-3" style={{ gridTemplateColumns: `repeat(${Math.min(metaItems.length, 3)}, 1fr)` }}>
            {metaItems.map((item) => (
              <div key={item.label} className="flex flex-col gap-0.5 px-5 py-3">
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {item.label}
                </span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)", fontWeight: 500 }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Contenido por tipo ── */}
        {checklist.tipo === "DIARIO" && (
          <DetalleDiario
            puntos={puntos}
            evidenciaUrl={checklist.evidencia?.url}
            odometro={checklist.odometro}
            horometro={checklist.horometro}
            respuestasExtra={respuestas}
          />
        )}
        {checklist.tipo === "SEMANAL" && <DetalleSemanal respuestas={respuestas} />}
        {checklist.tipo === "CARGA_COMBUSTIBLE" && <DetalleCargaCombustible respuestas={respuestas} />}
        {checklist.tipo === "REPORTE_FALLA" && <DetalleReporteFalla respuestas={respuestas} />}
      </div>
    </>
  );
}
