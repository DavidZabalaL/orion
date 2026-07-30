import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requerirPermisoModulo } from "@/lib/permisos";
import { BiExplorer } from "@/components/bi/bi-explorer";

export const dynamic = "force-dynamic";

export default async function BiPage() {
  await requerirPermisoModulo("J");

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/reportes" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver al dashboard
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Explorador de BI
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Combina cualquier dimensión (eje X) con cualquier métrica (eje Y) de los módulos ya etiquetados.
        </p>
      </div>

      <BiExplorer />
    </div>
  );
}
