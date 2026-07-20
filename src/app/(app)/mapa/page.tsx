import Link from "next/link";
import { MapPin, Satellite, History, Radio } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtFechaHora } from "@/lib/formato";
import { PosicionForm } from "@/components/mapa/posicion-form";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const unidadesActivas = await prisma.unidad.findMany({
    where: { estatus: "ACTIVO" },
    select: {
      numeroEconomico: true,
      estadoOperacion: true,
      posicionesGps: { orderBy: { timestamp: "desc" }, take: 1 },
    },
    orderBy: { numeroEconomico: "asc" },
  });

  const conSenal = unidadesActivas.filter((u) => u.posicionesGps.length > 0);
  const sinSenal = unidadesActivas.filter((u) => u.posicionesGps.length === 0);
  const conAnomalia = conSenal.filter((u) => u.posicionesGps[0].esAnomalo);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Geolocalización
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Última posición conocida por unidad. El mapa en tiempo real se activa al conectar IntelliHub (Fase 2).
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/mapa/historial" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <History size={16} /> Historial de recorrido
          </Link>
          <Link href="/mapa/integridad" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <Satellite size={16} /> Integridad de datos (G.1)
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Unidades activas" value={unidadesActivas.length} icon={MapPin} accent="var(--color-primary)" />
        <StatCard label="Con señal reciente" value={conSenal.length} icon={Radio} accent="var(--color-status-cerrado)" />
        <StatCard label="Sin señal registrada" value={sinSenal.length} icon={Radio} accent="var(--color-status-revision)" />
        <StatCard label="Con anomalía en último punto" value={conAnomalia.length} icon={Satellite} accent="var(--color-status-escena)" />
      </div>

      <PosicionForm unidades={unidadesActivas.map((u) => ({ numeroEconomico: u.numeroEconomico }))} />

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Última posición conocida
        </h3>
        {unidadesActivas.length === 0 ? (
          <EmptyState>Sin unidades activas.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                  {["Unidad", "Estado", "Última actualización", "Lat", "Lng", "Velocidad", "Estatus GPS"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unidadesActivas.map((u) => {
                  const p = u.posicionesGps[0];
                  return (
                    <tr key={u.numeroEconomico} style={{ borderBottom: "1px solid var(--field-border)" }}>
                      <td className="px-4 py-3">
                        <Link href={`/unidades/${u.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                          {u.numeroEconomico}
                        </Link>
                      </td>
                      <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.estadoOperacion}</td>
                      <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{p ? fmtFechaHora(p.timestamp) : "—"}</td>
                      <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{p ? Number(p.lat).toFixed(4) : "—"}</td>
                      <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{p ? Number(p.lng).toFixed(4) : "—"}</td>
                      <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{p?.velocidad ? `${p.velocidad} km/h` : "—"}</td>
                      <td className="px-4 py-3">
                        {!p ? (
                          <Badge label="Sin datos" color="var(--sidebar-text)" bg="var(--chip)" />
                        ) : p.esAnomalo ? (
                          <Badge label={p.motivoAnomalia ?? "Anómalo"} color="var(--color-status-escena)" bg="var(--status-escena-bg)" />
                        ) : (
                          <Badge label="Válido" color="var(--color-status-cerrado)" bg="var(--status-cerrado-bg)" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
