# Plataforma de Control Vehicular — Grupo Kabat
## Especificación completa para desarrollo y diseño
### Versión definitiva · Julio 2026

---

# PARTE 1 — VISIÓN GENERAL

## 1.1 Qué es
Sistema web (responsive/mobile-first) que sustituye un libro de Excel de 34 hojas con el que el área de Control Vehicular de Grupo Kabat administra 116 unidades en 5+ estados de la República.

## 1.2 Para quién
- **Control Vehicular:** operación diaria, auditoría, captura.
- **Coordinadores de proyecto:** consulta y reporte de su proyecto.
- **Dirección:** visión consolidada.
- **Administrador del sistema:** configuración de usuarios, roles y permisos.
- **Operadores en campo:** checklist diario desde el celular.

## 1.3 Stack tecnológico
- **Frontend + Backend:** Next.js sobre Vercel. Responsive desde el diseño (mobile-first).
- **Base de datos:** PostgreSQL con Prisma como ORM + PostGIS para geocercas.
- **Almacenamiento de archivos:** Vercel Blob o S3 (evidencias, pólizas, documentos de operadores).
- **Autenticación:** control por rol × proyecto × módulo × acción.
- **Alertas:** correo electrónico (más adelante se podrán integrar canales adicionales).
- **Datos geoespaciales:** PostGIS para geocercas y consultas punto-en-polígono.

## 1.4 Principios de diseño de producto
1. **Número económico como llave universal.** Identifica la unidad en todos los módulos. Siempre en tipografía monoespaciada (JetBrains Mono), prominente.
2. **Baja lógica, nunca eliminación.** Toda baja conserva íntegramente el historial.
3. **Formato normalizado del número económico.** Mayúsculas, con guion, sin espacios (el Excel tiene inconsistencias que se corrigen en la migración).
4. **Proyecto y estatus operativo son campos separados.** En el Excel, "DIRECCION", "CONSIGNACION" y "BAJA" aparecen mezclados como proyecto; en la plataforma son estatus.
5. **Alertas antes que reportes.** Vencimientos y anomalías se notifican de forma proactiva.
6. **Auditoría como flujo de trabajo diario.** Las columnas PTTO / REAL / Control Vehicular / DIFERENCIA del Excel se convierten en pantalla de trabajo.
7. **No reemplazar IntelliHub.** Se consume posición y kilometraje vía integración.
8. **Permisos granulares.** rol × proyecto × módulo × acción. Un proyecto puede tener módulos activados/desactivados.
9. **Responsive obligatorio.** Especialmente el checklist diario y la consulta de coberturas de seguro.

---

# PARTE 2 — DESIGN SYSTEM (K1 v2)

Tomado de https://design.kabatone.app/ y adaptado para Next.js/React.

## 2.1 Tokens CSS completos

```css
@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  /* ─── FONTS ─── */
  --font: 'Public Sans', sans-serif;
  --font-ui: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* ─── SPACING (4px grid) ─── */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 24px;
  --space-8: 32px; --space-10: 40px; --space-12: 48px;

  /* ─── TYPOGRAPHY SCALE ─── */
  --text-xs: 11px;   --text-sm: 12px;   --text-base: 13px;
  --text-md: 14px;   --text-lg: 16px;   --text-xl: 20px;
  --text-2xl: 24px;  --text-3xl: 30px;

  /* ─── FONT WEIGHTS ─── */
  --fw-regular: 400; --fw-medium: 500; --fw-semibold: 600;
  --fw-bold: 700;    --fw-extrabold: 800;

  /* ─── HEIGHTS ─── */
  --h-sm: 32px; --h-md: 36px; --h-lg: 40px; --h-xl: 48px;

  /* ─── RADIUS ─── */
  --radius-sm: 4px;  --radius-md: 8px;
  --radius-lg: 12px; --radius-xl: 16px; --radius-full: 9999px;

  /* ─── SEMANTIC COLORS ─── */
  --color-primary: #2b7fff;
  --color-success: #01c17b;
  --color-warning: #ffc229;
  --color-error: #fca5a5;
  --color-info: #4d7cfe;

  /* ─── SURFACES (dark mode default) ─── */
  --color-bg: #040d19;
  --color-surface-2: #111827;
  --color-surface-3: #071426;

  /* ─── BRAND PALETTE ─── */
  --brand-blue: #2b7fff;
  --brand-navy: #0f4c86;
  --brand-violet: #7c3aed;
  --brand-orange: #f97316;
  --brand-rose: #e11d67;

  /* ─── STATUS COLORS ─── */
  --color-status-nuevo: #00b4d8;
  --color-status-revision: #f59e0b;
  --color-status-asignado: #4d7cfe;
  --color-status-escena: #ff5263;
  --color-status-cerrado: #00d492;
  --status-nuevo-bg: rgba(0,180,216,0.12);
  --status-revision-bg: rgba(245,158,11,0.12);
  --status-asignado-bg: rgba(77,124,254,0.12);
  --status-escena-bg: rgba(255,82,99,0.12);
  --status-cerrado-bg: rgba(0,212,146,0.12);

  /* ─── PRIORITY ─── */
  --priority-alta: #fb2c36;
  --priority-media: #f59e0b;
  --priority-baja: #4d7cfe;
  --priority-alta-bg: rgba(251,44,54,0.10);
  --priority-media-bg: rgba(245,158,11,0.10);
  --priority-baja-bg: rgba(77,124,254,0.10);

  /* ─── RESOURCE STATUS ─── */
  --resource-disponible: #00d492;
  --resource-en-camino: #f59e0b;
  --resource-en-escena: #ff5263;

  /* ─── FIELD TOKENS ─── */
  --field-bg: #1a2235;
  --field-border: #0b213f;
  --field-text: rgba(255,255,255,0.87);

  /* ─── SHADOWS ─── */
  --shadow-sm: 0px 1px 3px rgba(0,0,0,0.12), 0px 1px 1px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.02);
  --shadow-md: 0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px rgba(0,0,0,0.14), 0px 1px 10px rgba(0,0,0,0.12);
  --shadow-lg: 0px 11px 15px -7px rgba(0,0,0,0.2), 0px 24px 38px 3px rgba(0,0,0,0.14), 0px 9px 46px 8px rgba(0,0,0,0.12);
  --shadow-panel: 0px 8px 32px rgba(0,40,120,0.12);

  /* ─── SIDEBAR ─── */
  --sidebar-bg: #060d1a;
  --sidebar-item-hover: #111827;
  --sidebar-item-active: rgba(43,127,255,0.12);
  --sidebar-text: #99a1af;
  --sidebar-text-active: #e8edf5;

  /* ─── HEADER ─── */
  --header-bg: #060d1a;
  --header-border: rgba(43,127,255,0.10);
  --header-height: 64px;

  /* ─── PANEL / OVERLAY ─── */
  --panel-bg: #111827;
  --panel-header-bg: #202e4b;
  --overlay-bg: rgba(6,13,26,0.92);
  --chip: rgba(255,255,255,0.07);

  /* ─── KANBAN / BOARD ─── */
  --kanban-bg: #080f1c;
  --kanban-col: rgba(255,255,255,0.03);
  --card-active: #1b2e4a;
  --card-hover: #162540;
  --row-bg: #111e35;
  --row-hover: #172240;
  --detail-bg: #0c1928;
}
```

