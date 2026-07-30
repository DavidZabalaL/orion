import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { actualizarOperador } from "../actions";
import { TIPO_SANGRE_LABEL } from "@/lib/estatus-operador";
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

export default async function EditarOperadorPage({ params }: { params: Promise<{ id: string }> }) {
  await requerirPermisoModulo("L", "editar");
  const { id } = await params;
  const proyectosPermitidos = await proyectosPermitidosParaModulo("L");

  const [operador, proyectos] = await Promise.all([
    prisma.operador.findUnique({ where: { id } }),
    prisma.proyecto.findMany({
      where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}) },
      select: { id: true, nombre: true },
    }),
  ]);

  if (!operador) notFound();
  if (proyectosPermitidos !== null && (!operador.proyectoId || !proyectosPermitidos.includes(operador.proyectoId))) notFound();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      <div>
        <Link href={`/operadores/${id}`} className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a la ficha
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Editar operador
        </h1>
      </div>

      <form action={actualizarOperador} className="flex flex-col gap-6">
        <input type="hidden" name="id" value={id} />
        <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Datos personales
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <CampoAyuda style={labelStyle} texto="Nombre completo del operador, tal como aparece en su identificación.">Nombre completo *</CampoAyuda>
              <input name="nombre" required defaultValue={operador.nombre} style={fieldStyle} />
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Clave Única de Registro de Población del operador.">CURP *</CampoAyuda>
              <input name="curp" required maxLength={18} defaultValue={operador.curp} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Registro Federal de Contribuyentes del operador, si se tiene.">RFC</CampoAyuda>
              <input name="rfc" defaultValue={operador.rfc ?? ""} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Número de Seguridad Social del operador.">NSS</CampoAyuda>
              <input name="nss" defaultValue={operador.nss ?? ""} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Tipo de sangre, útil en caso de emergencia.">Tipo de sangre</CampoAyuda>
              <select name="tipoSangre" defaultValue={operador.tipoSangre ?? ""} style={fieldStyle}>
                <option value="">Seleccionar…</option>
                {Object.entries(TIPO_SANGRE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Número telefónico de contacto del operador.">Teléfono</CampoAyuda>
              <input name="telefono" defaultValue={operador.telefono ?? ""} style={fieldStyle} />
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Persona y teléfono a contactar en caso de emergencia.">Contacto de emergencia</CampoAyuda>
              <input name="contactoEmergencia" defaultValue={operador.contactoEmergencia ?? ""} style={fieldStyle} />
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Proyecto al que queda asignado el operador.">Proyecto</CampoAyuda>
              <select name="proyectoId" defaultValue={operador.proyectoId ?? ""} style={fieldStyle}>
                <option value="">Sin asignar</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-md px-5 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            Guardar cambios
          </button>
          <Link href={`/operadores/${id}`} className="rounded-md px-5 h-10 flex items-center" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
