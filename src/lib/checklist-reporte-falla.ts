// Catálogos y configuración de despliegue para el checklist "Reporte de falla
// de vehículo" — calcado del formulario de Google Forms ya usado en campo,
// sobre el mismo patrón declarativo de checklist-carga-combustible.ts.

export const DEPARTAMENTOS_FALLA = [
  "OPERACIONES",
  "INFRAESTRUCTURA",
  "REDES WAN",
  "TI",
  "ADMINISTRATIVO",
  "CAPACITACIÓN",
  "SISTEMAS",
  "PMO",
  "PM",
] as const;

export type DepartamentoFalla = (typeof DEPARTAMENTOS_FALLA)[number];

export const TIPOS_FALLA = [
  "MECÁNICA",
  "ELÉCTRICA",
  "NEUMÁTICOS",
  "FRENOS",
  "MOTOR",
  "DAÑO POR CHOQUE",
  "AIRE ACONDICIONADO",
] as const;

export type TipoFalla = (typeof TIPOS_FALLA)[number];

export const MAX_FOTOS_REPORTE_FALLA = 5;

// Estructura de secciones para mostrar en la vista de detalle del checklist
// (mismo patrón que SECCIONES_CARGA_COMBUSTIBLE).
export const SECCIONES_REPORTE_FALLA = [
  {
    key: "reporte",
    titulo: "Reporte de falla",
    campos: [
      { key: "kilometraje", label: "Kilometraje actual" },
      { key: "nombre_conductor", label: "Nombre de conductor" },
      { key: "departamento", label: "Departamento" },
      { key: "tipo_falla", label: "Tipo de falla" },
      { key: "descripcion_falla", label: "Descripción de falla" },
      { key: "observaciones", label: "Observaciones adicionales" },
    ],
    fotos: [1, 2, 3, 4, 5].map((n) => ({ key: `foto_${n}`, label: `Foto ${n}` })),
  },
] as const;
