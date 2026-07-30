import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { actualizarUnidad } from "../../actions";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { CampoAyuda } from "@/components/ui/campo-ayuda";

export const dynamic = "force-dynamic";

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
  width: "100%",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  display: "block",
  marginBottom: 6,
};

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
      <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
        {titulo}
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

export default async function EditarUnidadPage({
  params,
}: {
  params: Promise<{ numeroEconomico: string }>;
}) {
  await requerirPermisoModulo("A", "editar");
  const { numeroEconomico } = await params;
  const proyectosPermitidos = await proyectosPermitidosParaModulo("A");

  const [unidad, proyectos, operadores] = await Promise.all([
    prisma.unidad.findUnique({ where: { numeroEconomico } }),
    prisma.proyecto.findMany({
      where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}) },
      select: { id: true, nombre: true },
    }),
    prisma.operador.findMany({ where: { estatus: "ACTIVO" }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);

  if (!unidad) notFound();
  if (proyectosPermitidos !== null && (!unidad.proyectoId || !proyectosPermitidos.includes(unidad.proyectoId))) notFound();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl">
      <div>
        <Link href={`/unidades/${numeroEconomico}`} className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a la ficha
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Editar unidad <span style={{ fontFamily: "var(--font-mono)" }}>{numeroEconomico}</span>
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          El número económico y el número de serie (VIN) no se pueden modificar aquí — son la identidad permanente de la unidad.
        </p>
      </div>

      <form action={actualizarUnidad} className="flex flex-col gap-6">
        <input type="hidden" name="numeroEconomico" value={numeroEconomico} />

        <Bloque titulo="Identificación">
          <div>
            <CampoAyuda style={labelStyle} texto="Placa vehicular vigente, tal como aparece en la tarjeta de circulación.">Placas *</CampoAyuda>
            <input name="placas" required defaultValue={unidad.placas} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
          <div>
            <label style={labelStyle}>Número de serie (VIN)</label>
            <input value={unidad.numeroSerie} disabled style={{ ...fieldStyle, fontFamily: "var(--font-mono)", opacity: 0.6 }} />
          </div>
        </Bloque>

        <Bloque titulo="Vehículo">
          <div>
            <CampoAyuda style={labelStyle} texto="Fabricante del vehículo (ej. Nissan, Ford).">Marca *</CampoAyuda>
            <input name="marca" required defaultValue={unidad.marca} style={fieldStyle} />
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Modelo comercial del vehículo (ej. NP300, Estaquitas).">Unidad / modelo comercial *</CampoAyuda>
            <input name="unidadModelo" required defaultValue={unidad.unidadModelo} style={fieldStyle} />
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Año de fabricación del vehículo.">Año *</CampoAyuda>
            <input name="anio" type="number" required min={1990} max={2100} defaultValue={unidad.anio} style={fieldStyle} />
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Clase de vehículo según su carrocería.">Tipo *</CampoAyuda>
            <select name="tipoVehiculo" required defaultValue={unidad.tipoVehiculo} style={fieldStyle}>
              {Object.entries(TIPO_VEHICULO_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Combustible que usa el vehículo.">Tipo de combustible *</CampoAyuda>
            <select name="tipoCombustible" required defaultValue={unidad.tipoCombustible} style={fieldStyle}>
              <option value="GASOLINA">Gasolina</option>
              <option value="DIESEL">Diésel</option>
              <option value="ELECTRICO">Eléctrico</option>
              <option value="HIBRIDO">Híbrido</option>
            </select>
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Kilómetros por litro esperados; se usa para calcular anomalías de consumo.">Rendimiento promedio km/L</CampoAyuda>
            <input name="rendimientoPromedio" type="number" step="0.1" defaultValue={unidad.rendimientoPromedio ? Number(unidad.rendimientoPromedio) : ""} style={fieldStyle} />
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Litros que soporta el tanque; se usa para alertar sobrellenados.">Capacidad máxima de tanque (litros)</CampoAyuda>
            <input name="capacidadTanqueLitros" type="number" step="0.1" min={1} defaultValue={unidad.capacidadTanqueLitros ? Number(unidad.capacidadTanqueLitros) : ""} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
        </Bloque>

        <Bloque titulo="Asignación">
          <div>
            <CampoAyuda style={labelStyle} texto="Proyecto de Grupo Kabat al que queda asignada la unidad.">Proyecto</CampoAyuda>
            <select name="proyectoId" defaultValue={unidad.proyectoId ?? ""} style={fieldStyle}>
              <option value="">Sin proyecto</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Operador que queda a cargo de resguardar la unidad, si ya se conoce.">Responsable de resguardo</CampoAyuda>
            <select name="resguardanteId" defaultValue={unidad.resguardanteId ?? ""} style={fieldStyle}>
              <option value="">Sin asignar</option>
              {operadores.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          </div>
        </Bloque>

        <Bloque titulo="Documentación">
          <div>
            <CampoAyuda style={labelStyle} texto="Número de la etiqueta electrónica IAVE, si la unidad ya tiene una asignada.">Tag IAVE (número)</CampoAyuda>
            <input name="tagIave" defaultValue={unidad.tagIave ?? ""} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Número de la tarjeta de combustible asignada a la unidad.">Número de tarjeta de combustible</CampoAyuda>
            <input name="numeroTarjetaCombustible" defaultValue={unidad.numeroTarjetaCombustible ?? ""} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Estado de la república donde se emitió la placa.">Origen de placa *</CampoAyuda>
            <input name="origenPlaca" required defaultValue={unidad.origenPlaca} style={fieldStyle} />
          </div>
          <div>
            <CampoAyuda style={labelStyle} texto="Empresa del grupo dueña legal del vehículo.">Propietario *</CampoAyuda>
            <select name="propietario" required defaultValue={unidad.propietario} style={fieldStyle}>
              <option value="SYM">SYM</option>
              <option value="FIVE_STAR_SYSTEM">5 STAR SYSTEM</option>
              <option value="KABAT">KABAT</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </Bloque>

        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-md px-5 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            Guardar cambios
          </button>
          <Link href={`/unidades/${numeroEconomico}`} className="rounded-md px-5 h-10 flex items-center" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
