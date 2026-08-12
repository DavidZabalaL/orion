import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, MapPin, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { Badge } from "@/components/ui/badge";
import { TicketAccionesFull } from "@/components/rescate/ticket-acciones-full";

export const dynamic = "force-dynamic";

const ESTATUS_LABEL: Record<string, string> = {
  ABIERTO: "Abierto", ASIGNADO: "Asignado", EN_ATENCION: "En atención",
  EN_TRANSITO: "En tránsito", RESUELTO: "Resuelto", CERRADO: "Cerrado", CANCELADO: "Cancelado",
};

const ESTATUS_STYLE: Record<string, { color: string; bg: string }> = {
  ABIERTO:     { color: "#f97316", bg: "#fff7ed" },
  ASIGNADO:    { color: "#3b82f6", bg: "#eff6ff" },
  EN_ATENCION: { color: "#8b5cf6", bg: "#f5f3ff" },
  EN_TRANSITO: { color: "#06b6d4", bg: "#ecfeff" },
  RESUELTO:    { color: "#22c55e", bg: "#f0fdf4" },
  CERRADO:     { color: "#6b7280", bg: "#f3f4f6" },
  CANCELADO:   { color: "#ef4444", bg: "#fef2f2" },
};

const PRIORIDAD_COLOR: Record<string, string> = {
  BAJA: "#22c55e", MEDIA: "#f59e0b", ALTA: "#f97316", URGENTE: "#ef4444",
};

export default async function DetalleTicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requerirPermisoModulo("R");
  const { id } = await params;

  const ticket = await prisma.ticketRescate.findUnique({
    where: { id },
    include: {
      motivo: { select: { nombre: true, categoria: true } },
      reportadoPor: { select: { id: true, nombre: true } },
      asignadoA: { select: { nombre: true } },
      proyecto: { select: { nombre: true } },
      historico: {
        include: { usuario: { select: { nombre: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) notFound();

  const usuarios = await prisma.usuario.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      <div>
        <Link href="/rescate" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a lista
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            {ticket.folio}
          </h1>
          <Badge label={ESTATUS_LABEL[ticket.estatus]} color={ESTATUS_STYLE[ticket.estatus]?.color} bg={ESTATUS_STYLE[ticket.estatus]?.bg} />
          <span className="rounded-full px-3 py-1 text-white text-xs font-bold" style={{ background: PRIORIDAD_COLOR[ticket.prioridad] ?? "#6b7280" }}>
            {ticket.prioridad}
          </span>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Unidad</div>
            <Link href={`/unidades/${ticket.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--color-primary)" }}>
              {ticket.numeroEconomico}
            </Link>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Motivo</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)", fontWeight: 600 }}>{ticket.motivo.nombre}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{ticket.motivo.categoria}</div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Proyecto</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{ticket.proyecto?.nombre ?? "—"}</div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Reportado por</div>
            <div className="flex items-center gap-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
              <User size={13} /> {ticket.reportadoPor.nombre}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Asignado a</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{ticket.asignadoA?.nombre ?? "Sin asignar"}</div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Creado</div>
            <div className="flex items-center gap-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
              <Clock size={12} /> {new Date(ticket.createdAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          </div>
          {ticket.ubicacion && (
            <div className="col-span-2 md:col-span-3">
              <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Ubicación</div>
              <div className="flex items-center gap-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
                <MapPin size={13} /> {ticket.ubicacion}
              </div>
            </div>
          )}
          {ticket.descripcion && (
            <div className="col-span-2 md:col-span-3">
              <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Descripción</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{ticket.descripcion}</div>
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      <TicketAccionesFull
        ticketId={ticket.id}
        estatus={ticket.estatus}
        reportadoPorId={ticket.reportadoPor.id}
        motivoCategoria={ticket.motivo.categoria}
        usuarios={usuarios}
      />

      {/* Timeline */}
      <div>
        <h2 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Timeline
        </h2>
        <div className="flex flex-col gap-0">
          {ticket.historico.map((h, idx) => (
            <div key={h.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ background: ESTATUS_STYLE[h.estatus]?.color ?? "#6b7280" }} />
                {idx < ticket.historico.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "var(--field-border)" }} />}
              </div>
              <div className="pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: ESTATUS_STYLE[h.estatus]?.color ?? "var(--field-text)" }}>
                    {ESTATUS_LABEL[h.estatus] ?? h.estatus}
                  </span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                    por {h.usuario.nombre} · {new Date(h.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                {h.comentario && (
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)", marginTop: 2 }}>
                    {h.comentario}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
