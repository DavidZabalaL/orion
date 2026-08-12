"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/table";
import { BuscadorTexto } from "@/components/ui/buscador-texto";
import { UsuarioRow } from "@/components/usuarios/usuario-row";

type Usuario = {
  id: string;
  nombre: string;
  correo: string;
  rolId: string;
  rol: string;
  proyectoIds: string[];
  proyectos: string[];
  estatus: string;
};

export function UsuariosLista({
  usuarios,
  roles,
  proyectosDisponibles,
}: {
  usuarios: Usuario[];
  roles: { id: string; nombre: string }[];
  proyectosDisponibles: { id: string; nombre: string }[];
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return usuarios;
    return usuarios.filter((u) => u.nombre.toUpperCase().includes(q) || u.correo.toUpperCase().includes(q));
  }, [usuarios, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <BuscadorTexto value={busqueda} onChange={setBusqueda} placeholder="Buscar nombre o correo…" />
      {filtrados.length === 0 ? (
        <EmptyState>Sin usuarios que coincidan.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {filtrados.map((u) => (
            <UsuarioRow key={u.id} usuario={u} roles={roles} proyectosDisponibles={proyectosDisponibles} />
          ))}
        </div>
      )}
    </div>
  );
}
