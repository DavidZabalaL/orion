import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { crearUnidad } from "./actions";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";

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

export default async function AltaUnidadPage() {
  const [proyectos, operadores] = await Promise.all([
    prisma.proyecto.findMany({ where: { estatus: "ACTIVO" }, select: { id: true, nombre: true, estadoRepublica: true } }),
    prisma.operador.findMany({ where: { estatus: "ACTIVO" }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl">
      <div>
        <Link href="/altas-bajas" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Alta de Unidad
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Formulario guiado con validación en línea de unicidad de número económico, placas y VIN.
        </p>
      </div>

      <form action={crearUnidad} className="flex flex-col gap-6">
        <Bloque titulo="Identificación">
          <div>
            <label style={labelStyle}>Número económico *</label>
            <input name="numeroEconomico" required placeholder="KAB-120" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
          <div>
            <label style={labelStyle}>Placas *</label>
            <input name="placas" required style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
          <div className="md:col-span-2">
            <label style={labelStyle}>Número de serie (VIN) — 17 caracteres *</label>
            <input name="numeroSerie" required minLength={17} maxLength={17} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
        </Bloque>

        <Bloque titulo="Vehículo">
          <div>
            <label style={labelStyle}>Marca *</label>
            <input name="marca" required style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Unidad / modelo comercial *</label>
            <input name="unidadModelo" required style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Año *</label>
            <input name="anio" type="number" required min={1990} max={2100} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Tipo *</label>
            <select name="tipoVehiculo" required style={fieldStyle}>
              <option value="">Seleccionar…</option>
              {Object.entries(TIPO_VEHICULO_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tipo de combustible *</label>
            <select name="tipoCombustible" required style={fieldStyle}>
              <option value="">Seleccionar…</option>
              <option value="GASOLINA">Gasolina</option>
              <option value="DIESEL">Diésel</option>
              <option value="ELECTRICO">Eléctrico</option>
              <option value="HIBRIDO">Híbrido</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Rendimiento promedio km/L</label>
            <input name="rendimientoPromedio" type="number" step="0.1" style={fieldStyle} />
          </div>
        </Bloque>

        <Bloque titulo="Asignación">
          <div>
            <label style={labelStyle}>Proyecto *</label>
            <select name="proyectoId" required style={fieldStyle} id="proyectoSelect">
              <option value="">Seleccionar…</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id} data-estado={p.estadoRepublica}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Estado de operación *</label>
            <input name="estadoOperacion" required style={fieldStyle} placeholder="Ej. Tamaulipas" />
          </div>
          <div className="md:col-span-2">
            <label style={labelStyle}>Responsable de resguardo</label>
            <select name="resguardanteId" style={fieldStyle}>
              <option value="">Sin asignar</option>
              {operadores.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          </div>
        </Bloque>

        <Bloque titulo="Documentación">
          <div>
            <label style={labelStyle}>Tag IAVE (número)</label>
            <input name="tagIave" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
          </div>
          <div>
            <label style={labelStyle}>Origen de placa *</label>
            <input name="origenPlaca" required style={fieldStyle} placeholder="Ej. Tamaulipas" />
          </div>
          <div>
            <label style={labelStyle}>Propietario *</label>
            <select name="propietario" required style={fieldStyle}>
              <option value="">Seleccionar…</option>
              <option value="SYM">SYM</option>
              <option value="FIVE_STAR_SYSTEM">5 STAR SYSTEM</option>
              <option value="KABAT">KABAT</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </Bloque>

        <div
          className="rounded-md px-4 py-3"
          style={{ background: "var(--status-revision-bg)", color: "var(--color-status-revision)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
        >
          El seguro se puede capturar después desde el Módulo F. Mientras no se registre, aparecerá un aviso en el listado de la unidad.
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-md px-5 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            Guardar unidad
          </button>
          <Link href="/altas-bajas" className="rounded-md px-5 h-10 flex items-center" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
