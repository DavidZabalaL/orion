import type { LucideIcon } from "lucide-react";
import {
  Car,
  ClipboardCheck,
  FilePlus2,
  Wrench,
  Fuel,
  Ticket,
  ShieldCheck,
  MapPin,
  Satellite,
  FolderKanban,
  ClipboardList,
  BarChart3,
  Users,
  IdCard,
} from "lucide-react";

export type Modulo = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  descripcion: string;
};

export const MODULOS: Modulo[] = [
  { id: "A", label: "Inventario de Unidades", href: "/unidades", icon: Car, descripcion: "Ficha única por número económico con vista consolidada" },
  { id: "A.1", label: "Checklist diario", href: "/checklist", icon: ClipboardCheck, descripcion: "Inspección diaria con campo de odómetro" },
  { id: "B", label: "Alta / Baja", href: "/altas-bajas", icon: FilePlus2, descripcion: "Ciclo de vida de unidades" },
  { id: "C", label: "Mantenimiento y Gastos", href: "/mantenimiento", icon: Wrench, descripcion: "12 categorías de gasto vehicular" },
  { id: "D", label: "Combustible", href: "/combustible", icon: Fuel, descripcion: "Consumo, rendimiento y anomalías" },
  { id: "E", label: "TAG / Peajes", href: "/tag", icon: Ticket, descripcion: "Gasto de casetas y conciliación con GPS" },
  { id: "F", label: "Seguros + Coberturas", href: "/seguros", icon: ShieldCheck, descripcion: "Vigencias, vencimientos y coberturas" },
  { id: "G", label: "Geolocalización", href: "/mapa", icon: MapPin, descripcion: "Posición, historial y geocercas (IntelliHub)" },
  { id: "G.1", label: "Integridad de datos GPS", href: "/mapa/integridad", icon: Satellite, descripcion: "Filtro de lecturas imposibles y validación de km" },
  { id: "H", label: "Proyectos y multi-estado", href: "/proyectos", icon: FolderKanban, descripcion: "Estructura de proyectos y presupuesto semanal" },
  { id: "I", label: "Auditoría diaria y calidad", href: "/auditoria", icon: ClipboardList, descripcion: "Conciliación PTTO / REAL / CV" },
  { id: "J", label: "Reportes", href: "/reportes", icon: BarChart3, descripcion: "Dashboard ejecutivo y generador configurable" },
  { id: "K", label: "Usuarios y roles", href: "/usuarios", icon: Users, descripcion: "Permisos granulares rol × proyecto × módulo × acción" },
  { id: "L", label: "Gestión de Operadores", href: "/operadores", icon: IdCard, descripcion: "Expediente digital y alertas de vencimiento" },
];
