import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { gastoPorUnidad, rendimientoReal } from "@/lib/gasto-unidad";
import { inicioDeAnioMx } from "@/lib/timezone";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import { ComparativoTabla, type FilaComparativo } from "@/components/unidades/comparativo-tabla";

export const dynamic = "force-dynamic";

type Criterio = "modelo" | "marca" | "tipo";

const CRITERIO_LABEL: Record<Criterio, string> = {
  modelo: "Mismo modelo",
  marca: "Misma marca",
  tipo: "Mismo tipo de unidad",
};

/**
 * Comparativo de gasto y rendimiento entre una unidad y las de su mismo
 * modelo / marca / tipo (ej. todas las F-150) — se abre desde la ficha de la
 * unidad. Respeta el alcance de proyectos del rol (módulo A).
 */
export default async function ComparativoUnidadesPage({ searchParams }: { searchParams: Promise<{ base?: string; criterio?: string; periodo?: string }> }) {
  await requerirPermisoModulo("A");
  const params = await searchParams;
  const criterio: Criterio = params.criterio === "marca" || params.criterio === "tipo" ? params.criterio : "modelo";
  const periodo = params.periodo === "historico" ? "historico" : "anio";
  const permitidos = await proyectosPermitidosParaModulo("A");
  const alcance = permitidos !== null ? { proyectoId: { in: permitidos } } : {};

  const base = params.base
    ? await prisma.unidad.findFirst({ where: { numeroEconomico: params.base, ...alcance }, select: { numeroEconomico: true, marca: true, unidadModelo: true, tipoVehiculo: true } })
    : null;
  if (!base) notFound();

  const filtroGrupo =
    criterio === "modelo"
      ? { marca: { equals: base.marca, mode: "insensitive" as const }, unidadModelo: { equals: base.unidadModelo, mode: "insensitive" as const } }
      : criterio === "marca"
        ? { marca: { equals: base.marca, mode: "insensitive" as const } }
        : { tipoVehiculo: base.tipoVehiculo };

  const unidades = await prisma.unidad.findMany({
    where: { estatus: { not: "BAJA" }, ...alcance, ...filtroGrupo },
    select: { numeroEconomico: true, marca: true, unidadModelo: true, rendimientoPromedio: true, proyecto: { select: { nombre: true } } },
    orderBy: { numeroEconomico: "asc" },
  });
  const gastos = await gastoPorUnidad(
    unidades.map((u) => u.numeroEconomico),
    periodo === "anio" ? inicioDeAnioMx() : null
  );

  const filas: FilaComparativo[] = unidades.map((u) => {
    const g = gastos.get(u.numeroEconomico)!;
    const real = rendimientoReal(g);
    const precioLitro = g.litros > 0 ? g.porGrupo.combustible / g.litros : null;
    return {
      numeroEconomico: u.numeroEconomico,
      proyecto: u.proyecto?.nombre ?? null,
      modelo: `${u.marca} ${u.unidadModelo}`,
      kmRecorridos: g.kmRendimiento,
      litros: Math.round(g.litros * 10) / 10,
      rendimientoReal: real,
      rendimientoFicha: u.rendimientoPromedio != null ? Number(u.rendimientoPromedio) : null,
      combustible: g.porGrupo.combustible,
      mantenimiento: g.porGrupo.mantenimiento,
      casetas: g.porGrupo.casetas,
      tramites: g.porGrupo.tramites,
      siniestros: g.porGrupo.siniestros,
      seguros: g.porGrupo.seguros,
      otros: g.porGrupo.otros,
      total: g.total,
      // Precio promedio por litro ÷ rendimiento real: no mezcla el gasto de todas las cargas con solo los km de las cargas válidas.
      costoCombustibleKm: real && precioLitro ? Math.round((precioLitro / real) * 100) / 100 : null,
    };
  });

  const grupo =
    criterio === "modelo" ? `${base.marca} ${base.unidadModelo}` : criterio === "marca" ? base.marca : TIPO_VEHICULO_LABEL[base.tipoVehiculo] ?? base.tipoVehiculo;
  const enlace = (cambios: { criterio?: Criterio; periodo?: string }) =>
    `/unidades/comparativo?base=${encodeURIComponent(base.numeroEconomico)}&criterio=${cambios.criterio ?? criterio}&periodo=${cambios.periodo ?? periodo}`;
  const chip = (activo: boolean): React.CSSProperties => ({
    background: activo ? "var(--color-primary)" : "var(--panel-bg)",
    color: activo ? "#fff" : "var(--sidebar-text-active)",
    fontFamily: "var(--font-ui)",
    fontSize: "var(--text-sm)",
    fontWeight: activo ? 600 : 400,
  });

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6">
      <div>
        <Link href={`/unidades/${base.numeroEconomico}`} className="mb-2 inline-flex items-center gap-1.5" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ArrowLeft size={14} /> Volver a {base.numeroEconomico}
        </Link>
        <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>Comparativo de unidades</h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          {base.numeroEconomico} contra las unidades activas de {criterio === "tipo" ? "tipo" : criterio === "marca" ? "marca" : "modelo"} <strong>{grupo}</strong> — gasto por partida, combustible y rendimiento.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textTransform: "uppercase", fontWeight: 600 }}>Comparar contra</span>
        {(Object.keys(CRITERIO_LABEL) as Criterio[]).map((c) => (
          <Link key={c} href={enlace({ criterio: c })} className="rounded-md px-3 h-8 inline-flex items-center" style={chip(c === criterio)}>
            {CRITERIO_LABEL[c]}
          </Link>
        ))}
        <span className="ml-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textTransform: "uppercase", fontWeight: 600 }}>Periodo</span>
        <Link href={enlace({ periodo: "anio" })} className="rounded-md px-3 h-8 inline-flex items-center" style={chip(periodo === "anio")}>
          Año en curso
        </Link>
        <Link href={enlace({ periodo: "historico" })} className="rounded-md px-3 h-8 inline-flex items-center" style={chip(periodo === "historico")}>
          Histórico
        </Link>
      </div>

      <ComparativoTabla filas={JSON.parse(JSON.stringify(filas))} base={base.numeroEconomico} titulo={`${CRITERIO_LABEL[criterio]}: ${grupo}`} />

      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
        Km recorridos y rendimiento real salen de las cargas de combustible con rendimiento válido (cálculo de la plataforma). Mantenimiento incluye preventivo, correctivo, llantas, refacciones y consumibles; trámites incluye tenencia, verificación y emplacamiento; siniestros cuenta arrastre y reparación.
      </p>
    </div>
  );
}
