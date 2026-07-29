import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { crearOperador } from "./actions";
import { TIPO_SANGRE_LABEL } from "@/lib/estatus-operador";
import { requerirPermisoModulo } from "@/lib/permisos";
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

export default async function AltaOperadorPage() {
  await requerirPermisoModulo("L", "editar");

  const proyectos = await prisma.proyecto.findMany({ where: { estatus: "ACTIVO" }, select: { id: true, nombre: true } });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      <div>
        <Link href="/operadores" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a operadores
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Alta de Operador
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Datos personales y documentación inicial. El resto de la documentación puede completarse después desde la ficha del operador.
        </p>
      </div>

      <form action={crearOperador} className="flex flex-col gap-6">
        <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Datos personales
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <CampoAyuda style={labelStyle} texto="Nombre completo del operador, tal como aparece en su identificación.">Nombre completo *</CampoAyuda>
              <input name="nombre" required style={fieldStyle} />
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Clave Única de Registro de Población del operador.">CURP *</CampoAyuda>
              <input name="curp" required maxLength={18} style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Registro Federal de Contribuyentes del operador, si se tiene.">RFC</CampoAyuda>
              <input name="rfc" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Número de Seguridad Social del operador.">NSS</CampoAyuda>
              <input name="nss" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Tipo de sangre, útil en caso de emergencia.">Tipo de sangre</CampoAyuda>
              <select name="tipoSangre" style={fieldStyle}>
                <option value="">Seleccionar…</option>
                {Object.entries(TIPO_SANGRE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Número telefónico de contacto del operador.">Teléfono</CampoAyuda>
              <input name="telefono" style={fieldStyle} />
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Persona y teléfono a contactar en caso de emergencia.">Contacto de emergencia</CampoAyuda>
              <input name="contactoEmergencia" style={fieldStyle} />
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Proyecto al que queda asignado el operador, si ya se conoce.">Proyecto</CampoAyuda>
              <select name="proyectoId" style={fieldStyle}>
                <option value="">Sin asignar</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Documentación inicial — Licencia de conducir
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <CampoAyuda style={labelStyle} texto="Categoría de la licencia de conducir.">Tipo de licencia</CampoAyuda>
              <select name="tipoLicencia" style={fieldStyle}>
                <option value="">Seleccionar…</option>
                {["A", "B", "C", "D", "E"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Folio de la licencia de conducir.">Número de licencia</CampoAyuda>
              <input name="numeroLicencia" style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }} />
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Estado de la república que expidió la licencia.">Estado emisor</CampoAyuda>
              <input name="estadoEmisor" style={fieldStyle} />
            </div>
            <div>
              <CampoAyuda style={labelStyle} texto="Fecha en que vence la licencia de conducir.">Fecha de vencimiento</CampoAyuda>
              <input name="fechaVencimientoLicencia" type="date" style={fieldStyle} />
            </div>
          </div>
          <p className="mt-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
            El resto de la documentación (INE, comprobante de domicilio, antecedentes, CSF, examen médico, antidoping, curso de manejo) se adjunta desde la ficha del operador una vez creado.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-md px-5 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            Guardar operador
          </button>
          <Link href="/operadores" className="rounded-md px-5 h-10 flex items-center" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
