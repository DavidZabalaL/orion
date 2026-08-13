import { AlertOctagon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { SiniestrosTabla } from "@/components/siniestros/siniestros-tabla";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<string, string> = {
  COLISION: "Colisión",
  ROBO_TOTAL: "Robo total",
  ROBO_PARCIAL: "Robo parcial",
  VANDALISMO: "Vandalismo",
  INCENDIO: "Incendio",
  FENOMENO_NATURAL: "Fenómeno natural",
  OTRO: "Otro",
};

export default async function SiniestrosPage() {
  await requerirPermisoModulo("S");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("S");

  const [siniestros, unidades, operadores] = await Promise.all([
    prisma.siniestro.findMany({
      where: proyectosPermitidos !== null
        ? { unidad: { proyectoId: { in: proyectosPermitidos } } }
        : {},
      include: {
        unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true, proyectoId: true, proyecto: { select: { nombre: true } } } },
        operador: { select: { id: true, nombre: true } },
        reportadoPor: { select: { nombre: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.unidad.findMany({
      where: {
        estatus: "ACTIVO",
        ...(proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {}),
      },
      select: { numeroEconomico: true, marca: true, unidadModelo: true },
      orderBy: { numeroEconomico: "asc" },
    }),
    prisma.operador.findMany({
      where: { estatus: "ACTIVO" },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const abiertos = siniestros.filter((s) => s.estatus === "ABIERTO" || s.estatus === "EN_PROCESO").length;
  const cerrados = siniestros.filter((s) => s.estatus === "CERRADO" || s.estatus === "CERRADO_SIN_INDEMNIZACION").length;

  const rows = JSON.parse(JSON.stringify(siniestros));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            <AlertOctagon size={24} />
            Siniestros
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Registro y seguimiento de siniestros vehiculares.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl px-5 py-3 text-center" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>{siniestros.length}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>Total</div>
          </div>
          {abiertos > 0 && (
            <div className="rounded-xl px-5 py-3 text-center" style={{ background: "#fff7ed", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "#f97316" }}>{abiertos}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "#f97316" }}>En proceso</div>
            </div>
          )}
          <div className="rounded-xl px-5 py-3 text-center" style={{ background: "#f0fdf4", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "#22c55e" }}>{cerrados}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "#22c55e" }}>Cerrados</div>
          </div>
        </div>
      </div>

      <SiniestrosTabla
        siniestros={rows}
        unidades={unidades}
        operadores={operadores}
        tipoLabel={TIPO_LABEL}
      />
    </div>
  );
}
