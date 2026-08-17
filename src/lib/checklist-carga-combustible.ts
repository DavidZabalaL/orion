// Catálogos estáticos para el checklist de Carga de Combustible.
// Agrega tus zonas, municipios, áreas y personal reales aquí.

export const ZONAS_CARGA = [
  "MICHOACÁN",
  "JALISCO",
  "GUERRERO",
  "ESTADO DE MÉXICO",
  "CIUDAD DE MÉXICO",
  "COLIMA",
  "GUANAJUATO",
  "QUERÉTARO",
  "AGUASCALIENTES",
  "SONORA",
  "SINALOA",
  "NAYARIT",
] as const;

export type ZonaCarga = (typeof ZONAS_CARGA)[number];

export const MUNICIPIOS_POR_ZONA: Record<ZonaCarga, string[]> = {
  "MICHOACÁN": [
    "Morelia",
    "Uruapan",
    "Zamora",
    "Lázaro Cárdenas",
    "Los Reyes",
    "Apatzingán",
    "Sahuayo",
    "Zitácuaro",
    "Pátzcuaro",
    "Tacámbaro",
    "La Piedad",
    "Jacona",
    "Jiquilpan",
    "Maravatío",
    "Múgica",
    "Coalcomán",
    "Huetamo",
  ],
  "JALISCO": [
    "Guadalajara",
    "Zapopan",
    "San Pedro Tlaquepaque",
    "Tonalá",
    "Tlajomulco de Zúñiga",
    "Puerto Vallarta",
    "Lagos de Moreno",
    "Tepatitlán de Morelos",
  ],
  "GUERRERO": [
    "Acapulco",
    "Chilpancingo",
    "Iguala",
    "Zihuatanejo",
    "Taxco",
    "Atoyac de Álvarez",
    "Arcelia",
  ],
  "ESTADO DE MÉXICO": [
    "Toluca",
    "Ecatepec",
    "Naucalpan",
    "Tlalnepantla",
    "Nezahualcóyotl",
    "Texcoco",
    "Lerma",
    "Tenancingo",
  ],
  "CIUDAD DE MÉXICO": [
    "Benito Juárez",
    "Coyoacán",
    "Tlalpan",
    "Iztapalapa",
    "Álvaro Obregón",
    "Miguel Hidalgo",
    "Cuauhtémoc",
    "Xochimilco",
  ],
  "COLIMA": ["Colima", "Manzanillo", "Tecomán", "Villa de Álvarez", "Armería"],
  "GUANAJUATO": ["Guanajuato", "León", "Irapuato", "Celaya", "Salamanca", "Silao", "San Miguel de Allende"],
  "QUERÉTARO": ["Querétaro", "San Juan del Río", "Corregidora", "El Marqués", "Pedro Escobedo"],
  "AGUASCALIENTES": ["Aguascalientes", "Jesús María", "San Francisco de los Romo", "Pabellón de Arteaga"],
  "SONORA": ["Hermosillo", "Nogales", "Ciudad Obregón", "Navojoa", "Guaymas", "San Luis Río Colorado"],
  "SINALOA": ["Culiacán", "Mazatlán", "Los Mochis", "Guasave", "Navolato"],
  "NAYARIT": ["Tepic", "Bahía de Banderas", "Santiago Ixcuintla", "Acaponeta"],
};

export const AREAS_CARGA = [
  "OPERACIONES",
  "ADMINISTRACIÓN",
  "MANTENIMIENTO",
  "LOGÍSTICA",
  "CAMPO",
  "SUPERVISIÓN",
  "DIRECCIÓN",
] as const;

export type AreaCarga = (typeof AREAS_CARGA)[number];

// Llena cada área con los nombres del personal correspondiente.
export const PERSONAL_POR_AREA: Record<AreaCarga, string[]> = {
  "OPERACIONES": [],
  "ADMINISTRACIÓN": [],
  "MANTENIMIENTO": [],
  "LOGÍSTICA": [],
  "CAMPO": [],
  "SUPERVISIÓN": [],
  "DIRECCIÓN": [],
};

export const TIPOS_LICENCIA_CARGA = ["Tipo A", "Tipo B", "Tipo C", "Tipo D", "Tipo E"] as const;

export const TIPOS_COMBUSTIBLE_CARGA = ["GASOLINA REGULAR", "GASOLINA PREMIUM", "DIÉSEL"] as const;

// Estructura de secciones para mostrar en la vista de detalle del checklist
export const SECCIONES_CARGA_COMBUSTIBLE = [
  {
    key: "generales",
    titulo: "Generales",
    campos: [
      { key: "fecha", label: "Fecha" },
      { key: "zona", label: "Zona" },
      { key: "municipio", label: "Municipio" },
      { key: "area", label: "Área" },
      { key: "responsable", label: "Responsable" },
      { key: "tipo_licencia", label: "Tipo de licencia" },
    ],
    fotos: [{ key: "foto_licencia", label: "Foto de licencia" }],
  },
  {
    key: "vehiculo",
    titulo: "Vehículo",
    campos: [
      { key: "tipo_vehiculo", label: "Tipo de vehículo" },
      { key: "numero_economico", label: "Número económico" },
      { key: "modelo", label: "Modelo" },
    ],
    fotos: [],
  },
  {
    key: "carga",
    titulo: "Carga de Combustible",
    campos: [
      { key: "tipo_combustible", label: "Tipo de combustible" },
      { key: "observaciones", label: "Observaciones" },
    ],
    fotos: [
      { key: "foto_odometro_antes", label: "Odómetro antes" },
      { key: "foto_odometro_despues", label: "Odómetro después" },
      { key: "foto_evidencia_bomba_1", label: "Evidencia bomba 1" },
      { key: "foto_evidencia_bomba_2", label: "Evidencia bomba 2" },
      { key: "foto_ticket", label: "Ticket" },
    ],
    firma: { key: "firma_responsable", label: "Firma del responsable" },
  },
] as const;