## 2.2 Tipografía
| Rol | Fuente | Token | Uso |
|-----|--------|-------|-----|
| UI primaria | Public Sans | `var(--font)` | Todo elemento de interfaz |
| Datos / etiquetas | Inter | `var(--font-ui)` | Encabezados de tabla, etiquetas densas, badges |
| Código / IDs | JetBrains Mono | `var(--font-mono)` | Números económicos, placas, VIN, tokens |

**Escala tipográfica (Public Sans):**

| Token | Tamaño | Line-height | Peso | Uso |
|-------|--------|-------------|------|-----|
| --text-3xl | 30px | 40px | 800 | Títulos hero / emergencia |
| --text-2xl | 24px | 32px | 700 | Títulos de vista |
| --text-xl | 20px | 28px | 700 | Encabezados de panel |
| --text-lg | 16px | 24px | 600 | Encabezados de sección |
| --text-md | 14px | 20px | 400 | Texto de cuerpo / descripciones |
| --text-base | 13px | 20px | 400 | Default UI: inputs, tablas, tarjetas |
| --text-sm | 12px | 18px | 400 | Captions, timestamps, help text |
| --text-xs | 11px | 16px | 600 | Etiquetas, badges, meta |

## 2.3 Mapeo de status del design system a la plataforma vehicular
| Token K1 | Color | Uso en plataforma vehicular |
|----------|-------|-----------------------------|
| --color-status-nuevo | #00b4d8 | Activo / Disponible |
| --color-status-revision | #f59e0b | En revisión / Por vencer (seguro, licencia, mantenimiento) |
| --color-status-asignado | #4d7cfe | Asignado / En ruta |
| --color-status-escena | #ff5263 | Urgente / Vencido / Dato GPS imposible |
| --color-status-cerrado | #00d492 | Completado / Conciliado |
| --resource-disponible | #00d492 | Unidad disponible |
| --resource-en-camino | #f59e0b | En consignación / En traslado |
| --resource-en-escena | #ff5263 | En taller / No disponible |

---

# PARTE 3 — ESPECIFICACIÓN FUNCIONAL

## 3.0 Mapa de módulos

| # | Módulo | Qué resuelve |
|---|--------|-------------|
| A | Inventario de Unidades | Ficha única por número económico con vista consolidada |
| A.1 | Checklist diario | Inspección diaria migrada de Fast Field, con campo de odómetro |
| B | Ciclo de vida (alta / baja) | Alta con campos obligatorios; baja lógica con historial preservado |
| C | Mantenimiento y Gastos Vehiculares | 12 categorías + campos administrativos (SC, ODC, SAP, ciclo de fechas) |
| D | Combustible | Consumo, rendimiento, anomalías; importador agnóstico de proveedor |
| E | TAG / Peajes | Gasto de casetas y conciliación cruzada con GPS |
| F | Seguros + Coberturas | Vigencias, vencimientos, renovaciones + desglose de coberturas con suma asegurada y deducible |
| G | Geolocalización (IntelliHub) | Posición, historial, geocercas, alertas de velocidad y ralentí |
| G.1 | Integridad de datos GPS | Filtro de lecturas imposibles, detección de GPS apagado, kilometraje validado |
| H | Proyectos y multi-estado | Estructura de proyectos y estados; presupuesto semanal (bolsa) |
| I | Auditoría diaria y calidad | Conciliación diaria PTTO / REAL / CV y bitácora en intranet |
| J | Reportes | Dashboard ejecutivo + generador configurable con envío programado por correo |
| K | Usuarios y roles | Permisos granulares: rol × proyecto × módulo × acción |
| L | Gestión de Operadores | Expediente digital, documentación con vigencia, alertas de vencimiento |

## 3.1 Módulo A — Inventario de Unidades
**Usuarios:** Control Vehicular (todo); coordinadores (su proyecto); Dirección (lectura)

Ficha central de cada unidad, identificada por número económico, con acceso directo a todos los módulos vinculados.

### Pantallas
| Pantalla | Campos clave | Acciones |
|----------|-------------|----------|
| Listado de Unidades | N° económico, placas, tipo, marca/unidad, proyecto, estatus, disponibilidad, días sin operar, resguardante vigente | Buscar, filtrar por proyecto/estado/tipo/estatus, exportar, Dar de alta |
| Ficha de Unidad | Datos generales (con resguardante e historial) + pestañas: Mantenimiento, Combustible, TAG, Seguro (con coberturas), GPS, Checklist, Operador | Editar, reasignar proyecto, Dar de baja, imprimir |

### Reglas y alertas
- El listado se filtra por estatus: activas, en consignación, en dirección, bajas.
- Alerta si una unidad "disponible" no reporta GPS en más de 48h.
- La ficha muestra KPIs: rendimiento km/L, próximo mantenimiento, vencimiento de seguro, tenencia, verificación.
- Al hacer clic en el resguardante, se abre el expediente del operador (Módulo L).

