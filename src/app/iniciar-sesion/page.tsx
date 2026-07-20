import { Truck, TriangleAlert } from "lucide-react";
import { signIn } from "@/auth";

const ERROR_LABEL: Record<string, string> = {
  SinAcceso: "Tu cuenta de Microsoft no tiene acceso a Orion. Pide a un administrador que te invite desde Usuarios y roles.",
  AccessDenied: "Acceso denegado. Verifica que estés usando tu cuenta de Grupo Kabat.",
};

export default async function IniciarSesionPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = sp.callbackUrl || "/unidades";
  const error = sp.error ? ERROR_LABEL[sp.error] ?? "No se pudo iniciar sesión." : null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "var(--color-bg)" }}>
      <div className="w-full max-w-sm rounded-xl p-8 flex flex-col items-center gap-6" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-panel)" }}>
        <div className="flex h-14 w-14 items-center justify-center rounded-xl" style={{ background: "var(--color-primary)" }}>
          <Truck size={28} color="#fff" />
        </div>

        <div className="text-center">
          <div style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Orion
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Control Vehicular · Grupo Kabat
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md px-4 py-3 w-full" style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)" }}>
            <TriangleAlert size={16} className="shrink-0 mt-0.5" />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>{error}</span>
          </div>
        )}

        <form
          className="w-full"
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: callbackUrl });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-md h-12 font-semibold"
            style={{ background: "#fff", color: "#1b1b1b", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
          >
            <MicrosoftLogo />
            Iniciar sesión con Microsoft
          </button>
        </form>

        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }} className="text-center">
          Usa tu cuenta de correo corporativa de Grupo Kabat.
        </p>
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
