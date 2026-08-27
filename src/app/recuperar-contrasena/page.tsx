import { OrionIcon } from "@/components/brand/orion-icon";
import { RecuperarContrasenaForm } from "@/components/usuarios/recuperar-contrasena-form";

export default function RecuperarContrasenaPage() {
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
            Recuperar contraseña
          </h1>
          <p className="mt-1 mb-6" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "#64748b" }}>
            Solo para operadores que entran con correo y contraseña (no cuenta Microsoft). Escribe tu correo y te mandamos un enlace para crear una nueva.
          </p>
          <RecuperarContrasenaForm />
        </div>
      </div>
    </div>
  );
}