## 3.2 Sub-módulo A.1 — Checklist diario
**Usuarios:** Operadores en campo (captura desde celular); Control Vehicular (consulta)

Sustituye el formulario que hoy vive en Fast Field. Se captura dentro de la plataforma, ligado al número económico.

### Pantallas
| Pantalla | Campos clave | Acciones |
|----------|-------------|----------|
| Formulario de checklist | N° económico (preseleccionado desde Ficha), lectura de odómetro (obligatorio), puntos de inspección configurables por proyecto, evidencia fotográfica, firma del responsable | Guardar, adjuntar foto, enviar |
| Historial de checklists por unidad | Línea de tiempo de inspecciones, filtrable por fecha y punto | Filtrar, exportar, ver detalle |

### Reglas
- La lectura de odómetro alimenta la triangulación de km (G.1).
- Alerta si a cierta hora no se ha capturado el checklist de una unidad activa.
- Los puntos de inspección son configurables por proyecto (no hardcodeados).

## 3.3 Módulo B — Ciclo de vida (alta / baja)
**Usuarios:** Control Vehicular; Administrador (reactivación)

### B.1 Alta de unidad
Formulario guiado con campos obligatorios organizados por bloque:

| Bloque | Campo | Obligatorio | Validación |
|--------|-------|-------------|------------|
| Identificación | Número económico | Sí | Formato normalizado (MAYÚSCULAS-GUION); único |
| Identificación | Placas | Sí | Único; sin espacios |
| Identificación | Número de serie (VIN) | Sí | 17 caracteres alfanuméricos; único |
| Vehículo | Marca | Sí | Catálogo |
| Vehículo | Unidad / modelo comercial | Sí | — |
| Vehículo | Año | Sí | Entero de 4 dígitos |
| Vehículo | Tipo | Sí | Auto / Camioneta / Grúa / Moto / Otro |
| Vehículo | Tipo de combustible | Sí | Gasolina / Diésel / Eléctrico / Híbrido |
| Vehículo | Rendimiento promedio km/L | No | Numérico; se llena con datos reales |
| Asignación | Proyecto | Sí | Catálogo de proyectos activos |
| Asignación | Estado de operación | Sí | Catálogo de estados de la república |
| Asignación | Estatus operativo | Sí | Activo / Consignación / Dirección (defecto: Activo) |
| Asignación | Responsable de resguardo | Sí | Referencia a Operador (Módulo L) |
| Documentación | Tag IAVE (número) | No | Se puede agregar después |
| Documentación | Origen de placa | Sí | Catálogo de estados |
| Documentación | Propietario | Sí | SYM / 5 STAR SYSTEM / KABAT / Otro |
| Seguro | Aseguradora / póliza / vencimiento | Recomendado | Se puede capturar después en Módulo F |

- Validación en línea: advierte si N° económico, placas o VIN ya existen.
- La unidad recién dada de alta queda con estatus Activo y disponibilidad = 1.
- Si no se captura seguro, aparece aviso en el listado hasta que se registre.

### B.2 Baja de unidad (baja lógica)
| Campo | Obligatorio | Notas |
|-------|-------------|-------|
| Motivo de baja | Sí | Catálogo: Venta / Siniestro total / Fin de vida útil / Devolución / Consignación cerrada / Otro |
| Fecha efectiva | Sí | No puede ser anterior al último registro de gasto |
| Comentario | No | Texto libre |
| Documento soporte | No | Archivo (factura, siniestro, etc.) |

- Confirmación en dos pasos.
- Estatus → Baja, disponibilidad → 0, se cierra asignación de proyecto.
- Todos los historiales se conservan íntegramente. Consultable con filtro "Estatus: Baja".
- No se puede editar información general de una unidad en baja (solo agregar comentarios).

### B.3 Reactivación
Solo Administrador. Motivo obligatorio. Registrado en Bitácora.

## 3.4 Módulo C — Mantenimiento y Gastos Vehiculares
**Usuarios:** Control Vehicular; coordinadores (su proyecto)

Unifica mantenimiento y todos los gastos administrativos de la unidad.

### 12 categorías de gasto
Mant. preventivo · Mant. correctivo · Llantas · Refacciones · Consumibles · Tenencia · Verificación · Emplacamiento · Estacionamiento · Multas · Renta de vehículos · Casetas

### Campos administrativos (adoptados de la bitácora actual "B Manto T")
SC (Solicitud de compra) · ODC (Orden de compra) · Entrada SAP · Fechas: requisición → ODC → factura → entrega CxP → pago

### Pantallas
| Pantalla | Campos clave | Acciones |
|----------|-------------|----------|
| Calendario / Pendientes | Próximos vencimientos por km o fecha, por unidad y proyecto | Programar, marcar realizado, posponer |
| Ficha de Orden | N° económico, categoría, descripción, costo, taller/proveedor, km, evidencia, campos administrativos | Guardar, adjuntar evidencia, cerrar, cancelar |
| Historial por Unidad | Línea de tiempo por categoría y rango de fechas | Filtrar, exportar |
| Reporte por Categoría | Gasto acumulado por categoría, unidad o proyecto | Filtrar, exportar |

### Alertas
- 15 y 5 días antes de vencimiento de mantenimiento, tenencia, verificación o renta.
- Al acercarse al km umbral (km validado por G.1, no crudo de GPS).
- Toda orden con importe requiere evidencia antes de cerrarse.

## 3.5 Módulo D — Combustible
**Usuarios:** Control Vehicular; coordinadores

Diseño agnóstico de proveedor: hoy se usa Efectivale, pero acepta cualquier formato vía mapeo de columnas configurable.

