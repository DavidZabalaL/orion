import { prisma } from "@/lib/prisma";
import { OrionIcon } from "@/components/brand/orion-icon";
import { RegistroOperadorForm } from "@/components/usuarios/registro-operador-form";

export const dynamic = "force-dynamic";

export default async function RegistroOperadorPage() {
  const proyectos = await prisma.proyecto.findMany({
    where: { estatus: "ACTIVO" },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "#f4f6f9" }}>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-3">
            <OrionIcon size={36} />
            <span style={{ fontFamily: "var(--font)", fontSize: 26, fontWeight: 800, color: "#0f1b2d" }}>Orión</span>
          </div>
        </div>

        <div className="rounded-xl p-8" style={{ background: "#fff", boxShadow: "0px 8px 32px rgba(15,40,120,0.10)" }}>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "#0f1b2d" }}>
            Crea tu cuenta de Operador
          </h1>
          <p className="mt-1 mb-6" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "#64748b" }}>
            Verificamos tu CURP contra el padrón de personal activo de la empresa antes de crear tu acceso.
          </p>
          <RegistroOperadorForm proyectos={proyectos} />
        </div>
      </div>
    </div>
  );
}
