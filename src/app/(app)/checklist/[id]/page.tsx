import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CheckCircle2, AlertTriangle, Camera } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { PUNTOS_INSPECCION } from "@/lib/checklist";
import { SECCIONES_CHECKLIST_SEMANAL } from "@/lib/checklist-semanal";
import { SECCIONES_CARGA_COMBUSTIBLE } from "@/lib/checklist-carga-combustible";
import { blobProxy as blobProxyLib } from "@/lib/blob";

export const dynamic = "force-dynamic";

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

const blobProxy = blobProxyLib;

function ColorChip({ value }: { value: string }) {
  const v = value?.toUpperCase() ?? "";
  let bg = "var(--chip)";
  let color = "var(--sidebar-text)";
  if (v === "BUEN ESTADO" || v === "MAXIMO" || v === "Y" || v === "OK") {
    bg = "var(--status-cerrado-bg)";
    color = "var(--color-status-cerrado)";
  } else if (v === "MAL ESTADO" || v === "MINIMO" || v === "N") {
    bg = "var(--status-escena-bg, #fef2f2)";
    color = "var(--color-status-escena)";
  } else if (v === "MEDIO") {
    bg = "var(--status-revision-bg)";
    color = "var(--color-status-revision)";
  } else if (v === "N/A" || v === "NA" || v === "NO APLICA") {
    bg = "var(--chip)";
    color = "var(--sidebar-text)";
  }
  return (
    <span
      className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: bg, color, fontFamily: "var(--font-ui)", letterSpacing: "0.02em" }}
    >
      {value}
    </span>
  );
}

