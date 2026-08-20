"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function ProyectosError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-10 text-center" style={{ minHeight: "60vh" }}>
      <AlertTriangle size={40} color="var(--color-status-escena)" />
      <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
        Ocurrió un error al procesar la solicitud
      </h1>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
        {error.message || "Algo salió mal. Intenta de nuevo o vuelve a la lista de proyectos."}
      </p>
      {error.digest && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
          Código de referencia: {error.digest}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={() => unstable_retry()}
          className="rounded-md px-5 h-10 flex items-center font-semibold"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
        >
          Intentar de nuevo
        </button>
        <Link
          href="/proyectos"
          style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}
        >
          Volver a proyectos
        </Link>
      </div>
    </div>
  );
}
