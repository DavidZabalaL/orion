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
  LayoutDashboard,
  Package,
  Siren,
  AlertOctagon,
  KeyRound,
} from "lucide-react";

export type Grupo = "Flota" | "Operación y gasto" | "Geo" | "Gestión" | "Rescate y campo" | "Mi turno";

export const GRUPOS: Grupo[] = ["Mi turno", "Flota", "Operación y gasto", "Rescate y campo", "Geo", "Gestión"];

export type Modulo = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  descripcion: string;
  grupo: Grupo;
};

export const MODULOS: Modulo[] = [
  { id: "O", label: "Mi Turno", href: "/operador/turno", icon: KeyRound, descripcion: "Selección de unidad y bitácora diaria de uso para operadores; el Administrador consulta aquí el historial de todos", grupo: "Mi turno" },
  { id: "A", label: "Inventario de Unidades", href: "/unidades", icon: Car, descripcion: "Ficha única por número económico con vista consolidada", grupo: "Flota" },
  { id: "A.1", label: "Checklist", href: "/checklist", icon: ClipboardCheck, descripcion: "Inspección diaria (odómetro) y semanal (59 puntos)", grupo: "Flota" },
  { id: "B", label: "Alta / Baja", href: "/altas-bajas", icon: FilePlus2, descripcion: "Ciclo de vida de unidades", grupo: "Flota" },
  { id: "C", label: "Mantenimiento y Gastos", href: "/mantenimiento", icon: Wrench, descripcion: "12 categorías de gasto vehicular", grupo: "Operación y gasto" },
  { id: "D", label: "Combustible", href: "/combustible", icon: Fuel, descripcion: "Consumo, rendimiento y anomalías", grupo: "Operación y gasto" },
  { id: "E", label: "TAG / Peajes", href: "/tag", icon: Ticket, descripcion: "Gasto de casetas por unidad", grupo: "Operación y gasto" },
  { id: "F", label: "Seguros + Coberturas", href: "/seguros", icon: ShieldCheck, descripcion: "Vigencias, vencimientos y coberturas", grupo: "Operación y gasto" },
  { id: "G", label: "Geolocalización", href: "/mapa", icon: MapPin, descripcion: "Posición, historial y geocercas (IntelliHub)", grupo: "Geo" },
  { id: "G.1", label: "Integridad de datos GPS", href: "/mapa/integridad", icon: Satellite, descripcion: "Filtro de lecturas imposibles y validación de km", grupo: "Geo" },
  { id: "H", label: "Proyectos", href: "/proyectos", icon: FolderKanban, descripcion: "Estructura de proyectos y presupuesto semanal", grupo: "Gestión" },
  { id: "I", label: "Bitácora de movimientos", href: "/auditoria", icon: ClipboardList, descripcion: "Consulta cualquier movimiento de unidades, proyectos y operadores", grupo: "Gestión" },
  { id: "J", label: "Reportes", href: "/reportes", icon: BarChart3, descripcion: "Dashboard ejecutivo y generador configurable", grupo: "Gestión" },
  { id: "M", label: "Dashboards", href: "/dashboards", icon: LayoutDashboard, descripcion: "Dashboards guardados y explorador libre de BI (lenguaje natural, insights, forecast)", grupo: "Gestión" },
  { id: "L", label: "Gestión de Operadores", href: "/operadores", icon: IdCard, descripcion: "Expediente digital y alertas de vencimiento", grupo: "Gestión" },
  { id: "K", label: "Administración", href: "/usuarios", icon: Settings, descripcion: "Usuarios, roles, notificaciones y módulos por proyecto", grupo: "Gestión" },
  { id: "N", label: "Inventario de Insumos", href: "/inventario-insumos", icon: Package, descripcion: "Stock de aceite, anticongelante y consumibles por proyecto", grupo: "Gestión" },
  { id: "R", label: "Rescate de Unidades", href: "/rescate", icon: Siren, descripcion: "Tickets de rescate en campo con folio RSC-AAAA-######", grupo: "Rescate y campo" },
  { id: "S", label: "Siniestros", href: "/siniestros", icon: AlertOctagon, descripcion: "Registro y seguimiento de siniestros vehiculares", grupo: "Rescate y campo" },
];
