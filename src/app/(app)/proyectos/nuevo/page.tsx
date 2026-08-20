import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requerirPermisoModulo } from "@/lib/permisos";
import { NuevoProyectoForm } from "@/components/proyectos/nuevo-proyecto-form";

export default async function NuevoProyectoPage() {
  await requerirPermisoModulo("H", "editar");

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-xl">
      <div>
        <Link href="/proyectos" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Nuevo proyecto
        </h1>
      </div>

      <NuevoProyectoForm />
    </div>
  );
}
