import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function SinAccesoPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-10 text-center" style={{ minHeight: "60vh" }}>
      <ShieldAlert size={40} color="var(--color-status-escena)" />
      <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
        No tienes permiso para ver esta sección
      </h1>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
        Si crees que deberías tener acceso, pide a un Administrador que revise tu rol en Administración → Roles y permisos.
      </p>
      <Link
        href="/unidades"
        className="rounded-md px-5 h-10 flex items-center font-semibold"
        style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
      >
        Volver al inicio
      </Link>
    </div>
  );
}
