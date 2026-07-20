import Image from "next/image";
import { TriangleAlert, Car, Wrench, BarChart3 } from "lucide-react";
import { signIn } from "@/auth";
import { OrionIcon } from "@/components/brand/orion-icon";
import logoKabat from "../../../public/Logo-Grupo-Kabat_bl.png";

const ERROR_LABEL: Record<string, string> = {
  SinAcceso: "Tu cuenta de Microsoft no tiene acceso a Orion. Pide a un administrador que te invite desde Usuarios y roles.",
  AccessDenied: "Acceso denegado. Verifica que estés usando tu cuenta de Grupo Kabat.",
};

const DESTACADOS = [
  { icon: Car, titulo: "Inventario", texto: "Control total de tu flota" },
  { icon: Wrench, titulo: "Mantenimiento", texto: "Programa y da seguimiento" },
  { icon: BarChart3, titulo: "Reportes", texto: "Visibilidad en tiempo real" },
];

export default async function IniciarSesionPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = sp.callbackUrl || "/unidades";
  const error = sp.error ? ERROR_LABEL[sp.error] ?? "No se pudo iniciar sesión." : null;

  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo — marca */}
      <div
        className="relative hidden lg:flex lg:w-1/2 flex-col items-center justify-center gap-12 overflow-hidden px-12"
        style={{
          background:
            "radial-gradient(60% 50% at 30% 30%, rgba(43,127,255,0.25) 0%, rgba(4,13,25,0) 70%), linear-gradient(160deg, #0b1a30 0%, #050d1a 60%, #030810 100%)",
        }}
      >
        <Image src={logoKabat} alt="Grupo Kabat" width={160} height={40} style={{ height: "auto" }} />

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3">
            <OrionIcon size={44} />
            <span style={{ fontFamily: "var(--font)", fontSize: 34, fontWeight: 800, color: "#fff" }}>Orion</span>
          </div>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "rgba(255,255,255,0.55)" }}>
            Control Vehicular de Grupo Kabat
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full max-w-md">
          {DESTACADOS.map((d) => (
            <div
              key={d.titulo}
              className="rounded-lg px-3 py-4 flex flex-col gap-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <d.icon size={16} color="#7ba8ff" />
              <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "#fff" }}>{d.titulo}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.5)" }}>{d.texto}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — acceso */}
      <div className="flex flex-1 items-center justify-center p-4" style={{ background: "#f4f6f9" }}>
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center lg:hidden">
            <div className="flex items-center gap-3">
              <OrionIcon size={36} />
              <span style={{ fontFamily: "var(--font)", fontSize: 26, fontWeight: 800, color: "#0f1b2d" }}>Orion</span>
            </div>
          </div>

          <div className="rounded-xl p-8" style={{ background: "#fff", boxShadow: "0px 8px 32px rgba(15,40,120,0.10)" }}>
            <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "#0f1b2d" }}>
              Iniciar sesión
            </h1>
            <p className="mt-1 mb-6" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "#64748b" }}>
              Ingresa con tu correo de Grupo Kabat
            </p>

            {error && (
              <div className="flex items-start gap-2 rounded-md px-4 py-3 w-full mb-5" style={{ background: "rgba(255,82,99,0.1)", color: "#dc2f3f" }}>
                <TriangleAlert size={16} className="shrink-0 mt-0.5" />
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>{error}</span>
              </div>
            )}

            <form
              action={async () => {
                "use server";
                await signIn("microsoft-entra-id", { redirectTo: callbackUrl });
              }}
            >
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-md h-12 font-semibold"
                style={{ background: "#fff", color: "#1b1b1b", border: "1px solid #d7dee8", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
              >
                <MicrosoftLogo />
                Continuar con Microsoft
              </button>
            </form>
          </div>

          <p className="mt-6 text-center" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "#94a3b8" }}>
            Plataforma interna — acceso restringido al equipo de Kabat
          </p>
        </div>
      </div>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
