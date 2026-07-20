import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MODULOS } from "@/lib/modulos";
import { ProyectoModulosForm } from "@/components/usuarios/proyecto-modulos-form";

export const dynamic = "force-dynamic";

export default async function ConfiguracionProyectosPage() {
  const proyectos = await prisma.proyecto.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl">
      <div>
        <Link href="/usuarios" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a usuarios
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Configuración de Proyecto
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Módulos activos por proyecto — un proyecto puede tener módulos activados o desactivados.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {proyectos.map((p) => (
          <ProyectoModulosForm
            key={p.id}
            proyecto={{ id: p.id, nombre: p.nombre, modulosActivos: p.modulosActivos as string[] }}
            modulos={MODULOS.map((m) => ({ id: m.id, label: m.label }))}
          />
        ))}
      </div>
    </div>
  );
}
