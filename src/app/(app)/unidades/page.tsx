import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { UnidadesTable, type UnidadRow } from "@/components/unidades/unidades-table";
import { Car, CheckCircle2, Ban, ArrowLeftRight, LayoutGrid } from "lucide-react";
import { requerirPermisoModulo, esRolGlobal } from "@/lib/permisos";
import { proyectosPermitidosParaModulo, unidadRestringidaParaOperador } from "@/lib/proyectos-usuario";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import { CATALOGO_WIDGETS_UNIDADES, WIDGETS_DEFAULT_UNIDADES, valorWidgetUnidades, type WidgetConfigItem } from "@/lib/widgets";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CATEGORIAS_MANTENIMIENTO = ["MANTENIMIENTO_PREVENTIVO", "MANTENIMIENTO_CORRECTIVO"] as const;

export default async function UnidadesPage() {
  await requerirPermisoModulo("A");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("A");
  const restriccionOperador = await unidadRestringidaParaOperador();
  const filtroOperador = restriccionOperador.esOperador ? { numeroEconomico: restriccionOperador.numeroEconomico ?? "__ninguna__" } : {};

  const [unidades, ultimosMantenimientos, proximosMantenimientos] = await Promise.all([
    prisma.unidad.findMany({
      where: { ...(proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {}), ...filtroOperador },
      include: {
        proyecto: { select: { nombre: true, estadoRepublica: true } },
        resguardante: { select: { nombre: true } },
      },
      orderBy: { numeroEconomico: "asc" },
    }),
    prisma.gastoVehicular.groupBy({
      by: ["numeroEconomico"],
      where: { categoria: { in: [...CATEGORIAS_MANTENIMIENTO] }, estatus: { in: ["REALIZADO", "PAGADO"] } },
      _max: { fecha: true },
    }),
    prisma.gastoVehicular.groupBy({
      by: ["numeroEconomico"],
      where: { categoria: { in: [...CATEGORIAS_MANTENIMIENTO] }, estatus: "PROGRAMADO" },
      _min: { fecha: true },
    }),
  ]);

  const ultimoPorEconomico = new Map(ultimosMantenimientos.map((m) => [m.numeroEconomico, m._max.fecha]));
  const proximoPorEconomico = new Map(proximosMantenimientos.map((m) => [m.numeroEconomico, m._min.fecha]));

  const rows: UnidadRow[] = unidades.map((u) => ({
    numeroEconomico: u.numeroEconomico,
    placas: u.placas,
    tipoVehiculo: u.tipoVehiculo,
    marca: u.marca,
    unidadModelo: u.unidadModelo,
    proyecto: u.proyecto?.nombre ?? null,
    estatus: u.estatus,
    disponibilidad: u.disponibilidad,
    diasSinOperar: u.diasSinOperar,
    resguardante: u.resguardante?.nombre ?? null,
    ultimoMantenimiento: ultimoPorEconomico.get(u.numeroEconomico)?.toISOString() ?? null,
    proximoMantenimiento: proximoPorEconomico.get(u.numeroEconomico)?.toISOString() ?? null,
  }));

  const total = rows.length;
  const activas = rows.filter((r) => r.estatus === "ACTIVO").length;
  const disponibles = rows.filter((r) => r.disponibilidad).length;
  const enTransito = rows.filter((r) => r.estatus === "CONSIGNACION" || r.estatus === "DIRECCION").length;
  const bajas = rows.filter((r) => r.estatus === "BAJA").length;

  const proyectosOptions = Array.from(new Set(rows.map((r) => r.proyecto).filter(Boolean))) as string[];

  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);
  const [gastoHoyAgg, configWidgets, puedeConfigurar] = await Promise.all([
    prisma.gastoVehicular.aggregate({
      where: { fecha: { gte: hoyInicio }, ...(proyectosPermitidos !== null ? { unidad: { proyectoId: { in: proyectosPermitidos } } } : {}) },
      _sum: { costo: true },
    }),
    prisma.configuracionWidgets.findUnique({ where: { moduloId: "A" } }),
    esRolGlobal(),
  ]);

  const porTipoMap = new Map<string, number>();
  const porProyectoMap = new Map<string, number>();
  for (const r of rows) {
    const tipoLabel = TIPO_VEHICULO_LABEL[r.tipoVehiculo] ?? r.tipoVehiculo;
    porTipoMap.set(tipoLabel, (porTipoMap.get(tipoLabel) ?? 0) + 1);
    const proyectoLabel = r.proyecto ?? "Sin proyecto";
    porProyectoMap.set(proyectoLabel, (porProyectoMap.get(proyectoLabel) ?? 0) + 1);
  }

  const datosWidgets = {
    total,
    activas,
    disponibles,
    bajas,
    consignacionODireccion: enTransito,
    gastoHoy: Number(gastoHoyAgg._sum.costo ?? 0),
    porTipo: Array.from(porTipoMap, ([label, value]) => ({ label, value })),
    porProyecto: Array.from(porProyectoMap, ([label, value]) => ({ label, value })),
  };

  const widgetsGuardados = configWidgets?.widgets as WidgetConfigItem[] | undefined;
  const widgetsActivos: WidgetConfigItem[] = CATALOGO_WIDGETS_UNIDADES
    .map((w) => {
      const guardado = widgetsGuardados?.find((g) => g.id === w.id);
      return { id: w.id, label: guardado?.label ?? w.labelDefault, activo: guardado ? guardado.activo : WIDGETS_DEFAULT_UNIDADES.includes(w.id) };
    })
    .filter((w) => w.activo);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Inventario de Unidades
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Ficha única por número económico con vista consolidada de flota.
          </p>
        </div>
        {puedeConfigurar && (
          <Link href="/usuarios/widgets" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <LayoutGrid size={16} /> Configurar widgets
          </Link>
        )}
      </div>

      {widgetsActivos.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {widgetsActivos.map((w) => {
            const valor = valorWidgetUnidades(w.id, datosWidgets);
            if (Array.isArray(valor)) {
              return (
                <div key={w.id} className="rounded-xl p-4 col-span-2" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
                  <div className="mb-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>{w.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {valor.map((v) => (
                      <span key={v.label} className="rounded-full px-3 py-1" style={{ background: "var(--chip)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                        {v.label}: <strong>{v.value}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              );
            }
            return <StatCard key={w.id} label={w.label} value={w.id === "gastoHoy" ? `$${valor.toLocaleString("es-MX")}` : valor} icon={w.id === "bajas" ? Ban : w.id === "consignacionODireccion" ? ArrowLeftRight : w.id === "activas" || w.id === "disponibles" ? CheckCircle2 : Car} accent="var(--color-primary)" />;
          })}
        </div>
      )}

      <UnidadesTable rows={rows} proyectos={proyectosOptions} />
    </div>
  );
}