### Pantallas
| Pantalla | Campos clave | Acciones |
|----------|-------------|----------|
| Carga de Transacciones | Origen (archivo/API/manual), N° económico, fecha, litros, costo, km, estación | Importar, sincronizar, capturar, validar duplicados |
| Configuración de Proveedor | Nombre, mapeo de columnas del archivo, formato de fecha | Crear proveedor, editar mapeo, probar con muestra |
| Rendimiento por Unidad | Histórico km/L vs promedio de la unidad y su tipo | Marcar anomalía, comentar, exportar |
| Mapeo Tarjeta → Económico | Tarjeta, placa asociada, N° económico, vigencia | Editar, importar catálogo |
| Gasto por Proyecto | Acumulado por proyecto y periodo | Filtrar, exportar |

### Alertas
- Rendimiento km/L cae más de un umbral configurable.
- Transacciones sin mapeo a económico: bandeja "Pendientes de asignar".

## 3.6 Módulo E — TAG / Peajes
**Usuarios:** Control Vehicular; coordinadores

### Pantallas
| Pantalla | Campos clave | Acciones |
|----------|-------------|----------|
| Carga de Estados de Cuenta | Proveedor (IAVE/PASE/Televía), archivo, N° económico, fecha, monto, caseta | Importar, mapear columnas, validar duplicados |
| Conciliación TAG | Transacción vs. reporte del proyecto, por N° económico. Cruce automático TAG + GPS. | Conciliar, marcar discrepancia, comentar |
| Gasto por Unidad / Proyecto | Acumulado, filtrable | Filtrar, exportar |

- Transacciones sin económico: bandeja "pendiente".
- Discrepancias alimentan Módulo I.
- Cruce automático: si la hora del cruce de caseta coincide con la ubicación GPS, se valida sin intervención.

## 3.7 Módulo F — Seguros + Coberturas
**Usuarios:** Control Vehicular

### Pantallas
| Pantalla | Campos clave | Acciones |
|----------|-------------|----------|
| Listado de Pólizas | N° económico, aseguradora, póliza, vigencia, estatus | Filtrar, exportar |
| Ficha de Póliza | Aseguradora, N° póliza, fechas, costo, documento adjunto + **tabla de coberturas** (tipo, suma asegurada, deducible, condiciones) | Renovar, adjuntar, marcar vencida, agregar coberturas |
| Tarjeta de Seguro (PDF) | Datos de póliza + coberturas en formato imprimible | Exportar PDF, enviar por correo |

### Coberturas (catálogo configurable)
RC daños a terceros · Daños materiales · Robo total · Robo parcial · Gastos médicos ocupantes · Asistencia vial/grúa · RC personas · Cobertura legal · Pérdida total · Extensión RC (gobierno) · Especiales

### Dónde se ven las coberturas
En la **Ficha de Unidad (Módulo A)**, pestaña Seguro: datos de póliza arriba + tabla de coberturas abajo. Consultable desde celular en campo.

### Alertas
- 30 y 7 días antes del vencimiento de la póliza.
- Unidades sin póliza vigente: aviso visual en Inventario.

## 3.8 Módulo G — Geolocalización (IntelliHub)
**Usuarios:** Control Vehicular; coordinadores (su proyecto)

Consume datos de IntelliHub vía API/webhook (pendiente de confirmación).

### Pantallas base
| Pantalla | Campos clave | Acciones |
|----------|-------------|----------|
| Mapa en Tiempo Real | Posición, velocidad, última actualización; filtro por proyecto/estado | Filtrar, centrar en unidad, abrir ficha |
| Historial de Recorrido | Ruta por rango de fechas, distancia acumulada (km validados) | Seleccionar unidad y rango, exportar |

### Funcionalidades avanzadas (condicionadas a API de IntelliHub)

| Funcionalidad | Dato requerido de IntelliHub |
|---------------|------------------------------|
| Geocercas configurables | Posición en tiempo real |
| Reporte diario de ubicación nocturna | Posición bajo demanda |
| Alerta de exceso de velocidad | Velocidad en tiempo real |
| Alerta de ralentí prolongado | Estado del motor + velocidad |
| Historial de entradas/salidas de instalaciones | Posición continua o eventos de geocerca |
| Zona de trabajo autorizada por unidad | Posición continua |
| Alerta por uso fuera de horario | Posición + encendido |
| Alerta de permanencia fuera de inmueble después de hora límite | Posición + geocerca |

**Pendiente de Legal:** comparar ubicación GPS con domicilio del colaborador.

## 3.9 Sub-módulo G.1 — Integridad de datos GPS
Resuelve el problema real de lecturas fantasma de IntelliHub (saltos intercontinentales por GPS apagado o manipulado).

### Capa 1 — Filtro de datos imposibles (automático, antes de guardar)
- **Velocidad máxima física:** si entre dos puntos la velocidad implícita supera 180 km/h (configurable por tipo), el punto se marca como anómalo y se excluye de km_validado.
- **Geocerca país:** si un punto cae fuera de México, se descarta.
- **Salto de distancia:** si entre dos lecturas la unidad "se movió" más de X km sin puntos intermedios → salto sospechoso.
- Los puntos anómalos se conservan para auditoría pero se excluyen del kilometraje oficial.

### Capa 2 — Detección de GPS apagado o manipulado
- **Alerta de señal perdida:** si la unidad deja de transmitir por más de X minutos (configurable, p.ej. 15 min en ruta), alerta por correo con última ubicación.
- **Registro de huecos:** cada interrupción se registra con última posición, duración, primera posición al reconectar, y distancia del salto.
- **Patrones de apagado:** si el GPS se apaga consistentemente en los mismos horarios o zonas → patrón recurrente para investigar.

### Capa 3 — Respaldo de kilometraje independiente del GPS
- **Odómetro en checklist diario** (A.1): respaldo principal.
- **Odómetro en carga de combustible** (D): punto de validación adicional.
- **Triangulación automática:** compara GPS validado vs. odómetro checklist vs. odómetro combustible. Discrepancia > ±5% → alerta.
- **Kilometraje oficial:** campo maestro en Unidad que toma GPS validado por defecto, pero Control Vehicular puede corregirlo manualmente con registro en Bitácora.

**Dos campos en Posición GPS:** `km_reportado` (crudo de IntelliHub) y `km_validado` (procesado por el filtro). Solo `km_validado` alimenta Mantenimiento y Combustible.

