import Link from "next/link";
import { ChevronLeft, ShieldAlert, Radio, Waves, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { AnomaliasLista, HuecosLista } from "@/components/mapa/integridad-lista";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export const dynamic = "force-dynamic";

export default async function IntegridadGpsPage() {
  await requerirPermisoModulo("G.1");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("G.1");
  const filtroUnidad = proyectosPermitidos !== null ? { unidad: { proyectoId: { in: proyectosPermitidos } } } : {};

  const [anomalos, huecos, totalPuntos] = await Promise.all([
    prisma.posicionGPS.findMany({
      where: { esAnomalo: true, ...filtroUnidad },
      orderBy: { timestamp: "desc" },
      take: 30,
      include: { unidad: { select: { numeroEconomico: true } } },
    }),
    prisma.huecoSenalGPS.findMany({
      where: filtroUnidad,
      orderBy: { timestampInicio: "desc" },
      take: 30,
      include: { unidad: { select: { numeroEconomico: true } } },
    }),
    prisma.posicionGPS.count({ where: filtroUnidad }),
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
        <AnomaliasLista
          anomalos={anomalos.map((p) => ({
            id: p.id,
            timestamp: p.timestamp.toISOString(),
            numeroEconomico: p.unidad.numeroEconomico,
            motivoAnomalia: p.motivoAnomalia,
            lat: Number(p.lat),
            lng: Number(p.lng),
          }))}
        />
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Huecos de señal registrados
        </h3>
        <HuecosLista
          huecos={huecos.map((h) => ({
            id: h.id,
            numeroEconomico: h.unidad.numeroEconomico,
            timestampInicio: h.timestampInicio.toISOString(),
            timestampFin: h.timestampFin ? h.timestampFin.toISOString() : null,
            duracionMinutos: h.duracionMinutos,
            patronRecurrente: h.patronRecurrente,
          }))}
        />
      </div>
    </div>
  );
}