function GaleriaFotos({ urls, titulo }: { urls: string[]; titulo?: string }) {
  const validas = urls.filter(Boolean);
  if (!validas.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {titulo && (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {titulo}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {validas.map((url, i) => (
          <a key={i} href={blobProxy(url)} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blobProxy(url)}
              alt={`foto ${i + 1}`}
              style={{ width: 120, height: 120, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--field-border)" }}
            />
          </a>
        ))}
      </div>
    </div>
  );
}

function SeccionCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--sidebar-text-active)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {titulo}
      </h2>
      {children}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Detalle Diario ───────────────────────────────────────────────────────────

function DetalleDiario({
  puntos,
  evidenciaUrl,
  odometro,
  horometro,
}: {
  puntos: Record<string, string>;
  evidenciaUrl?: string;
  odometro?: number | null;
  horometro?: number | null;
}) {
  const fotoHorometro = puntos["horometro_foto"];

  return (
    <>
      <SeccionCard titulo="Puntos de inspección">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PUNTOS_INSPECCION.map((p) => {
            const estado = puntos[p.key] ?? "—";
            const foto = puntos[`${p.key}_foto`];
            const ok = estado === "ok";
            return (
              <div
                key={p.key}
                className="flex flex-col rounded-lg overflow-hidden"
                style={{ background: ok ? "var(--status-cerrado-bg)" : "var(--status-revision-bg)" }}
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-2">
                    {ok ? (
                      <CheckCircle2 size={18} color="var(--color-status-cerrado)" />
                    ) : (
                      <AlertTriangle size={18} color="var(--color-status-revision)" />
                    )}
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: ok ? "var(--color-status-cerrado)" : "var(--color-status-revision)" }}>
                      {p.label}
                    </span>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold"
                    style={{ background: ok ? "var(--color-status-cerrado)" : "var(--color-status-revision)", color: "#fff", fontFamily: "var(--font-ui)" }}
                  >
                    {ok ? "OK" : "REVISAR"}
                  </span>
                </div>
                {foto && (
                  <div className="px-4 pb-3">
                    <a href={blobProxy(foto)} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={blobProxy(foto)}
                        alt={p.label}
                        style={{ width: "100%", maxWidth: 200, height: 120, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.2)" }}
                      />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SeccionCard>

      <SeccionCard titulo="Lecturas y evidencia">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {odometro != null && (
            <div className="flex flex-col gap-1">
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Odómetro</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{odometro.toLocaleString("es-MX")} km</span>
              {evidenciaUrl && (
                <a href={blobProxy(evidenciaUrl)} target="_blank" rel="noopener noreferrer" className="mt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={blobProxy(evidenciaUrl)} alt="Foto odómetro" style={{ width: "100%", maxWidth: 120, height: 90, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--field-border)" }} />
                </a>
              )}
            </div>
          )}
          {horometro != null && (
            <div className="flex flex-col gap-1">
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Horómetro</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{horometro.toLocaleString("es-MX")} h</span>
              {fotoHorometro && (
                <a href={blobProxy(fotoHorometro)} target="_blank" rel="noopener noreferrer" className="mt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={blobProxy(fotoHorometro)} alt="Foto horómetro" style={{ width: "100%", maxWidth: 120, height: 90, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--field-border)" }} />
                </a>
              )}
            </div>
          )}
        </div>
      </SeccionCard>
    </>
  );
}

// ─── Detalle Semanal ──────────────────────────────────────────────────────────

function DetalleSemanal({ respuestas }: { respuestas: Record<string, string> }) {
  const CLAVES_FOTO = new Set<string>();
  for (const sec of SECCIONES_CHECKLIST_SEMANAL) {
    for (const campo of sec.campos) {
      if (campo.tipo === "foto") CLAVES_FOTO.add(campo.key);
      if (campo.tipo === "radio" && "fotoKey" in campo && campo.fotoKey) CLAVES_FOTO.add(campo.fotoKey);
    }
  }
  CLAVES_FOTO.add("fotoLicenciaUrl");
  CLAVES_FOTO.add("gen_foto_odometro");
  CLAVES_FOTO.add("gen_foto_horometro");

  const generales = [
    { label: "Oficina / Sede", value: respuestas.oficinaSede },
    { label: "Modelo", value: respuestas.modelo },
    { label: "Tipo de vehículo", value: respuestas.tipoVehiculo },
    { label: "Licencia permanente", value: respuestas.licenciaPermanente },
    { label: "Odómetro", value: respuestas.gen_odometro ? `${respuestas.gen_odometro} km` : undefined },
    { label: "Horómetro", value: respuestas.gen_horometro ? `${respuestas.gen_horometro} h` : undefined },
  ].filter((c) => c.value);

  const fotosGenerales = [
    { url: respuestas.fotoLicenciaUrl, label: "Foto de licencia" },
    { url: respuestas.gen_foto_odometro, label: "Foto odómetro" },
    { url: respuestas.gen_foto_horometro, label: "Foto horómetro" },
  ].filter((f) => f.url);

  return (
    <>
      <SeccionCard titulo="Datos generales">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {generales.map((c) => (
            <Campo key={c.label} label={c.label}>
              {c.value}
            </Campo>
          ))}
        </div>
        {fotosGenerales.length > 0 && (
          <GaleriaFotos
            titulo="Documentos"
            urls={fotosGenerales.map((f) => f.url!)}
          />
        )}
      </SeccionCard>

      {SECCIONES_CHECKLIST_SEMANAL.map((seccion) => {
        const camposTexto: { label: string; value: string }[] = [];
        const fotos: string[] = [];

        for (const campo of seccion.campos) {
          const valor = respuestas[campo.key];
          if (!valor) continue;
          if (campo.tipo === "foto") {
            fotos.push(valor);
          } else {
            camposTexto.push({ label: campo.label, value: valor });
          }
          if (campo.tipo === "radio" && "fotoKey" in campo && campo.fotoKey) {
            const fotoValor = respuestas[campo.fotoKey];
            if (fotoValor) fotos.push(fotoValor);
          }
        }

        if (!camposTexto.length && !fotos.length) return null;

        return (
          <SeccionCard key={seccion.key} titulo={seccion.titulo}>
            {camposTexto.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {camposTexto.map((c) => (
                  <div key={c.label} className="flex items-center justify-between gap-3 rounded-lg px-4 py-2.5" style={{ background: "var(--field-bg)" }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                      {c.label}
                    </span>
                    <ColorChip value={c.value} />
                  </div>
                ))}
              </div>
            )}
            {fotos.length > 0 && <GaleriaFotos titulo="Fotografías" urls={fotos} />}
          </SeccionCard>
        );
      })}
    </>
  );
}

// ─── Detalle Carga de Combustible ─────────────────────────────────────────────

function DetalleCargaCombustible({ respuestas }: { respuestas: Record<string, string> }) {
  return (
    <>
      {SECCIONES_CARGA_COMBUSTIBLE.map((seccion) => {
        const camposTexto = seccion.campos
          .map((c) => ({ label: c.label, value: respuestas[c.key] }))
          .filter((c) => c.value);

        const fotos = seccion.fotos
          .map((f) => ({ label: f.label, url: respuestas[f.key] }))
          .filter((f) => f.url);

        const firma =
          "firma" in seccion && seccion.firma
            ? respuestas[seccion.firma.key]
            : undefined;

        if (!camposTexto.length && !fotos.length && !firma) return null;

        return (
          <SeccionCard key={seccion.key} titulo={seccion.titulo}>
            {camposTexto.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {camposTexto.map((c) => (
                  <Campo key={c.label} label={c.label}>
                    {c.value}
                  </Campo>
                ))}
              </div>
            )}
            {fotos.length > 0 && (
              <div className="flex flex-wrap gap-4">
                {fotos.map((f) => (
                  <div key={f.label} className="flex flex-col gap-1">
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                      {f.label}
                    </span>
                    <a href={blobProxy(f.url)} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={blobProxy(f.url)}
                        alt={f.label}
                        style={{ width: 140, height: 140, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--field-border)" }}
                      />
                    </a>
                  </div>
                ))}
              </div>
            )}
            {firma && (
              <div className="flex flex-col gap-2">
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Firma del responsable
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={firma}
                  alt="Firma"
                  style={{ maxWidth: 300, height: 100, objectFit: "contain", background: "#fff", border: "1px solid var(--field-border)", borderRadius: "var(--radius-md)", padding: 8 }}
                />
              </div>
            )}
          </SeccionCard>
        );
      })}
    </>
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
        : "Carga de Combustible";

  const puntos = (checklist.puntosInspeccion ?? {}) as Record<string, string>;
  const respuestas = (checklist.respuestasSemanal ?? {}) as Record<string, string>;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link
          href={`/unidades/${checklist.numeroEconomico}`}
          className="flex items-center gap-1 w-fit"
          style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}
        >
          <ChevronLeft size={15} /> Volver a ficha de {checklist.numeroEconomico}
        </Link>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Checklist {tipoLabel}
          </h1>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: checklist.tipo === "DIARIO" ? "var(--status-cerrado-bg)" : checklist.tipo === "SEMANAL" ? "var(--chip)" : "var(--status-revision-bg)",
              color: checklist.tipo === "DIARIO" ? "var(--color-status-cerrado)" : checklist.tipo === "SEMANAL" ? "var(--sidebar-text-active)" : "var(--color-status-revision)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {tipoLabel.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <Campo label="Unidad">
          <Link href={`/unidades/${checklist.unidad.numeroEconomico}`} style={{ color: "var(--color-primary)" }}>
            {checklist.unidad.numeroEconomico}
          </Link>
          <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
            {checklist.unidad.marca} {checklist.unidad.unidadModelo}
          </span>
        </Campo>
        <Campo label="Fecha y hora">{fmtFecha(checklist.fecha)}</Campo>
        {checklist.odometro != null && (
          <Campo label="Odómetro">{checklist.odometro.toLocaleString("es-MX")} km</Campo>
        )}
        {checklist.horometro != null && (
          <Campo label="Horómetro">{checklist.horometro.toLocaleString("es-MX")} h</Campo>
        )}
        <Campo label="Capturado por">{checklist.capturadoPor?.nombre ?? "—"}</Campo>
      </div>

      {/* Detalle por tipo */}
      {checklist.tipo === "DIARIO" && (
        <DetalleDiario puntos={puntos} evidenciaUrl={checklist.evidencia?.url} odometro={checklist.odometro} horometro={checklist.horometro} />
      )}
      {checklist.tipo === "SEMANAL" && <DetalleSemanal respuestas={respuestas} />}
      {checklist.tipo === "CARGA_COMBUSTIBLE" && (
        <DetalleCargaCombustible respuestas={respuestas} />
      )}
    </div>
  );
}