## 3.10 Módulo H — Proyectos y multi-estado
**Usuarios:** Control Vehicular; Dirección (lectura consolidada)

### Pantallas
| Pantalla | Campos clave | Acciones |
|----------|-------------|----------|
| Listado de Proyectos | Nombre, estado, coordinador, unidades, estatus | Buscar, filtrar, dar alta |
| Ficha de Proyecto | Unidades, gasto acumulado, disponibilidad | Asignar/quitar unidades, exportar |
| Presupuesto semanal (bolsa) | Saldo disponible vs. gasto acumulado, desglose por unidad | Redistribuir, exportar |

- Una unidad activa en un solo proyecto a la vez.
- Reasignar cierra el periodo anterior en el historial.

## 3.11 Módulo I — Auditoría diaria y calidad
**Usuarios:** Control Vehicular (rol de auditor)

### Pantallas
| Pantalla | Campos clave | Acciones |
|----------|-------------|----------|
| Panel de Conciliación Diaria | Por N° económico: PTTO / REAL / CV / DIFERENCIA. Discrepancias resaltadas. | Validar, marcar discrepancia, escalar |
| Bitácora de Auditoría | Historial: fecha, revisor, hallazgo, resolución — en intranet | Consultar, exportar, filtrar |
| Checklist de Actualización Diaria | Estatus de captura del día por módulo | Marcar completado, enviar recordatorio |

- Discrepancias con fecha y responsable; monto original no se puede editar.
- Recordatorio automático si una unidad activa no tiene captura del día.

## 3.12 Módulo J — Reportes
**Usuarios:** Todos según permisos

### Pantallas
| Pantalla | Campos clave | Acciones |
|----------|-------------|----------|
| Dashboard Ejecutivo | KPIs: unidades disponibles/operación/baja, gasto por categoría, mantenimientos y seguros por vencer, presupuesto semanal, documentos de operadores por vencer | Filtrar, exportar |
| Generador de Reportes (builder) | Tipo, selección de campos, filtros, destinatarios de correo, hora y frecuencia de envío | Crear, programar, editar, probar |

- Cada usuario con permisos arma sus propios reportes, seleccionando campos de cualquier módulo al que tenga acceso.
- Programable: diario, semanal, mensual, a los destinatarios que elija.
- Incluye reporte nocturno de ubicación como plantilla predefinida.

## 3.13 Módulo K — Usuarios y roles
**Usuarios:** Administrador

### Pantallas
| Pantalla | Campos clave | Acciones |
|----------|-------------|----------|
| Listado de Usuarios | Nombre, correo, rol, proyectos asignados, estatus | Invitar, editar, desactivar |
| Configuración de Roles | Permisos por módulo (ver/editar/aprobar/ninguno) × por proyecto | Crear rol, editar permisos |
| Configuración de Proyecto | Módulos activos, procesos que aplican, módulos visibles | Activar/desactivar módulos |

## 3.14 Módulo L — Gestión de Operadores
**Usuarios:** Control Vehicular; coordinadores (su proyecto, lectura)

Expediente digital completo de cada operador, vinculado a las unidades que opera.

### Pantallas
| Pantalla | Campos clave | Acciones |
|----------|-------------|----------|
| Listado de Operadores | Nombre, proyecto, unidad(es) asignada(s), estatus documental (completo / incompleto / vencido) | Buscar, filtrar por proyecto/estatus, exportar |
| Ficha de Operador | Datos personales + documentación con vigencias + unidades asignadas (historial) | Editar, adjuntar documentos, asignar unidad |
| Alta de Operador | Datos personales (nombre, CURP, RFC, NSS, tipo sangre, tel, contacto emergencia, foto) + documentación inicial | Guardar, validar |
| Tablero de Pendientes Documentales | Documentos por vencer (próximos 60 días) y vencidos, agrupados por operador | Filtrar, exportar, enviar recordatorio |

### Datos personales
Nombre completo · CURP · RFC · NSS · Tipo de sangre · Teléfono · Contacto de emergencia · Fotografía

### Documentación (cada una con archivo adjunto obligatorio y vigencia)
| Documento | Campos específicos |
|-----------|-------------------|
| Licencia de conducir | Tipo (A/B/C/D/E), número, estado emisor, fecha emisión, fecha vencimiento |
| INE / identificación oficial | Número, vigencia |
| Comprobante de domicilio | Fecha de emisión (vigencia: 3 meses) |
| Carta de antecedentes no penales | Fecha de emisión |
| Constancia de situación fiscal | Fecha de emisión |
| Examen médico | Fecha, vigencia |
| Prueba antidoping | Fecha, vigencia |
| Curso de manejo defensivo | Fecha, vigencia (si aplica) |
| Certificaciones adicionales | Configurable por proyecto |

### Alertas
- 60, 30 y 7 días antes del vencimiento de cualquier documento.
- Operador con documentación vencida: marcado visualmente como "documentación incompleta" en el listado y en la Ficha de Unidad.

### Validación cruzada
- Si un operador tiene licencia tipo A y la unidad asignada requiere tipo C (grúa), el sistema resalta la incompatibilidad.

### Relación con Módulo A
- El campo "resguardante" de la Unidad es una referencia al Operador.
- En la Ficha de Unidad, clic en el nombre del operador → abre expediente.
- En el expediente del operador → se ven todas las unidades que tiene o ha tenido.

---

# PARTE 4 — FLUJOS TRANSVERSALES

## 4.1 Flujo de auditoría diaria
1. Control Vehicular abre el Panel de Conciliación Diaria (Módulo I).
2. El sistema muestra PTTO / REAL / CV / DIFERENCIA para combustible y TAG del día.
3. Control Vehicular revisa unidad por unidad; concilia o marca discrepancia.
4. Cada discrepancia queda en la Bitácora con fecha y responsable.
5. El Checklist confirma que todas las unidades activas tienen captura del día.

## 4.2 Flujo de alta de unidad
1. Control Vehicular presiona Dar de alta.
2. Llena el formulario (Módulo B.1).
3. El sistema valida en línea: formato, unicidad, campos obligatorios.
4. Al guardar: estatus Activo, disponibilidad = 1, registro en Bitácora.
5. Si no se capturó seguro, aparece aviso hasta que se registre.

