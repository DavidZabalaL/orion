"use client";

import { useEffect } from "react";
import { unstable_isUnrecognizedActionError } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { recargarSiVersionNueva } from "@/lib/version-nueva";

// Sin esto, un error de cliente (p. ej. un Server Action que ya no existe tras un despliegue)
// dejaba la pantalla "Application error" de Next.js y el operador perdía el formulario.
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const versionNueva = unstable_isUnrecognizedActionError(error);

  useEffect(() => {
    console.error(error);
    recargarSiVersionNueva(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-10 text-center" style={{ minHeight: "60vh" }}>
      <AlertTriangle size={40} color="var(--color-status-escena)" />
      <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
        {versionNueva ? "Orión se actualizó" : "Ocurrió un error"}
      </h1>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
        {versionNueva
          ? "Recargando la página. Tu avance guardado se conserva."
          : "Intenta de nuevo. Si sigue fallando, recarga la página: los checklists conservan su avance."}
      </p>
      {error.digest && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
          Código de referencia: {error.digest}
        </p>
      )}
      <div className="flex items-center gap-3">
        {!versionNueva && (
          <button
            onClick={() => unstable_retry()}
            className="rounded-md px-5 h-10 flex items-center font-semibold"
            style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            Intentar de nuevo
          </button>
        )}
        <button
          onClick={() => window.location.reload()}
          className="rounded-md px-5 h-10 flex items-center font-semibold"
          style={{ border: "1px solid var(--field-border)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          Recargar página
        </button>
      </div>
    </div>
  );
}
