import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { listarReportesProgramados } from "./actions";
import { PanelReportesLista } from "@/components/reportes/panel-reportes-lista";

export const dynamic = "force-dynamic";

export default async function ReportesProgramadosPage() {
  await requerirPermisoModulo("M");

  const proyectosPermitidos = await proyectosPermitidosParaModulo("M");
  const [reportes, proyectosDisponibles] = await Promise.all([
    listarReportesProgramados(),
    prisma.proyecto.findMany({
      where: proyectosPermitidos === null ? undefined : { id: { in: proyectosPermitidos } },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" style={{ maxWidth: 1100 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Panel de Reportes
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Arma reportes a la medida (cualquier dato del Explorador BI), elige a quién se los mandas y con qué frecuencia. Ve aquí mismo todos los que ya están configurados — incluido Estatus de flota — y actívalos o desactívalos.
        </p>
      </div>

      <PanelReportesLista reportes={reportes} proyectosDisponibles={proyectosDisponibles} />
    </div>
  );
}