## 4.3 Flujo de baja de unidad
1. Desde la Ficha, presiona Dar de baja.
2. Llena motivo, fecha, documento. Confirmación en dos pasos.
3. Estatus → Baja, se cierra asignación, se conservan historiales.

## 4.4 Flujo de recepción de datos GPS (con integridad)
1. IntelliHub envía dato de posición.
2. Capa 1: ¿velocidad imposible? ¿fuera de país? ¿salto? → Si falla, marca anómalo.
3. Capa 2: ¿más de X minutos sin lectura? → Alerta de señal perdida.
4. El punto válido se guarda con km_reportado y km_validado.
5. Al cierre del día: triangulación GPS vs. odómetro checklist vs. odómetro combustible.

## 4.5 Flujo de checklist diario
1. Operador abre formulario desde celular.
2. Selecciona/preselecciona la unidad.
3. Captura odómetro (obligatorio) + puntos de inspección + foto.
4. El odómetro alimenta la triangulación de km (G.1).

## 4.6 Flujo de alta de operador
1. Control Vehicular da de alta al operador con datos personales.
2. Sube documentación con vigencias (licencia, INE, antidoping, etc.).
3. Asigna al operador como resguardante de una o más unidades.
4. El sistema valida cruce de tipo de licencia vs tipo de vehículo.

---

# PARTE 5 — MATRIZ DE ROLES Y PERMISOS

| Módulo | Control Vehicular | Coord. Proyecto | Dirección | Admin |
|--------|------------------|-----------------|-----------|-------|
| A · Inventario + Checklist | Ver / Editar | Ver (su proy.) / Capturar checklist | Ver | Ver / Editar |
| B · Alta y baja | Alta / Baja | Ninguno | Ver | Alta / Baja / Reactivar |
| C · Mantenimiento y Gastos | Ver / Editar | Ver (su proy.) | Ver | Ver |
| D · Combustible | Ver / Editar | Ver / Reportar | Ver | Ver |
| E · TAG | Ver / Editar | Ver / Reportar | Ver | Ver |
| F · Seguros + Coberturas | Ver / Editar | Ver (su proy.) | Ver | Ver |
| G · Geolocalización + G.1 | Ver / Config. geocercas | Ver (su proy.) | Ver | Ver / Config. |
| H · Proyectos + Presupuesto | Ver / Editar | Ver (su proy.) | Ver consolidado | Ver / Editar |
| I · Auditoría | Ver / Editar | Ver (solo lo escalado) | Ver consolidado | Ver |
| J · Reportes | Ver / Generar / Programar | Ver (su proy.) / Programar | Ver consolidado | Ver / Generar |
| K · Usuarios y roles | Ninguno | Ninguno | Ninguno | Ver / Editar |
| L · Operadores | Ver / Editar | Ver (su proy.) | Ver | Ver / Editar |

---

# PARTE 6 — MODELO DE DATOS

## 6.1 Unidad
| Campo | Tipo | Notas |
|-------|------|-------|
| número_económico | VARCHAR (PK) | Formato normalizado; único |
| placas / número_serie | VARCHAR | Ambos únicos |
| marca / unidad / año | VARCHAR / VARCHAR / INT | |
| tipo_vehículo | ENUM | Auto / Camioneta / Grúa / Moto / Otro |
| tipo_combustible | ENUM | Gasolina / Diésel / Eléctrico / Híbrido |
| rendimiento_promedio | DECIMAL | Nullable |
| km_oficial | INT | Kilometraje maestro: GPS validado o corrección manual |
| proyecto_id / estado_operación | FK / VARCHAR | |
| estatus | ENUM | Activo / Consignación / Dirección / Baja |
| disponibilidad / días_sin_operar | BOOL / INT | |
| resguardante_id | FK → Operador | Responsable vigente |
| propietario / origen_placa / tag_iave | VARCHAR | |
| fecha_alta / fecha_baja / motivo_baja | DATE / DATE / ENUM | |

## 6.2 Operador
| Campo | Tipo | Notas |
|-------|------|-------|
| id | PK | |
| nombre / curp / rfc / nss | VARCHAR | |
| tipo_sangre | ENUM | |
| teléfono / contacto_emergencia | VARCHAR | |
| foto_id | FK → Documento | |
| proyecto_id | FK → Proyecto | |
| estatus | ENUM | Activo / Suspendido / Baja |
| estatus_documental | ENUM | Completo / Incompleto / Vencido (calculado) |

## 6.3 DocumentoOperador
| Campo | Tipo | Notas |
|-------|------|-------|
| id | PK | |
| operador_id | FK → Operador | |
| tipo_documento | ENUM | Licencia / INE / Comprobante domicilio / Antecedentes / CSF / Examen médico / Antidoping / Curso manejo / Certificación |
| número | VARCHAR | Nullable (no todos los documentos tienen número) |
| tipo_licencia | ENUM | A/B/C/D/E — solo si tipo_documento = Licencia |
| estado_emisor | VARCHAR | Nullable |
| fecha_emisión / fecha_vencimiento | DATE | |
| archivo_id | FK → Documento | Obligatorio |
| verificado | BOOLEAN | |
| fecha_verificación / verificado_por | DATE / FK → Usuario | |

## 6.4 AsignaciónOperador
| Campo | Tipo |
|-------|------|
| id | PK |
| operador_id | FK → Operador |
| número_económico | FK → Unidad |
| fecha_desde / fecha_hasta | DATE |
| motivo_cambio | TEXT |

## 6.5 Resguardo (historial)
| Campo | Tipo |
|-------|------|
| id | PK |
| número_económico | FK → Unidad |
| operador_id | FK → Operador |
| fecha_desde / fecha_hasta | DATE |
| motivo_cambio | TEXT |

## 6.6 Checklist
| Campo | Tipo | Notas |
|-------|------|-------|
| id | PK | |
| número_económico | FK → Unidad | |
| fecha / hora | DATE / TIME | |
| odómetro | INT | Obligatorio; alimenta triangulación G.1 |
| puntos_inspección | JSON | Configurable por proyecto |
| evidencia_id | FK → Documento | Nullable |
| capturado_por | FK → Usuario | |

