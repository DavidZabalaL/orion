"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { alternarEstatusUsuario } from "@/app/(app)/usuarios/actions";

type Usuario = {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  proyectos: string[];
  estatus: string;
};

const ESTATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVO: { label: "Activo", color: "var(--color-status-cerrado)", bg: "var(--status-cerrado-bg)" },
  INVITADO: { label: "Invitado", color: "var(--color-status-revision)", bg: "var(--status-revision-bg)" },
  DESACTIVADO: { label: "Desactivado", color: "var(--sidebar-text)", bg: "var(--chip)" },
};

export function UsuarioRow({ usuario: u }: { usuario: Usuario }) {
  const [pending, startTransition] = useTransition();
  const style = ESTATUS_STYLE[u.estatus];

  return (
    <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
      <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{u.nombre}</td>
      <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{u.correo}</td>
      <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.rol}</td>
      <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{u.proyectos.length ? u.proyectos.join(", ") : "—"}</td>
      <td className="px-4 py-3"><Badge label={style.label} color={style.color} bg={style.bg} /></td>
      <td className="px-4 py-3">
        <form
          action={(fd) => {
            startTransition(() => alternarEstatusUsuario(fd));
          }}
        >
          <input type="hidden" name="id" value={u.id} />
          <input type="hidden" name="estatus" value={u.estatus} />
          <button type="submit" disabled={pending} className="rounded-md px-2.5 py-1 disabled:opacity-60" style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
            {pending ? "…" : u.estatus === "DESACTIVADO" ? "Reactivar" : "Desactivar"}
          </button>
        </form>
      </td>
    </tr>
  );
}
