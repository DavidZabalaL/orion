import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ImportadorCombustible } from "@/components/importador/importador-combustible";

export default function ImportarCombustiblePage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl">
      <div>
        <Link href="/combustible" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a Combustible
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Importar transacciones de combustible
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Sube el reporte del proveedor (Efectivale u otro), mapea las columnas y confirma antes de guardar.
        </p>
      </div>

      <ImportadorCombustible />
    </div>
  );
}
