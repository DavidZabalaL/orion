"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { aceptarInvitacionOperador } from "@/app/invitacion/actions";

const fieldStyle: React.CSSProperties = {
  border: "1px solid #d7dee8",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: "var(--text-sm)",
  color: "#0f1b2d",
  background: "#fff",
  width: "100%",
};

export function AceptarInvitacionForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await aceptarInvitacionOperador(formData);
          if (res.ok) {
            setOk(true);
            setTimeout(() => router.push("/iniciar-sesion"), 2000);
          } else {
            setError(res.error ?? "No se pudo crear la contraseña.");
          }
        });
      }}
    >
      <input type="hidden" name="token" value={token} />

      {ok ? (
        <div className="flex items-start gap-2 rounded-md px-3 py-2.5" style={{ background: "rgba(34,197,94,0.1)" }}>
          <CheckCircle2 size={15} color="#16a34a" className="shrink-0 mt-0.5" />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#15803d" }}>
            Contraseña creada. Redirigiendo a inicio de sesión…
          </span>
        </div>
      ) : (
        <>
          <div>
            <label style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
              Nueva contraseña
            </label>
            <input name="password" type="password" required minLength={8} autoComplete="new-password" style={fieldStyle} />
          </div>
          <div>
            <label style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
              Confirmar contraseña
            </label>
            <input name="confirmarPassword" type="password" required minLength={8} autoComplete="new-password" style={fieldStyle} />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md px-3 py-2.5" style={{ background: "rgba(255,82,99,0.1)" }}>
              <TriangleAlert size={15} color="#dc2f3f" className="shrink-0 mt-0.5" />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#dc2f3f" }}>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex items-center justify-center gap-2 rounded-md h-11 font-semibold disabled:opacity-60"
            style={{ background: "#0f1b2d", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", border: "none", cursor: "pointer" }}
          >
            {pending ? "Guardando…" : "Crear contraseña y continuar"}
          </button>
        </>
      )}
    </form>
  );
}