## 6.7 GastoVehicular
| Campo | Tipo | Notas |
|-------|------|-------|
| id | PK | |
| número_económico | FK → Unidad | |
| categoría | ENUM | 12 categorías |
| descripción / fecha / costo | TEXT / DATE / DECIMAL | |
| km_al_momento | INT | De IntelliHub validado o manual |
| proveedor / servicio / empresa | VARCHAR | |
| sc / odc / entrada_sap | VARCHAR | Campos administrativos |
| fecha_requisición / odc / factura / cxp / pago | DATE (×5) | Ciclo completo |
| evidencia_id / estatus | FK / ENUM | Programado / Realizado / Pagado / Cancelado |

## 6.8 Combustible
| Campo | Tipo | Notas |
|-------|------|-------|
| id / número_económico / fecha | PK / FK / DATE | |
| litros / costo / km_actual | DECIMAL / DECIMAL / INT | |
| estación / rfc_estación | VARCHAR | |
| proyecto_reportante_id / fuente | FK / ENUM | api / archivo / manual |
| proveedor_combustible | VARCHAR | Efectivale u otro |
| rendimiento_calculado | DECIMAL | Derivado |

## 6.9 MapeoTarjetaEconómico
| Campo | Tipo |
|-------|------|
| número_tarjeta (PK) | VARCHAR |
| placa_asociada | VARCHAR |
| número_económico | FK → Unidad |
| proveedor | VARCHAR |
| vigencia_desde / vigencia_hasta | DATE |

## 6.10 ConfiguraciónProveedorCombustible
| Campo | Tipo | Notas |
|-------|------|-------|
| id / nombre | PK / VARCHAR | p.ej. Efectivale |
| mapeo_columnas | JSON | Columna del archivo → campo del sistema |
| formato_fecha | VARCHAR | |

## 6.11 TAG
| Campo | Tipo | Notas |
|-------|------|-------|
| id / número_económico | PK / FK | número_económico nullable hasta asignar |
| fecha / hora / monto | DATE / TIME / DECIMAL | |
| caseta / proveedor_tag / tarjeta_idmx | VARCHAR / ENUM / VARCHAR | |
| proyecto_reportante_id / conciliado | FK / BOOLEAN | |

## 6.12 Seguro
| Campo | Tipo | Notas |
|-------|------|-------|
| id / número_económico | PK / FK | |
| aseguradora / número_póliza | VARCHAR | |
| fecha_inicio / fecha_vencimiento / costo | DATE / DATE / DECIMAL | |
| documento_id | FK → Documento | |
| estatus | ENUM | Vigente / Por vencer / Vencido / Renovado |

## 6.13 CoberturaSeguro
| Campo | Tipo | Notas |
|-------|------|-------|
| id | PK | |
| seguro_id | FK → Seguro | |
| tipo_cobertura | ENUM | RC terceros / Daños materiales / Robo total / Robo parcial / Gastos médicos / Asistencia vial / RC personas / Cobertura legal / Pérdida total / Extensión RC / Especial |
| suma_asegurada | DECIMAL | |
| deducible | DECIMAL | |
| condiciones_especiales | TEXT | Nullable |

## 6.14 PosiciónGPS
| Campo | Tipo | Notas |
|-------|------|-------|
| id / número_económico | PK / FK | |
| lat / lng / velocidad | DECIMAL | |
| timestamp / fuente | DATETIME / ENUM | api / webhook |
| km_reportado | INT | Dato crudo de IntelliHub |
| km_validado | INT | Después del filtro G.1; alimenta mantenimiento |
| es_anomalo | BOOLEAN | True si fue filtrado |
| motivo_anomalía | ENUM | velocidad_imposible / fuera_de_país / salto_distancia / null |

## 6.15 HuecoSeñalGPS
| Campo | Tipo | Notas |
|-------|------|-------|
| id / número_económico | PK / FK | |
| última_posición_lat / lng | DECIMAL | |
| timestamp_inicio / timestamp_fin | DATETIME | |
| duración_minutos | INT | Calculado |
| primera_posición_lat / lng | DECIMAL | Al reconectarse |
| distancia_salto_km | DECIMAL | |
| patrón_recurrente | BOOLEAN | |

## 6.16 Geocerca
| Campo | Tipo | Notas |
|-------|------|-------|
| id / nombre | PK / VARCHAR | p.ej. "Oficina Tampico" |
| tipo | ENUM | inmueble / zona_trabajo / ruta / país |
| polígono | JSON (GeoJSON) | Array de coordenadas |
| proyecto_id | FK → Proyecto | Nullable (país = global) |
| hora_límite | TIME | Nullable |
| activa | BOOLEAN | |

## 6.17 Auditoría (conciliación diaria)
| Campo | Tipo | Notas |
|-------|------|-------|
| id / número_económico | PK / FK | |
| fecha_revisión / revisor_id | DATE / FK | |
| categoría_gasto | ENUM | combustible / tag / mantenimiento / etc. |
| monto_pptto / monto_real / monto_cv | DECIMAL | Columnas PTTO/REAL/CV del Excel |
| diferencia | DECIMAL | Derivado |
| tipo_discrepancia / resolución | ENUM / TEXT | |
| estatus | ENUM | abierta / resuelta |

## 6.18 BitácoraCambios
| Campo | Tipo | Notas |
|-------|------|-------|
| id | PK | |
| entidad / entidad_id | VARCHAR | p.ej. "Unidad" / número_económico |
| usuario_id / timestamp | FK / DATETIME | |
| acción | ENUM | crear / editar / dar_de_baja / reactivar |
| valores_anteriores / valores_nuevos | JSON | |

## 6.19 Proyecto (ampliado)
| Campo | Tipo |
|-------|------|
| id / nombre / estado_república / coordinador_id | PK / VARCHAR / VARCHAR / FK |
| fecha_inicio / fecha_fin / estatus | DATE / DATE / ENUM |
| presupuesto_semanal / semana_actual_gastado | DECIMAL / DECIMAL |
| módulos_activos / procesos_activos | JSON / JSON |

