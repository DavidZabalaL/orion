import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ChecklistForm } from "@/components/checklist/checklist-form";
import { ChecklistLista } from "@/components/checklist/checklist-lista";
import { ChecklistSemanalForm } from "@/components/checklist/checklist-semanal-form";
import { ChecklistSemanalLista } from "@/components/checklist/checklist-semanal-lista";
import { PUNTOS_INSPECCION } from "@/lib/checklist";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { inicioDeHoyMx as inicioDeHoy } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function TabLink({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-4 h-9 flex items-center font-semibold"
      style={{
        background: activo ? "var(--color-primary)" : "var(--panel-bg)",
        color: activo ? "#fff" : "var(--sidebar-text-active)",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-base)",
      }}
    >
      {children}
    </Link>
  );
}

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  await requerirPermisoModulo("A.1");
  const { tipo: tipoParam } = await searchParams;
  const tipo = tipoParam === "semanal" ? "semanal" : "diario";

  const proyectosPermitidos = await proyectosPermitidosParaModulo("A.1");
  const filtroProyecto = proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {};

  const unidades = await prisma.unidad.findMany({
    where: { estatus: "ACTIVO", ...filtroProyecto },
    select: { numeroEconomico: true, marca: true, unidadModelo: true, tipoVehiculo: true },
    orderBy: { numeroEconomico: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" style={{ maxWidth: tipo === "semanal" ? 960 : 768 }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Checklist
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            {tipo === "diario"
              ? "Inspección diaria con lectura de odómetro obligatoria — reemplaza el formulario de Fast Field."
              : "Inspección semanal completa: niveles, exterior, interior y herramientas."}
          </p>
        </div>
        {tipo === "diario" && (
          <Link href="/checklist/historial" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <CalendarDays size={16} /> Historial por fecha / exportar
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        <TabLink href="/checklist" activo={tipo === "diario"}>Diario</TabLink>
        <TabLink href="/checklist?tipo=semanal" activo={tipo === "semanal"}>Semanal</TabLink>
      </div>

      {tipo === "diario" ? (
        <DiarioSection unidades={unidades} filtroProyecto={filtroProyecto} proyectosPermitidos={proyectosPermitidos} />
      ) : (
        <SemanalSection unidades={unidades} filtroProyecto={filtroProyecto} proyectosPermitidos={proyectosPermitidos} />
      )}
    </div>
  );
}

async function DiarioSection({
  unidades,
  filtroProyecto,
  proyectosPermitidos,
}: {
  unidades: { numeroEconomico: string; marca: string; unidadModelo: string; tipoVehiculo: string }[];
  filtroProyecto: Record<string, unknown>;
  proyectosPermitidos: string[] | null;
}) {
  const inicioHoy = inicioDeHoy();
  const [checklistsHoy, sinCapturaHoy] = await Promise.all([
    prisma.checklist.findMany({
      where: { tipo: "DIARIO", fecha: { gte: inicioHoy }, ...(proyectosPermitidos !== null ? { unidad: filtroProyecto } : {}) },
      include: {
        unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } },
        evidencia: { select: { url: true } },
        capturadoPor: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
    }),
    prisma.unidad.findMany({
      where: { estatus: "ACTIVO", checklists: { none: { tipo: "DIARIO", fecha: { gte: inicioHoy } } }, ...filtroProyecto },
      select: { numeroEconomico: true },
    }),
  ]);

  const serializado = JSON.parse(JSON.stringify(checklistsHoy));

  return (
    <>
      {sinCapturaHoy.length > 0 && (
        <div className="rounded-md px-4 py-3" style={{ background: "var(--status-revision-bg)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--color-status-revision)" }}>
          {sinCapturaHoy.length} unidad(es) activa(s) sin checklist capturado hoy: {sinCapturaHoy.map((u) => u.numeroEconomico).join(", ")}
        </div>
      )}

      <ChecklistForm unidades={unidades} puntos={PUNTOS_INSPECCION} />

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Capturados hoy
        </h3>
        <ChecklistLista checklists={serializado} />
      </div>
    </>
  );
}

async function SemanalSection({
  unidades,
  filtroProyecto,
  proyectosPermitidos,
}: {
  unidades: { numeroEconomico: string; marca: string; unidadModelo: string; tipoVehiculo: string }[];
  filtroProyecto: Record<string, unknown>;
  proyectosPermitidos: string[] | null;
}) {
  const inicioHoy = inicioDeHoy();
  const [sedes, checklistsHoy] = await Promise.all([
    prisma.proyecto.findMany({
      where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}) },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.checklist.findMany({
      where: { tipo: "SEMANAL", fecha: { gte: inicioHoy }, ...(proyectosPermitidos !== null ? { unidad: filtroProyecto } : {}) },
      include: {
        unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } },
        capturadoPor: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
    }),
  ]);

  const serializado = JSON.parse(JSON.stringify(checklistsHoy));

  return (
    <>
      <ChecklistSemanalForm unidades={unidades} sedes={sedes} />

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Capturados hoy
        </h3>
        <ChecklistSemanalLista checklists={serializado} />
      </div>
    </>
  );
}
