import { prisma } from "@/lib/prisma";
import { type UnidadRow } from "@/components/unidades/unidades-table";
import { InventarioUnidades } from "@/components/unidades/inventario-unidades";
import { LayoutGrid } from "lucide-react";
import { requerirPermisoModulo, esRolGlobal, puedeVerSlaDisponibilidad } from "@/lib/permisos";
import { proyectosPermitidosParaModulo, unidadRestringidaParaOperador } from "@/lib/proyectos-usuario";
import { CATALOGO_WIDGETS_UNIDADES, WIDGETS_DEFAULT_UNIDADES, generarLayoutsPorDefecto, esLayoutValido, type WidgetConfigItem, type WidgetActivo } from "@/lib/widgets";
import Link from "next/link";
import { inicioDeHoyMx } from "@/lib/timezone";
import { calcularDiasSinOperar } from "@/lib/actividad-unidad";
import { calcularSlaPorUnidades } from "@/lib/sla-disponibilidad";
import { preferenciaOcultaPorUsuario, CLAVE_OCULTAR_SLA_DISPONIBILIDAD } from "@/lib/preferencias-usuario";

export const dynamic = "force-dynamic";

const CATEGORIAS_MANTENIMIENTO = ["MANTENIMIENTO_PREVENTIVO", "MANTENIMIENTO_CORRECTIVO"] as const;

export default async function UnidadesPage() {
  await requerirPermisoModulo("A");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("A");
  const restriccionOperador = await unidadRestringidaParaOperador();
  const filtroOperador = restriccionOperador.esOperador ? { numeroEconomico: { in: restriccionOperador.numerosEconomicos } } : {};

  const treintaDias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [unidades, ultimosMantenimientos, proximosMantenimientos, ultimosCombustibles, ultimosTags, ultimosGps, segurosProximos] = await Promise.all([
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
    prisma.combustible.groupBy({ by: ["numeroEconomico"], _max: { fecha: true } }),
    prisma.tag.groupBy({ by: ["numeroEconomico"], where: { numeroEconomico: { not: null } }, _max: { fecha: true } }),
    prisma.posicionGPS.groupBy({ by: ["numeroEconomico"], _max: { timestamp: true } }),
    prisma.seguro.groupBy({
      by: ["numeroEconomico"],
      where: {
        fechaVencimiento: { lte: treintaDias, gte: new Date() },
        estatus: "VIGENTE",
        ...(proyectosPermitidos !== null ? { unidad: { proyectoId: { in: proyectosPermitidos } } } : {}),
      },
      _count: { id: true },
    }),
  ]);

  const ultimoPorEconomico = new Map(ultimosMantenimientos.map((m) => [m.numeroEconomico, m._max.fecha]));
  const proximoPorEconomico = new Map(proximosMantenimientos.map((m) => [m.numeroEconomico, m._min.fecha]));
  const ultimoCombustiblePorEconomico = new Map(ultimosCombustibles.map((m) => [m.numeroEconomico, m._max.fecha]));
  const ultimoTagPorEconomico = new Map(ultimosTags.map((m) => [m.numeroEconomico as string, m._max.fecha]));
  const ultimoGpsPorEconomico = new Map(ultimosGps.map((m) => [m.numeroEconomico, m._max.timestamp]));
  const conSeguroProximo = new Set(segurosProximos.map((s) => s.numeroEconomico));

  const rows: UnidadRow[] = unidades.map((u) => {
    const { diasSinOperar, origen, fuente } = calcularDiasSinOperar(
      u.disponibilidad,
      u.fechaCambioDisponibilidad,
      ultimoCombustiblePorEconomico.get(u.numeroEconomico),
      ultimoTagPorEconomico.get(u.numeroEconomico),
      ultimoGpsPorEconomico.get(u.numeroEconomico)
    );
    const semaforo: "verde" | "amarillo" | "rojo" = (() => {
      if (u.estatus !== "ACTIVO") return "rojo";
      if (!u.disponibilidad || diasSinOperar > 5 || conSeguroProximo.has(u.numeroEconomico)) return "amarillo";
      return "verde";
    })();
    return {
      numeroEconomico: u.numeroEconomico,
      placas: u.placas,
      tipoVehiculo: u.tipoVehiculo,
      marca: u.marca,
      unidadModelo: u.unidadModelo,
      proyecto: u.proyecto?.nombre ?? null,
      estatus: u.estatus,
      disponibilidad: u.disponibilidad,
      diasSinOperar,
      origenDiasSinOperar: origen,
      fuenteActividad: fuente,
      resguardante: u.resguardante?.nombre ?? null,
      ultimoMantenimiento: ultimoPorEconomico.get(u.numeroEconomico)?.toISOString() ?? null,
      proximoMantenimiento: proximoPorEconomico.get(u.numeroEconomico)?.toISOString() ?? null,
      semaforo,
      slaPorcentaje: null,
    };
  });

  const hoyInicio = inicioDeHoyMx();
  const [gastoHoyAgg, configWidgets, puedeConfigurar, puedeVerSla, slaOculto] = await Promise.all([
    prisma.gastoVehicular.aggregate({
      where: { fecha: { gte: hoyInicio }, ...(proyectosPermitidos !== null ? { unidad: { proyectoId: { in: proyectosPermitidos } } } : {}) },
      _sum: { costo: true },
    }),
    prisma.configuracionWidgets.findUnique({ where: { moduloId: "A" } }),
    esRolGlobal(),
    puedeVerSlaDisponibilidad(),
    preferenciaOcultaPorUsuario(CLAVE_OCULTAR_SLA_DISPONIBILIDAD),
  ]);

  const gastoHoy = Number(gastoHoyAgg._sum.costo ?? 0);

  // El SLA solo se calcula si el rol tiene el permiso especial — evita el
  // query extra para quien nunca lo va a ver (Operador por defecto, etc.).
  if (puedeVerSla) {
    const slaPorUnidad = await calcularSlaPorUnidades(unidades.map((u) => u.numeroEconomico));
    for (const row of rows) {
      row.slaPorcentaje = slaPorUnidad.get(row.numeroEconomico)?.porcentaje ?? null;
    }
  }

  const widgetsGuardados = configWidgets?.widgets as WidgetConfigItem[] | undefined;
  const layoutsPorDefecto = generarLayoutsPorDefecto(CATALOGO_WIDGETS_UNIDADES);
  const widgetsActivos: WidgetActivo[] = CATALOGO_WIDGETS_UNIDADES
    .map((w) => {
      const guardado = widgetsGuardados?.find((g) => g.id === w.id);
      return {
        id: w.id,
        label: w.labelDefault,
        tipo: w.tipo,
        activo: guardado ? guardado.activo : WIDGETS_DEFAULT_UNIDADES.includes(w.id),
        layout: esLayoutValido(guardado?.layout) ? guardado.layout : layoutsPorDefecto[w.id],
      };
    })
    // El widget de SLA por proyecto respeta el mismo permiso especial que la
    // columna, además del on/off global de Configurar widgets.
    .filter((w) => w.activo && (w.id !== "slaPorProyecto" || puedeVerSla));

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

      <InventarioUnidades rows={rows} widgetsActivos={widgetsActivos} gastoHoy={gastoHoy} puedeVerSla={puedeVerSla} slaOcultoInicial={slaOculto} />
    </div>
  );
}
