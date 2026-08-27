"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { solicitarRecuperacionContrasena } from "@/app/recuperar-contrasena/actions";

const fieldStyle: React.CSSProperties = {
  border: "1px solid #d7dee8",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: "var(--text-sm)",
  color: "#0f1b2d",
  background: "#fff",
  width: "100%",
};

export function RecuperarContrasenaForm() {
  const [pending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);

  if (enviado) {
    return (
      <div className="flex items-start gap-2 rounded-md px-3 py-2.5" style={{ background: "rgba(34,197,94,0.1)" }}>
        <CheckCircle2 size={15} color="#16a34a" className="shrink-0 mt-0.5" />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#15803d" }}>
          Si ese correo tiene una cuenta de operador, te llegará un enlace para crear una contraseña nueva. Revisa tu bandeja (y spam).
        </span>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) => {
        startTransition(async () => {
          await solicitarRecuperacionContrasena(formData);
          setEnviado(true);
        });
      }}
    >
      <div>
        <label style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
          Correo
        </label>
        <input name="correo" type="email" required autoComplete="email" style={fieldStyle} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-md h-11 font-semibold disabled:opacity-60"
        style={{ background: "#0f1b2d", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", border: "none", cursor: "pointer" }}
      >
        {pending ? "Enviando…" : "Enviar enlace"}
      </button>

      <Link href="/iniciar-sesion" className="text-center" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#94a3b8" }}>
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
