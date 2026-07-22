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
  Settings,
  IdCard,
} from "lucide-react";

export type Grupo = "Flota" | "Operación y gasto" | "Geo" | "Gestión";

export const GRUPOS: Grupo[] = ["Flota", "Operación y gasto", "Geo", "Gestión"];

export type Modulo = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  descripcion: string;
  grupo: Grupo;
};

export const MODULOS: Modulo[] = [
  { id: "A", label: "Inventario de Unidades", href: "/unidades", icon: Car, descripcion: "Ficha única por número económico con vista consolidada", grupo: "Flota" },
  { id: "A.1", label: "Checklist diario", href: "/checklist", icon: ClipboardCheck, descripcion: "Inspección diaria con campo de odómetro", grupo: "Flota" },
  { id: "B", label: "Alta / Baja", href: "/altas-bajas", icon: FilePlus2, descripcion: "Ciclo de vida de unidades", grupo: "Flota" },
  { id: "C", label: "Mantenimiento y Gastos", href: "/mantenimiento", icon: Wrench, descripcion: "12 categorías de gasto vehicular", grupo: "Operación y gasto" },
  { id: "D", label: "Combustible", href: "/combustible", icon: Fuel, descripcion: "Consumo, rendimiento y anomalías", grupo: "Operación y gasto" },
  { id: "E", label: "TAG / Peajes", href: "/tag", icon: Ticket, descripcion: "Gasto de casetas y conciliación con GPS", grupo: "Operación y gasto" },
  { id: "F", label: "Seguros + Coberturas", href: "/seguros", icon: ShieldCheck, descripcion: "Vigencias, vencimientos y coberturas", grupo: "Operación y gasto" },
  { id: "G", label: "Geolocalización", href: "/mapa", icon: MapPin, descripcion: "Posición, historial y geocercas (IntelliHub)", grupo: "Geo" },
  { id: "G.1", label: "Integridad de datos GPS", href: "/mapa/integridad", icon: Satellite, descripcion: "Filtro de lecturas imposibles y validación de km", grupo: "Geo" },
  { id: "H", label: "Proyectos y multi-estado", href: "/proyectos", icon: FolderKanban, descripcion: "Estructura de proyectos y presupuesto semanal", grupo: "Gestión" },
  { id: "I", label: "Auditoría diaria y calidad", href: "/auditoria", icon: ClipboardList, descripcion: "Conciliación PTTO / REAL / CV", grupo: "Gestión" },
  { id: "J", label: "Reportes", href: "/reportes", icon: BarChart3, descripcion: "Dashboard ejecutivo y generador configurable", grupo: "Gestión" },
  { id: "L", label: "Gestión de Operadores", href: "/operadores", icon: IdCard, descripcion: "Expediente digital y alertas de vencimiento", grupo: "Gestión" },
  { id: "K", label: "Administración", href: "/usuarios", icon: Settings, descripcion: "Usuarios, roles, notificaciones y módulos por proyecto", grupo: "Gestión" },
];
