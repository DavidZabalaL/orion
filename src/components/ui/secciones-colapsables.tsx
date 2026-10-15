"use client";

import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";

/**
 * Grupo de secciones que se pueden contraer una por una o todas a la vez
 * (botón "Contraer todo / Expandir todo"). Cada sección recuerda su estado en
 * este navegador (localStorage, por `grupo` + `id`) para que la página abra
 * como la dejó la persona; si el almacenamiento no está disponible, todas
 * abren expandidas, igual que antes.
 *
 * El estado vive en un almacén externo (useSyncExternalStore): en el servidor
 * no hay localStorage, así que el primer render siempre es "expandido" y el
 * navegador aplica lo recordado sin desajustar la hidratación.
 */
const memoria = new Map<string, boolean>();
const suscriptores = new Set<() => void>();

function suscribir(cb: () => void) {
  suscriptores.add(cb);
  return () => {
    suscriptores.delete(cb);
  };
}

function leer(k: string): boolean | null {
  if (memoria.has(k)) return memoria.get(k)!;
  try {
    const v = localStorage.getItem(k);
    return v === null ? null : v === "1";
  } catch {
    return null;
  }
}

function guardar(k: string, abierto: boolean) {
  memoria.set(k, abierto);
  try {
    localStorage.setItem(k, abierto ? "1" : "0");
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): se recuerda solo en esta pestaña.
  }
  suscriptores.forEach((cb) => cb());
}

const clave = (grupo: string, id: string) => `secciones:${grupo}:${id}`;

const ContextoGrupo = createContext<{ grupo: string; registrar: (k: string) => () => void } | null>(null);

const estiloBoton: React.CSSProperties = {
  background: "var(--panel-bg)",
  color: "var(--sidebar-text-active)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
};

export function GrupoSecciones({ grupo, children }: { grupo: string; children: React.ReactNode }) {
  const claves = useRef(new Set<string>());
  const registrar = (k: string) => {
    claves.current.add(k);
    return () => {
      claves.current.delete(k);
    };
  };
  const aplicarATodas = (abierto: boolean) => claves.current.forEach((k) => guardar(k, abierto));

  return (
    <ContextoGrupo.Provider value={{ grupo, registrar }}>
      <div className="flex flex-col gap-6">
        <div className="flex justify-end gap-2" data-no-print>
          <button type="button" onClick={() => aplicarATodas(false)} className="flex items-center gap-1.5 rounded-md px-3 h-9" style={estiloBoton}>
            <ChevronsDownUp size={14} /> Contraer todo
          </button>
          <button type="button" onClick={() => aplicarATodas(true)} className="flex items-center gap-1.5 rounded-md px-3 h-9" style={estiloBoton}>
            <ChevronsUpDown size={14} /> Expandir todo
          </button>
        </div>
        {children}
      </div>
    </ContextoGrupo.Provider>
  );
}

export function SeccionColapsable({ id, titulo, children }: { id: string; titulo: React.ReactNode; children: React.ReactNode }) {
  const contexto = useContext(ContextoGrupo);
  const k = clave(contexto?.grupo ?? "general", id);
  const recordado = useSyncExternalStore(suscribir, () => leer(k), () => null);
  const abierto = recordado ?? true;

  const registrar = contexto?.registrar;
  useEffect(() => registrar?.(k), [registrar, k]);

  return (
    <section>
      <button
        type="button"
        onClick={() => guardar(k, !abierto)}
        aria-expanded={abierto}
        className="mb-3 flex w-full items-center gap-2 text-left"
        style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}
      >
        {abierto ? <ChevronDown size={18} color="var(--sidebar-text)" /> : <ChevronRight size={18} color="var(--sidebar-text)" />}
        {titulo}
      </button>
      {abierto && children}
    </section>
  );
}
