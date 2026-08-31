"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ExportableType = "kpi" | "chart";

export interface ExportableItem {
  id: string;
  type: ExportableType;
  title: string;
  value?: string | number;
  /** Solo para type 'chart' — el contenedor a rasterizar para el PDF. */
  domRef?: React.RefObject<HTMLElement | null>;
}

interface ExportRegistryContextValue {
  items: ExportableItem[];
  register: (item: ExportableItem) => void;
  unregister: (id: string) => void;
}

const ExportRegistryContext = createContext<ExportRegistryContextValue | null>(null);

/**
 * Registro de "elementos exportables" del dashboard, para el botón "Exportar
 * resumen ejecutivo" (ver ExportSummaryModal). Como en cada momento solo se
 * renderiza la pestaña activa, lo que queda registrado siempre corresponde
 * al contenido visible — no hace falta llevar la cuenta de a qué pestaña
 * pertenece cada elemento.
 */
export function ExportRegistryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ExportableItem[]>([]);

  const register = useCallback((item: ExportableItem) => {
    setItems((prev) => [...prev.filter((it) => it.id !== item.id), item]);
  }, []);

  const unregister = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  // Memoizado: sin esto, cada render del provider crea un objeto nuevo, lo
  // que hace que el efecto de useRegisterExportable (que depende de `ctx`)
  // se re-dispare en cada registro — un loop infinito de re-render.
  const value = useMemo(() => ({ items, register, unregister }), [items, register, unregister]);

  return <ExportRegistryContext.Provider value={value}>{children}</ExportRegistryContext.Provider>;
}

export function useExportRegistry() {
  const ctx = useContext(ExportRegistryContext);
  if (!ctx) throw new Error("useExportRegistry debe usarse dentro de <ExportRegistryProvider>");
  return ctx;
}

/** Registra un elemento mientras el componente que lo llama está montado. */
export function useRegisterExportable(item: ExportableItem | null) {
  const ctx = useContext(ExportRegistryContext);
  const register = ctx?.register;
  const unregister = ctx?.unregister;
  useEffect(() => {
    if (!register || !unregister || !item) return;
    register(item);
    return () => unregister(item.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register, unregister, item?.id, item?.title, item?.value]);
}
