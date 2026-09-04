"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { validarIdentidadOperador, registrarOperador } from "@/app/registro-operador/actions";

const fieldStyle: React.CSSProperties = {
  border: "1px solid #d7dee8",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: "var(--text-sm)",
  color: "#0f1b2d",
  background: "#fff",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "#64748b",
  display: "block",
  marginBottom: 6,
};

function ErrorBox({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md px-3 py-2.5" style={{ background: "rgba(255,82,99,0.1)" }}>
      <TriangleAlert size={15} color="#dc2f3f" className="shrink-0 mt-0.5" />
      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#dc2f3f" }}>{mensaje}</span>
    </div>
  );
}

export function RegistroOperadorForm({ proyectos }: { proyectos: { id: string; nombre: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [identidad, setIdentidad] = useState<{ curp: string; nombreCompleto: string } | null>(null);

  if (ok) {
    return (
      <div className="flex items-start gap-2 rounded-md px-3 py-2.5" style={{ background: "rgba(34,197,94,0.1)" }}>
        <CheckCircle2 size={15} color="#16a34a" className="shrink-0 mt-0.5" />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#15803d" }}>
          Cuenta creada. Ya puedes <a href="/iniciar-sesion" style={{ color: "#2b7fff", fontWeight: 600 }}>iniciar sesión</a>.
        </span>
      </div>
    );
  }

  if (!identidad) {
    return (
      <form
        className="flex flex-col gap-3"
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const res = await validarIdentidadOperador(formData);
            if (res.ok) setIdentidad({ curp: String(formData.get("curp") ?? "").trim().toUpperCase(), nombreCompleto: res.datos.nombreCompleto });
            else setError(res.error);
          });
        }}
      >
        <div>
          <label style={labelStyle}>CURP</label>
          <input name="curp" required maxLength={18} autoComplete="off" style={{ ...fieldStyle, textTransform: "uppercase" }} />
        </div>
        <div>
          <label style={labelStyle}>Nombre completo (como en tu identificación oficial)</label>
          <input name="nombreCompleto" required autoComplete="off" style={{ ...fieldStyle, textTransform: "uppercase" }} />
        </div>

        {error && <ErrorBox mensaje={error} />}

        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-md h-11 font-semibold disabled:opacity-60"
          style={{ background: "#0f1b2d", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", border: "none", cursor: "pointer" }}
        >
          {pending ? "Verificando…" : "Verificar mi identidad"}
        </button>
      </form>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await registrarOperador(formData);
          if (res.ok) setOk(true);
          else setError(res.error ?? "No se pudo crear tu cuenta.");
        });
      }}
    >
      <input type="hidden" name="curp" value={identidad.curp} />
      <input type="hidden" name="nombreCompleto" value={identidad.nombreCompleto} />

      <div className="flex items-start gap-2 rounded-md px-3 py-2.5" style={{ background: "rgba(34,197,94,0.1)" }}>
        <CheckCircle2 size={15} color="#16a34a" className="shrink-0 mt-0.5" />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#15803d" }}>
          Identidad verificada: {identidad.nombreCompleto}
        </span>
      </div>

      <div>
        <label style={labelStyle}>Proyecto en el que trabajas</label>
        <select name="proyectoId" required style={fieldStyle}>
          <option value="">Seleccionar…</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Tu correo (personal está bien)</label>
        <input name="correo" type="email" required autoComplete="email" style={fieldStyle} />
      </div>
      <div>
        <label style={labelStyle}>Contraseña</label>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" style={fieldStyle} />
      </div>
      <div>
        <label style={labelStyle}>Confirmar contraseña</label>
        <input name="confirmarPassword" type="password" required minLength={8} autoComplete="new-password" style={fieldStyle} />
      </div>

      {error && <ErrorBox mensaje={error} />}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-md h-11 font-semibold disabled:opacity-60"
        style={{ background: "#0f1b2d", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", border: "none", cursor: "pointer" }}
      >
        {pending ? "Creando cuenta…" : "Crear mi cuenta"}
      </button>
      <button
        type="button"
        onClick={() => { setIdentidad(null); setError(null); }}
        style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "#64748b", background: "none", border: "none", cursor: "pointer" }}
      >
        No soy yo, corregir datos
      </button>
    </form>
  );
}