## 6.20 Usuario, Rol, Documento
| Entidad | Campos clave |
|---------|-------------|
| Usuario | id, nombre, correo, rol_id, proyectos_asignados (N:M), estatus |
| Rol | id, nombre, permisos (JSON: módulo × acción × proyecto) |
| Documento | id, entidad_relacionada, entidad_id, url, tipo, fecha_carga |

---

# PARTE 7 — INTEGRACIONES EXTERNAS

## 7.1 IntelliHub (GPS) — PASO PREVIO OBLIGATORIO
Contactar con estas preguntas antes de iniciar la Fase 2:
1. ¿Tienen API REST o webhook? ¿Documentación (Swagger/Postman)?
2. ¿Entregan posición, velocidad, estado del motor y kilometraje?
3. ¿Frecuencia de actualización (30s, 1min, 5min)?
4. ¿Soportan geocercas nativas o datos crudos?
5. ¿Costo adicional por acceso a API?
6. ¿Cuánto histórico conservan?
7. ¿Identificador de unidad: placa, VIN o ID propio?
8. ¿SLA de disponibilidad?

## 7.2 TAG (IAVE, PASE, Televía)
Método probable: descarga de archivo (CSV/Excel). Confirmar formato exacto y campo identificador.

## 7.3 Combustible (Efectivale y otros)
Diseño agnóstico vía ConfiguraciónProveedorCombustible. Confirmar si hay API o solo portal de descarga.

## 7.4 Fast Field (migración, no integración)
Los formularios se replican dentro de la plataforma (A.1). Se sustituye, no se integra.

---

# PARTE 8 — MIGRACIÓN DESDE EL EXCEL

1. Reconciliar conteo de flota (117 en Principal / 116 en maestra / 95 en hojas por estado).
2. Normalizar número económico: mayúsculas, con guion, sin espacios; resolver duplicados (AR-005).
3. Separar Proyecto de Estatus operativo: reclasificar DIRECCION, CONSIGNACION, BAJA.
4. Construir tabla Mapeo Tarjeta → Económico.
5. Homologar identificadores de TAG contra la maestra normalizada.
6. Migrar bitácora "B Manto T" como Gastos Vehiculares; capturar de cero para los otros estados.
7. Replicar formularios de Fast Field como configuración del sub-módulo A.1.
8. Capturar expedientes de operadores y documentación como primera tarea de la Fase 1.

---

# PARTE 9 — PLAN DE IMPLEMENTACIÓN

## Fase 1 — Desarrollo completo de la plataforma
Todo el sistema se construye funcional e independiente de IntelliHub. La plataforma opera con captura manual de kilometraje (odómetro en checklist y combustible) y carga de archivos para TAG y combustible.

**Incluye:**
- Modelo de datos completo (las 20 entidades).
- Módulo A (Inventario + Checklist diario con odómetro) + Módulo B (Alta/Baja).
- Módulo C (Mantenimiento y Gastos, 12 categorías + campos SAP).
- Módulo D (Combustible, importador agnóstico + mapeo tarjeta→económico).
- Módulo E (TAG, conciliación).
- Módulo F (Seguros + Coberturas con tarjeta PDF).
- Módulo G (Geolocalización) — pantallas de mapa e historial listas, pero alimentadas por datos manuales o archivo hasta que IntelliHub se conecte.
- Módulo G.1 (Integridad GPS) — filtros y triangulación listos para activarse.
- Módulo H (Proyectos + Presupuesto semanal).
- Módulo I (Auditoría diaria, Panel de Conciliación, Bitácora en intranet).
- Módulo J (Dashboard ejecutivo + Generador de reportes con envío programado).
- Módulo K (Usuarios y roles, permisos granulares).
- Módulo L (Gestión de Operadores, expediente digital, alertas de vencimiento).
- Diseño responsive (mobile-first) desde el inicio.
- Migración del Excel actual (los 8 pasos de la Parte 8).
- Sistema de alertas por correo electrónico.

## Fase 2 — Conexión con IntelliHub (API/Webhook)
Una vez que la plataforma esté operando y se hayan resuelto las preguntas técnicas con IntelliHub, se conecta la fuente de datos GPS en tiempo real.

**Incluye:**
- Confirmación de API/webhook con IntelliHub (las 8 preguntas de la sección 7.1).
- Conector de posición, velocidad, kilometraje y estado del motor.
- Activación de G.1 en modo automático (filtro de datos imposibles, detección de huecos, patrones de apagado).
- Activación de la triangulación automática (GPS validado vs. odómetro checklist vs. odómetro combustible).
- Geocercas configurables (inmuebles, zonas de trabajo, rutas autorizadas).
- Alertas avanzadas: exceso de velocidad, ralentí prolongado, uso fuera de horario, permanencia fuera de inmueble, reporte nocturno de ubicación.
- El kilometraje oficial pasa de manual a GPS validado como fuente primaria.

---

# PARTE 10 — PRIORIDAD DE DISEÑO DE PANTALLAS

Orden sugerido para diseñar los prototipos interactivos:

1. **Shell (sidebar + header)** — estructura base de navegación con los 14 módulos
2. **Listado de Unidades (A)** — tabla con filtros, búsqueda, stats cards
3. **Ficha de Unidad (A)** — datos generales + pestañas (incluyendo coberturas de seguro)
4. **Listado de Operadores (L)** — expediente digital, tablero de pendientes
5. **Ficha de Operador (L)** — datos personales + documentación + unidades
6. **Panel de Conciliación Diaria (I)** — pantalla de trabajo diario
7. **Formulario de Alta de unidad (B)** — 18 campos en 4 bloques
8. **Formulario de Alta de operador (L)** — datos + documentación
9. **Mapa en Tiempo Real (G)** — mapa con unidades y geocercas
10. **Checklist diario (A.1)** — formulario mobile-first
11. **Dashboard Ejecutivo (J)** — KPIs consolidados
12. **Generador de Reportes (J)** — builder con envío programado
