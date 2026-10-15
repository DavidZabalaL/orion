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
import { SelectorUnidadesComparativo } from "@/components/unidades/selector-unidades-comparativo";

export const dynamic = "force-dynamic";

type Criterio = "modelo" | "marca" | "tipo" | "seleccion";

const CRITERIO_LABEL: Record<Criterio, string> = {
  modelo: "Mismo modelo",
  marca: "Misma marca",
  tipo: "Mismo tipo de unidad",
  seleccion: "Elegir unidades",
};

/**
 * Comparativo de gasto y rendimiento entre una unidad y las de su mismo
 * modelo / marca / tipo (ej. todas las F-150) — se abre desde la ficha de la
 * unidad. Respeta el alcance de proyectos del rol (módulo A).
 */
export default async function ComparativoUnidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ base?: string; criterio?: string; periodo?: string; unidades?: string; proyecto?: string }>;
}) {
  await requerirPermisoModulo("A");
  const params = await searchParams;
  const criterio: Criterio = params.criterio === "marca" || params.criterio === "tipo" || params.criterio === "seleccion" ? params.criterio : "modelo";
  // Con "Elegir unidades": la lista de la URL (siempre incluye la base); se filtra contra el alcance del rol más abajo.
  const seleccion = criterio === "seleccion" ? Array.from(new Set([params.base ?? "", ...(params.unidades ?? "").split(",")].map((n) => n.trim()).filter(Boolean))).slice(0, 31) : [];
  const periodo = params.periodo === "historico" ? "historico" : "anio";
  const permitidos = await proyectosPermitidosParaModulo("A");
  const alcance = permitidos !== null ? { proyectoId: { in: permitidos } } : {};

  const base = params.base
    ? await prisma.unidad.findFirst({ where: { numeroEconomico: params.base, ...alcance }, select: { numeroEconomico: true, marca: true, unidadModelo: true, tipoVehiculo: true } })
    : null;
  if (!base) notFound();

  const filtroGrupo =
    criterio === "seleccion"
      ? { numeroEconomico: { in: seleccion } }
      : criterio === "modelo"
      ? { marca: { equals: base.marca, mode: "insensitive" as const }, unidadModelo: { equals: base.unidadModelo, mode: "insensitive" as const } }
      : criterio === "marca"
        ? { marca: { equals: base.marca, mode: "insensitive" as const } }
        : { tipoVehiculo: base.tipoVehiculo };

  // Proyectos que el rol puede ver, para el filtro. Un proyecto fuera de su alcance se ignora.
  const proyectos = await prisma.proyecto.findMany({
    where: { estatus: "ACTIVO", ...(permitidos !== null ? { id: { in: permitidos } } : {}) },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  const proyectoId = params.proyecto && proyectos.some((p) => p.id === params.proyecto) ? params.proyecto : null;

  const unidades = await prisma.unidad.findMany({
    where: {
      estatus: { not: "BAJA" },
      ...alcance,
      ...filtroGrupo,
      // Filtro de proyecto: la unidad de origen siempre se incluye como referencia.
      ...(proyectoId ? { OR: [{ proyectoId }, { numeroEconomico: base.numeroEconomico }] } : {}),
    },
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

  // Lista de unidades elegibles para el selector "Elegir unidades".
  const elegibles =
    criterio === "seleccion"
      ? (
          await prisma.unidad.findMany({
            where: { estatus: { not: "BAJA" }, ...alcance, ...(proyectoId ? { proyectoId } : {}) },
            select: { numeroEconomico: true, marca: true, unidadModelo: true, proyecto: { select: { nombre: true } } },
            orderBy: { numeroEconomico: "asc" },
          })
        ).map((u) => ({ numeroEconomico: u.numeroEconomico, modelo: `${u.marca} ${u.unidadModelo}`, proyecto: u.proyecto?.nombre ?? null }))
      : [];

  const grupo =
    criterio === "seleccion" ? "unidades elegidas" : criterio === "modelo" ? `${base.marca} ${base.unidadModelo}` : criterio === "marca" ? base.marca : TIPO_VEHICULO_LABEL[base.tipoVehiculo] ?? base.tipoVehiculo;
  const enlace = (cambios: { criterio?: Criterio; periodo?: string }) => {
    const c = cambios.criterio ?? criterio;
    const lista = c === "seleccion" && seleccion.length > 0 ? `&unidades=${seleccion.map(encodeURIComponent).join(",")}` : "";
    const filtroProyecto = proyectoId ? `&proyecto=${encodeURIComponent(proyectoId)}` : "";
    return `/unidades/comparativo?base=${encodeURIComponent(base.numeroEconomico)}&criterio=${c}&periodo=${cambios.periodo ?? periodo}${lista}${filtroProyecto}`;
  };
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
          {criterio === "seleccion" ? (
            <>{base.numeroEconomico} contra las unidades que elijas por número económico — gasto por partida, combustible y rendimiento.</>
          ) : (
            <>
              {base.numeroEconomico} contra las unidades activas de {criterio === "tipo" ? "tipo" : criterio === "marca" ? "marca" : "modelo"} <strong>{grupo}</strong> — gasto por partida, combustible y rendimiento.
            </>
          )}
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

      {proyectos.length > 1 && (
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="base" value={base.numeroEconomico} />
          <input type="hidden" name="criterio" value={criterio} />
          <input type="hidden" name="periodo" value={periodo} />
          {criterio === "seleccion" && seleccion.length > 0 && <input type="hidden" name="unidades" value={seleccion.join(",")} />}
          <label htmlFor="filtro-proyecto" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textTransform: "uppercase", fontWeight: 600 }}>
            Proyecto
          </label>
          <select
            id="filtro-proyecto"
            name="proyecto"
            defaultValue={proyectoId ?? ""}
            className="rounded-md px-3"
            style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", color: "var(--field-text)", height: "var(--h-md)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
          >
            <option value="">Todos los proyectos</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <button type="submit" className="rounded-md px-4 h-9" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}>
            Filtrar
          </button>
          {proyectoId && (
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
              {base.numeroEconomico} se incluye siempre como referencia.
            </span>
          )}
        </form>
      )}

      {criterio === "seleccion" && (
        <SelectorUnidadesComparativo base={base.numeroEconomico} unidades={elegibles} seleccionInicial={seleccion} periodo={periodo} proyectoId={proyectoId} />
      )}

      <ComparativoTabla filas={JSON.parse(JSON.stringify(filas))} base={base.numeroEconomico} titulo={criterio === "seleccion" ? "Unidades elegidas" : `${CRITERIO_LABEL[criterio]}: ${grupo}`} />

      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
        Km recorridos y rendimiento real salen de las cargas de combustible con rendimiento válido (cálculo de la plataforma). Mantenimiento incluye preventivo, correctivo, llantas, refacciones y consumibles; trámites incluye tenencia, verificación y emplacamiento; siniestros cuenta arrastre y reparación.
      </p>
    </div>
  );
}
