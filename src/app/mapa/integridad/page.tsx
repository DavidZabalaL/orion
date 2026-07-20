import Link from "next/link";
import { ChevronLeft, ShieldAlert, Radio, Waves, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { Table, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function IntegridadGpsPage() {
  const [anomalos, huecos, totalPuntos] = await Promise.all([
    prisma.posicionGPS.findMany({
      where: { esAnomalo: true },
      orderBy: { timestamp: "desc" },
      take: 30,
      include: { unidad: { select: { numeroEconomico: true } } },
    }),
    prisma.huecoSenalGPS.findMany({
      orderBy: { timestampInicio: "desc" },
      take: 30,
      include: { unidad: { select: { numeroEconomico: true } } },
    }),
    prisma.posicionGPS.count(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/mapa" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver al mapa
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Integridad de datos GPS (G.1)
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Filtro de lecturas imposibles, detección de GPS apagado y respaldo de kilometraje independiente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Lecturas procesadas" value={totalPuntos} icon={Radio} accent="var(--color-primary)" />
        <StatCard label="Puntos anómalos (Capa 1)" value={anomalos.length} icon={ShieldAlert} accent="var(--color-status-escena)" />
        <StatCard label="Huecos de señal (Capa 2)" value={huecos.length} icon={Waves} accent="var(--color-status-revision)" />
        <StatCard label="Patrones recurrentes" value={huecos.filter((h) => h.patronRecurrente).length} icon={TriangleAlert} accent="var(--color-status-revision)" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <h4 className="mb-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>Capa 1 — Datos imposibles</h4>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Velocidad implícita &gt; 180 km/h, fuera de México o salto de distancia sin puntos intermedios. Se excluyen de km_validado.</p>
        </div>
        <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <h4 className="mb-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>Capa 2 — Señal perdida</h4>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Más de 15 minutos sin transmitir genera un hueco registrado con última posición y distancia del salto al reconectar.</p>
        </div>
        <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <h4 className="mb-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>Capa 3 — Respaldo independiente</h4>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Odómetro de checklist y combustible triangulan contra el GPS validado; discrepancia &gt; ±5% genera alerta.</p>
        </div>
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Puntos anómalos recientes
        </h3>
        {anomalos.length === 0 ? (
          <EmptyState>Sin puntos anómalos detectados.</EmptyState>
        ) : (
          <Table headers={["Fecha / hora", "Unidad", "Motivo", "Lat", "Lng"]} minWidth={640}>
            {anomalos.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(p.timestamp)}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{p.unidad.numeroEconomico}</td>
                <td className="px-4 py-3"><Badge label={p.motivoAnomalia ?? "—"} color="var(--color-status-escena)" bg="var(--status-escena-bg)" /></td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{Number(p.lat).toFixed(4)}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{Number(p.lng).toFixed(4)}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Huecos de señal registrados
        </h3>
        {huecos.length === 0 ? (
          <EmptyState>Sin huecos de señal registrados.</EmptyState>
        ) : (
          <Table headers={["Unidad", "Inicio", "Fin", "Duración", "Patrón recurrente"]} minWidth={640}>
            {huecos.map((h) => (
              <tr key={h.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{h.unidad.numeroEconomico}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFechaHora(h.timestampInicio)}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{h.timestampFin ? fmtFechaHora(h.timestampFin) : "En curso"}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{h.duracionMinutos ? `${h.duracionMinutos} min` : "—"}</td>
                <td className="px-4 py-3">{h.patronRecurrente ? <Badge label="Sí" color="var(--color-status-revision)" bg="var(--status-revision-bg)" /> : "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
