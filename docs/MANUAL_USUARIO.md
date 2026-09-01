# Manual de Usuario — Orión (Control Vehicular, Grupo Kabat)

> Manual de referencia exhaustivo de la plataforma Orión: módulos, pantallas, campos de formulario, etiquetas, reglas de negocio y permisos de usuario. Generado a partir de una revisión completa del código fuente (Next.js 16 + Prisma/PostgreSQL) al **25 de agosto de 2026**, commit `69292d4`, y actualizado el **31 de agosto de 2026** (commit `bf71e12`) para incorporar: autoservicio de recuperación de contraseña para operadores, permisos por rol para pólizas de seguro (ver/editar/descargar) y registro de póliza sin coberturas, pestaña de Documentos por unidad, corrección del proyecto en gastos capturados desde la ficha de unidad + búsqueda de historial completo en Mantenimiento, unificación de Inventario de Unidades como pestaña del Dashboard + exportación de resumen ejecutivo en PDF, reporte "Estatus semanal de flota", motivo de indisponibilidad al apagar una unidad, permisos ampliados de Control Vehicular/Gerente administrativo, y retiro de la conciliación manual de TAG a favor de alertas de triangulación TAG/combustible/GPS. Pensado para responder cualquier duda operativa sobre la plataforma.
>
> Nota de lectura: donde el código revela una discrepancia entre lo que un texto de la interfaz *dice* que hace y lo que el código *realmente* hace (por ejemplo, funcionalidad descrita pero no implementada, o campos del modelo de datos sin pantalla asociada), este manual lo señala explícitamente como **"Hallazgo"** o **"Nota"**, en vez de omitirlo.

## Índice

1. [Introducción y visión general](#1-introducción-y-visión-general)
2. [Autenticación e inicio de sesión](#2-autenticación-e-inicio-de-sesión)
3. [Shell de la aplicación](#3-shell-de-la-aplicación)
4. [Sistema de permisos y roles (referencia completa)](#4-sistema-de-permisos-y-roles-referencia-completa)
5. **Flota**
   - [5.1 Módulo A — Inventario de Unidades](#51-módulo-a--inventario-de-unidades)
   - [5.2 Módulo A.1 — Checklist](#52-módulo-a1--checklist)
   - [5.3 Módulo B — Alta / Baja de Unidades](#53-módulo-b--alta--baja-de-unidades)
6. **Operación y gasto**
   - [6.1 Módulo C — Mantenimiento y Gastos](#61-módulo-c--mantenimiento-y-gastos-vehiculares)
   - [6.2 Módulo D — Combustible](#62-módulo-d--combustible)
   - [6.3 Módulo E — TAG / Peajes](#63-módulo-e--tag--peajes)
   - [6.4 Módulo F — Seguros + Coberturas](#64-módulo-f--seguros--coberturas)
7. **Geolocalización**
   - [7.1 Módulo G — Geolocalización / IntelliHub](#71-módulo-g--geolocalización--intellihub)
   - [7.2 Módulo G.1 — Integridad de datos GPS](#72-módulo-g1--integridad-de-datos-gps)
8. **Gestión**
   - [8.1 Módulo H — Proyectos](#81-módulo-h--proyectos)
   - [8.2 Módulo I — Bitácora de movimientos / Auditoría](#82-módulo-i--bitácora-de-movimientos--auditoría)
   - [8.3 Módulo J — Reportes](#83-módulo-j--reportes)
   - [8.4 Módulo M — Dashboards y BI](#84-módulo-m--dashboards)
   - [8.5 Módulo L — Gestión de Operadores](#85-módulo-l--gestión-de-operadores)
   - [8.6 Módulo K — Administración](#86-módulo-k--administración)
   - [8.7 Módulo N — Inventario de Insumos](#87-módulo-n--inventario-de-insumos)
9. **Rescate y campo**
   - [9.1 Módulo R — Rescate de Unidades](#91-módulo-r--rescate-de-unidades)
   - [9.2 Módulo S — Siniestros](#92-módulo-s--siniestros)
   - [9.3 Nota sobre el módulo legacy "Accidente"](#93-nota-sobre-el-módulo-legacy-accidente)
10. [Notificaciones y alertas (resumen transversal)](#10-notificaciones-y-alertas-resumen-transversal)
11. [Importador genérico de Excel](#11-importador-genérico-de-excel)
12. [Documentos, evidencias y Vercel Blob](#12-documentos-evidencias-y-vercel-blob)
13. [Envío de correos](#13-envío-de-correos)
14. [Analítica de uso y trazabilidad (ActivityLog)](#14-analítica-de-uso-y-trazabilidad-activitylog)

---

## 1. Introducción y visión general

**Orión** es la plataforma interna de Control Vehicular de Grupo Kabat: administra toda la flota (unidades, operadores, gasto, combustible, peajes, seguros, geolocalización), la estructura de proyectos y presupuesto, el rescate de unidades en campo, los siniestros, y un módulo de inteligencia de negocio (BI) con capa de IA en lenguaje natural.

La plataforma organiza sus 18 módulos en 5 grupos de menú:

| Grupo | Módulos |
|---|---|
| **Flota** | A — Inventario de Unidades · A.1 — Checklist · B — Alta / Baja |
| **Operación y gasto** | C — Mantenimiento y Gastos · D — Combustible · E — TAG / Peajes · F — Seguros + Coberturas |
| **Rescate y campo** | R — Rescate de Unidades · S — Siniestros |
| **Geo** | G — Geolocalización · G.1 — Integridad de datos GPS |
| **Gestión** | H — Proyectos · I — Bitácora de movimientos · J — Reportes · M — Dashboards · L — Gestión de Operadores · K — Administración · N — Inventario de Insumos |

Cada módulo tiene un `moduloId` propio, usado por el sistema de permisos (sección 4) para decidir qué ve y qué puede hacer cada usuario. Un grupo del menú lateral desaparece por completo si ninguno de sus módulos es visible para el usuario actual.

---

## 2. Autenticación e inicio de sesión

Orión soporta autenticación sobre NextAuth (Auth.js) con sesión en formato **JWT** (no hay tabla de sesiones en base de datos).

### Métodos de acceso

| Método | Para quién | Cómo funciona |
|---|---|---|
| **Microsoft (Entra ID)** | Personal con correo institucional de Grupo Kabat | Botón "Continuar con Microsoft" — OAuth contra el tenant de Azure AD. Es el método por defecto (`MetodoAcceso.MICROSOFT`). |
| **Correo + contraseña (Operador)** | Operadores sin correo institucional | Formulario colapsable "Ingreso operador" en la pantalla de login. Valida contra `Usuario.passwordHash` (bcrypt); requiere `metodoAcceso = CORREO_PASSWORD`. La contraseña la define el propio operador al aceptar su invitación. |
| **PREVIEW_LOGIN** (solo desarrollo/preview) | Equipo de desarrollo, exclusivamente en entornos de preview | Ver detalle abajo. **No existe en producción.** |

### Formulario de inicio de sesión (`/iniciar-sesion`)

Panel de marca (logo Grupo Kabat + "Orión — Control Vehicular de Grupo Kabat") y panel de acceso:

- **Botón "Continuar con Microsoft"** — inicia el flujo OAuth de Entra ID (con selector de cuenta).
- Separador "o".
- **Bloque desplegable "Ingreso operador"** (colapsado por defecto, leyenda "Para operadores sin correo institucional, con contraseña creada desde su invitación por correo"): campos `Correo` (requerido) y `Contraseña` (requerido), botón "Entrar como operador".
- Nota legal fija: "Plataforma interna — acceso restringido al equipo de Kabat".

Mensajes de error (`?error=` en la URL):

| Código | Mensaje mostrado |
|---|---|
| `SinAcceso` | "Tu cuenta de Microsoft no tiene acceso a Orión. Pide a un administrador que te invite desde Administración." |
| `AccessDenied` | "Acceso denegado. Verifica que estés usando tu cuenta de Grupo Kabat." |
| `CredencialesInvalidas` | "Usuario o contraseña incorrectos." (solo aplica al login de preview) |
| `CredencialesOperadorInvalidas` | "Correo o contraseña incorrectos." |

Tras iniciar sesión, el usuario cae en `/unidades` por defecto (o en la URL que traía en `callbackUrl`).

### Reglas de acceso al iniciar sesión (Microsoft)

- Si no existe un `Usuario` con ese correo, o su `estatus` es `DESACTIVADO`, se rechaza el acceso (`SinAcceso`). **El alta de Microsoft por sí sola no da acceso**: la cuenta debe existir previamente en Orión (creada desde Administración).
- Si el usuario tenía `estatus = INVITADO`, el primer login exitoso lo pasa automáticamente a `ACTIVO`.

### Flujo de invitación (operadores sin correo institucional)

Al dar de alta a un usuario marcado "sin correo institucional" desde Administración:

1. Se genera `metodoAcceso = CORREO_PASSWORD`, un `invitacionToken` aleatorio (32 bytes) y `invitacionExpiraEn` = ahora + **7 días**.
2. Se envía el correo "Te invitaron a Orión — Control Vehicular" con un botón "Crear mi contraseña" a `/invitacion/[token]`.
3. Si el correo falla, Administración puede compartir el enlace a mano (se muestra en el resultado de la acción).

En `/invitacion/[token]`:
- Si el token es válido (existe, `metodoAcceso = CORREO_PASSWORD`, cuenta no `DESACTIVADO`, no expirado), se muestra "Hola, {nombre}" y el formulario con `Contraseña` (mínimo 8 caracteres) y `Confirmar contraseña` (debe coincidir).
- Si el token ya se usó o expiró: "Enlace inválido" — pedir a un administrador que reenvíe la invitación.
- Al aceptar: se guarda `passwordHash` (bcrypt), `estatus` pasa a `ACTIVO`, se limpian `invitacionToken`/`invitacionExpiraEn` (token de un solo uso). Ruta **pública** (sin sesión) — la única "autorización" es poseer el token.

### Autoservicio "olvidé mi contraseña" (operadores)

Ruta pública `/recuperar-contrasena`, enlazada desde el panel colapsable "Ingreso operador" en `/iniciar-sesion` — solo aplica a cuentas `metodoAcceso = CORREO_PASSWORD`; las de Microsoft no tienen contraseña que restablecer aquí.

1. El operador escribe su correo. La acción `solicitarRecuperacionContrasena` **siempre responde el mismo mensaje de éxito**, exista o no la cuenta — evita que alguien pueda enumerar qué correos están dados de alta.
2. Si el correo corresponde a un usuario `ACTIVO` con `metodoAcceso = CORREO_PASSWORD`, se genera un `invitacionToken` nuevo (32 bytes) con vigencia de **7 días** y se envía el correo "Recupera tu contraseña" con el enlace a `/invitacion/[token]` — el mismo formulario de un solo uso que ya usa el flujo de invitación inicial (arriba); no hay una pantalla de "restablecer contraseña" separada.
3. El enlace anterior (si el operador tenía uno vigente) queda invalidado, porque se sobreescribe con el token nuevo.

### Invalidación forzada de sesión (`sesionInvalidadaEn`)

Desde el panel de Analítica de Uso y Trazabilidad (exclusivo del equipo de Desarrollo), un botón **"Cerrar sesión"** fuerza que un usuario deje de estar autenticado sin desactivar su cuenta:

- Se guarda `Usuario.sesionInvalidadaEn = ahora`.
- Cualquier JWT emitido **antes** de esa marca se trata como inválido en el callback `session`; el layout de `/(app)` redirige a `/iniciar-sesion`.
- El usuario puede volver a iniciar sesión de inmediato — un login exitoso limpia `sesionInvalidadaEn` automáticamente.
- En la lista de usuarios del panel de Adopción se ve "Sesión cerrada el {fecha}" junto al nombre afectado.

### Login maestro / "PREVIEW_LOGIN" (solo entornos de preview)

**Advertencia: no es para producción.** Permite al equipo de desarrollo probar despliegues de preview sin depender de Azure AD.

- Aparece en el login solo si `PREVIEW_LOGIN_ENABLED === "true"`, como un bloque casi invisible ("···") al final de la página.
- Valida contra `PREVIEW_LOGIN_USER`/`PREVIEW_LOGIN_PASS` (variables de entorno) — **no contra ninguna tabla de usuarios**. Si no están configuradas, este login siempre falla.
- Al autenticar, resuelve la sesión contra un `Usuario` real: si se define `PREVIEW_LOGIN_EMAIL` usa ese correo (si no está `DESACTIVADO`); si no, toma el primer usuario `ACTIVO` que encuentre.

### Cierre de sesión

El botón "Cerrar sesión" del menú de usuario llama a `signOut()` y redirige a `/iniciar-sesion`. Cada login/logout exitoso queda registrado en `ActivityLog` (módulo `auth`, acción `login`/`logout`).

---

## 3. Shell de la aplicación

### Barra lateral (Sidebar)

- **Encabezado**: ícono + "Orión" + "Control Vehicular · Grupo Kabat" (enlaza a `/unidades`).
- **Botón de colapso** (escritorio): reduce la barra a solo íconos; persistido en `localStorage`.
- **Navegación agrupada** en los 5 grupos de la sección 1, cada uno colapsable independientemente (persistido en `localStorage`). **Un grupo no se muestra si ninguno de sus módulos es visible.**
- Cada módulo tiene id, etiqueta, ícono, ruta y descripción corta (tooltip).
- **Pie**: menú de usuario (avatar con iniciales, nombre, rol) y número de versión.
- En móvil: panel deslizante a pantalla completa con overlay y botón de cierre.

### Filtrado de módulos por permisos

- El equipo de Desarrollo (`esDevAdmin`, allowlist de correos) ve **todos** los módulos siempre.
- Un rol con permiso comodín `"*"` (ej. Administrador) ve todos los módulos.
- Cualquier otro rol solo ve los módulos con nivel `ver`, `editar` o `aprobar` explícito en `Rol.permisos`.

### Barra superior (Header)

- Menú hamburguesa (móvil).
- **Buscador global**: a partir de 2 caracteres, busca en "Unidades" (número económico, placas, marca/modelo) y "Operadores" (nombre, CURP), con debounce de 250ms; Enter navega al primer resultado.
- **Selector de tema** (claro/oscuro).
- **Campana de notificaciones** (ver sección 10).
- **Menú de usuario**.

### Menú de usuario

Avatar con iniciales, nombre, correo, rol. Incluye:
- **"Analítica de uso y trazabilidad"** — solo visible si `esDevAdmin`.
- **"Cerrar sesión"**.

### Tema claro / oscuro

Se guarda como atributo `data-theme` en `<html>` y en `localStorage`. Un script inline evita parpadeo al cargar. **El oscuro es el tema por defecto** cuando no hay preferencia guardada ni del sistema. Botón con ícono Sol/Luna para alternar.

---

## 4. Sistema de permisos y roles (referencia completa)

### 4.1 Modelo de datos

`Rol.permisos` es un JSON `{ [moduloId]: { ver?, editar?, aprobar? } }`. La UI de `/usuarios/roles` permite guardar 4 combinaciones por módulo: **Ninguno / Ver / Editar / Aprobar**, aunque el motor evalúa por prioridad `aprobar > editar > ver` internamente.

- **`ver`**: acceso de solo lectura (listados, fichas, tableros).
- **`editar`**: además de ver, crear/modificar/eliminar registros del módulo.
- **`aprobar`**: nivel más alto. **Solo 2 módulos tienen hoy una acción realmente distinta gateada a `aprobar`** — para el resto, "Aprobar" se guarda igual pero no desbloquea nada adicional a "Editar":
  - **C (Mantenimiento)**: requerido para "Marcar realizado" un gasto/orden.
  - **H (Proyectos)**: requerido para ajustar el presupuesto aprobado anual.

**Nota**: el Módulo E (TAG/Peajes) tenía antes una acción "Conciliar" gateada a `aprobar` — se retiró (era un flag manual sin comparación real contra GPS; ver Hallazgo histórico en sección 6.3) y se reemplazó por las alertas automáticas de triangulación TAG/combustible/GPS de la sección 10. El nivel `aprobar` del módulo E ya no desbloquea ninguna acción distinta a `editar`.

**Acceso global "\*"**: si `Rol.permisos["*"]` existe (hoy solo el rol "Administrador"), el usuario tiene ver+editar+aprobar en **todos** los módulos, sin ningún filtro por proyecto.

**dev-admin**: allowlist de correos por variable de entorno (`DEV_ADMIN_EMAILS`), completamente fuera de la tabla `Rol`. Da acceso total y es **irrevocable desde la aplicación** — ni siquiera desde `/usuarios/roles` se puede otorgar o quitar; solo cambiando la variable de entorno del despliegue. Es exclusivo del equipo de Desarrollo, y es el único perfil que puede forzar el cierre de sesión de otro usuario (sección 14). No se debe presentar como algo configurable por un Administrador de negocio.

### 4.2 Permisos especiales

Viven en el mismo JSON de `Rol.permisos`, como clave adicional `{ editar: boolean }` (sin niveles ver/aprobar), activables individualmente en `/usuarios/roles`:

| id | Etiqueta en la UI | Efecto |
|---|---|---|
| `capacidadTanque` | Editar capacidad de tanque (Inventario de Unidades) | Permite editar `Unidad.capacidadTanqueLitros` desde la ficha de unidad (Módulo A) |
| `cargarPresupuesto` | Cargar / reemplazar presupuesto por partida (Proyectos) | Permite importar/reemplazar `PresupuestoPartida` en el Módulo H |
| `verSlaDisponibilidad` | Ver SLA de disponibilidad por unidad (Inventario de Unidades) | Habilita la vista/widget/columna de SLA de disponibilidad en el Módulo A y el acceso a `/reportes/sla` |

Un rol con acceso global ("\*") los tiene siempre implícitamente; cualquier otro rol requiere que el Administrador los active uno por uno.

**Nota — permisos de póliza de seguro por nombre de rol**: a diferencia de los tres de arriba (activables por cualquier rol desde `/usuarios/roles`), ver el detalle comercial de una póliza (`puedeVerPolizaSeguro`), descargar su PDF/tarjeta (`puedeDescargarPolizaSeguro`) y editar sus datos ya capturados (`puedeEditarPolizaCompletaSeguro`) están codificados por **nombre literal de rol** en `src/lib/permisos.ts` (Dirección, Gerente administrativo, Jurídico según el caso — ver detalle en sección 6.4), no por un toggle en la UI de roles. Si alguno de esos roles se renombra desde `/usuarios/roles`, esa lista deja de reconocerlo y hay que actualizar el código.

### 4.3 Alcance por proyecto

Además del nivel de permiso, cada usuario sin acceso global solo ve/opera sobre los proyectos que tiene asignados (`UsuarioProyecto`) **y** que además tienen ese módulo activo en `Proyecto.modulosActivos` (configurable en `/usuarios/proyectos`). Esta intersección se recalcula **siempre en el servidor**, nunca se confía en lo que mande el cliente — aplica de forma consistente en listados, fichas, formularios, exportaciones, BI y reportes programados (estos últimos resuelven el alcance del **dueño** del reporte, no de quien lo ejecuta).

Un usuario sin ningún proyecto asignado no ve datos de ningún proyecto en ningún módulo.

**Rol Operador — restricción adicional a nivel de fila**: dentro del Módulo A, un usuario con rol "Operador" solo ve las unidades que tiene resguardadas él mismo (vía su ficha de `Operador`), sin importar el proyecto — es la única regla de "ve solo lo suyo" a nivel de fila en toda la plataforma; el resto del sistema filtra a nivel de proyecto.

### 4.4 Tabla de módulos — significado de ver / editar / aprobar

| Id | Módulo | `ver` | `editar` | `aprobar` |
|---|---|---|---|---|
| A | Inventario de Unidades | Ver ficha por número económico, listados, resumen | Crear/editar unidades, cambiar disponibilidad | Sin acción distinta hoy — igual que `editar` |
| A.1 | Checklist | Ver checklists capturados | Capturar checklist diario/semanal/carga de combustible | Sin acción distinta hoy — igual que `editar` |
| B | Alta / Baja | Ver historial de altas/bajas | Dar de alta/baja unidades, importar | Sin acción distinta hoy — igual que `editar` |
| C | Mantenimiento y Gastos | Ver gastos vehiculares | Registrar/editar gastos | **Marcar "Realizado"** una orden |
| D | Combustible | Ver consumo/rendimiento | Registrar cargas, importar, resolver solicitudes de autorización | Sin acción distinta hoy — igual que `editar` (incluida aprobación de autorizaciones) |
| E | TAG / Peajes | Ver gasto de casetas | Registrar/importar transacciones, asignar económico | Sin acción distinta hoy — igual que `editar` (la "Conciliación" manual se retiró, ver sección 6.3) |
| F | Seguros + Coberturas | Ver el **listado** `/seguros` y las pólizas requiere además `puedeVerPolizaSeguro` (Administrador/rol global, Dirección, Gerente administrativo o Jurídico) — un rol con `F: ver` pero fuera de esa lista (ej. Control Vehicular) no puede entrar a `/seguros` en absoluto | Crear póliza (ya sin coberturas, con PDF ahora obligatorio), renovar, subir PDF — disponible aunque no se tenga `puedeVerPolizaSeguro` (alta "a ciegas") | Sin acción distinta hoy — igual que `editar`. Editar datos ya capturados de una póliza exige además `puedeEditarPolizaCompletaSeguro` (rol global o **Jurídico**); descargar el PDF/tarjeta exige además `puedeDescargarPolizaSeguro` (rol global, Dirección o Jurídico) — ver detalle completo en sección 6.4 |
| G | Geolocalización | Ver mapa y últimas posiciones | Registrar posición manual | Sin acción distinta hoy — igual que `editar` |
| G.1 | Integridad de datos GPS | Ver anomalías/huecos de señal | (no hay formularios propios; datos generados desde G) | — |
| H | Proyectos | Ver estructura y presupuesto | Crear proyecto, presupuesto mensual/por partida, importar | **Ajustar presupuesto aprobado anual**. Editar/eliminar datos maestros del proyecto es exclusivo del rol global |
| I | Bitácora de movimientos | Consultar la bitácora de trazabilidad | (módulo de solo consulta) | — |
| J | Reportes | Ver dashboard ejecutivo, presupuesto, SLA | Crear/pausar/ejecutar reportes programados | Sin acción distinta hoy — igual que `editar` |
| K | Administración | Ver usuarios/roles/proyectos/notificaciones | Invitar/editar/(des)activar/eliminar usuarios, editar permisos, módulos por proyecto, notificaciones | Sin acción distinta hoy — igual que `editar`. Widgets del resumen exige acceso **global** ("\*"), no solo `K: aprobar` |
| L | Gestión de Operadores | Ver listado/ficha/pendientes | Alta/edición de operadores, cursos | Sin acción distinta hoy — igual que `editar` (nota: registrar un accidente desde la ficha del operador exige `A: editar`, no `L`) |
| M | Dashboards | Ver dashboards guardados y explorador BI | Crear/editar dashboards y métricas BI | Sin acción distinta hoy — igual que `editar` |
| N | Inventario de Insumos | Ver stock por proyecto | Editar catálogo de insumos, stock/mínimos | Sin acción distinta hoy — igual que `editar` (nota: registrar consumo desde la ficha de unidad exige `A: editar`, no `N`) |
| R | Rescate de Unidades | Ver tickets | Crear/editar/asignar tickets | Sin acción distinta hoy — igual que `editar` |
| S | Siniestros | Ver siniestros y su seguimiento | Crear/editar siniestros, cambiar estatus | Sin acción distinta hoy — igual que `editar` |

**Nota**: en los datos semilla originales, ningún rol estándar traía los módulos K, R o S habilitados salvo el Administrador. Desde el 31 de agosto de 2026, **Control Vehicular** y **Gerente administrativo** tienen además acceso explícito a **B (Alta/Baja)**, **N (Insumos)**, **R (Rescate)** y **S (Siniestros)** — Control Vehicular con `editar` en B y N, `ver` en R y S; Gerente administrativo con `ver` en B, `editar` en N, `ver` en R y S. Dirección y Operador siguen sin K, R o S por defecto. Cualquier ajuste adicional se otorga desde `/usuarios/roles`.

---

## 5. Flota

### 5.1 Módulo A — Inventario de Unidades

**Rutas:** `/unidades` (listado), `/unidades/[numeroEconomico]` (ficha), `/unidades/[numeroEconomico]/editar`.

#### Propósito

Ficha única por número económico con vista consolidada de toda la flota: identificación, asignación, documentación, mantenimiento, gastos, combustible, TAG, seguro, GPS, checklists, operador, accidentes, histórico de proyecto, siniestros, insumos y SLA de disponibilidad.

#### Listado (`/unidades`)

**Widgets/KPIs superiores** (configurables desde "Configurar widgets", solo roles globales):

| Widget | Tipo | Por defecto |
|---|---|---|
| Unidades totales | contador | sí |
| Activas / disponibles | contador | sí |
| Disponibles hoy | contador | sí |
| No disponibles hoy | contador | sí |
| Bajas | contador | sí |
| En consignación / dirección | contador | sí |
| Gasto al día (hoy) | contador | no |
| Unidades por tipo de vehículo | desglose (chips clicables) | sí |
| No disponibles por tipo de vehículo | desglose (chips clicables) | sí |
| Unidades por proyecto | desglose (chips clicables) | sí |
| SLA de disponibilidad por proyecto — mes en curso (%) | desglose | no, y solo visible con `verSlaDisponibilidad` |

Los widgets son interactivos: clic filtra la tabla de abajo. **Las unidades dadas de Baja no cuentan en ningún contador ni desglose** (ni total, ni activas, ni disponibles) salvo el propio contador "Bajas".

**Tabla** — columnas: punto de color (semáforo), N° económico (link), Placas, Tipo, Marca/Unidad, Proyecto, Estatus (badge), Disp. (interruptor de encendido/apagado), Días s/operar, *SLA disp. (mes)* (si aplica), Resguardante, Último manto., Próx. manto., flecha de detalle.

Filtros: buscador (económico, placa o resguardante), Proyecto, Tipo de vehículo, Estatus, y semáforo:
- 🟢 Verde — Disponible / Óptimas condiciones
- 🟡 Amarillo — Requiere atención (doc. faltante, póliza por vencer, sin operar)
- 🔴 Rojo — Parada por daño, baja, mantenimiento o inactiva

Lógica del semáforo: rojo si `estatus != ACTIVO`; si no, amarillo si la unidad está apagada, o lleva más de 5 días sin operar, o tiene una póliza que vence en ≤30 días; si no, verde.

Botones: **Exportar** (CSV con BOM), **Ocultar/Mostrar SLA** (preferencia personal, solo si tiene `verSlaDisponibilidad`), **Dar de alta** (→ Módulo B).

#### Ficha de unidad (`/unidades/[numeroEconomico]`)

Encabezado: N° económico, badge de estatus, marca/modelo/año/tipo/placas. Botones: Imprimir, interruptor Encender/Apagar, Reasignar proyecto, Editar y Dar de baja (estos dos últimos solo si la unidad tiene proyecto asignado).

Banner naranja si la unidad no tiene proyecto: *"Asigna un proyecto para habilitar la edición y registro de actividades."* — bloquea Accidentes e Insumos.
Banner rojo si hay mantenimiento preventivo vencido.

**KPIs**: Rendimiento (km/L + km oficiales), Próximo mantenimiento, Vencimiento de seguro (alerta si ≤30 días), Días sin operar (alerta si >2 días).

**15 pestañas** (la última solo con `verSlaDisponibilidad`):

| Pestaña | Contenido |
|---|---|
| Datos generales | Identificación y vehículo (VIN, placas, marca/unidad, año, tipo, combustible, rendimiento, km oficial, capacidad de tanque editable inline con permiso); Asignación y documentación; Historial de placas |
| Mantenimiento | Órdenes preventivas/correctivas; badge "Excedido"; botón Agregar mantenimiento |
| Gastos | Demás categorías de gasto; columna Proyecto resuelta por fecha contra histórico |
| Combustible | Cargas registradas; badge "Excede capacidad"; botón Agregar carga |
| TAG | Transacciones IAVE; botón Agregar transacción (ya sin badge de conciliación, ver sección 6.3) |
| Seguro | Pólizas — detalle comercial (aseguradora, costo, coberturas) solo si `puedeVerPolizaSeguro`; si no, solo número de póliza, estatus y enlace para renovar/actualizar documento a ciegas; botón Agregar póliza — ver sección 6.4 |
| **Documentos** | Documentos administrativos de la unidad por concepto (factura, pedimento, certificado de montaje, tarjeta de circulación, refrendo, derechos vehiculares, etc.) — ver detalle abajo |
| GPS | Posiciones históricas (placeholder "se alimentará de IntelliHub en Fase 2"); badge Anómalo con motivo |
| Checklist | Todos los checklists de la unidad (Diario/Semanal/Combustible) |
| Operador | Ficha del resguardante y sus documentos, coloreado por vigencia |
| Accidentes | Formulario de alta (bloqueado sin proyecto) y tabla con evidencias fotográficas |
| Bitácora | Histórico de proyecto: filas Actual/Terminado |
| Siniestros | Solo lectura — "se gestionan en el Módulo S" |
| Insumos | Formulario "Registrar consumo" (bloqueado sin proyecto o sin insumos); tabla de consumos |
| SLA de disponibilidad | Tabla mensual: mes, días activa/inactiva, % SLA — mes en curso marcado "(en curso)" |

#### Pestaña Documentos

Centraliza documentación hoy dispersa en carpetas fuera del sistema, con el mismo patrón `Documento` + `crearDocumento()` que ya usan Operadores y Seguros. Buscador (por concepto, descripción o año) y botón "Subir documento".

**Catálogo de conceptos** (`TipoDocumentoUnidad`): Factura del vehículo, Factura del elevador/grúa, Factura de exportación, Factura comercial de venta, Carta factura, Pedimento de importación, Certificado de montaje, Tarjeta de circulación, Refrendo, Derechos vehiculares, Orden de embarque, Protocolo de entrega/embarque, Nota de entrega, Pedido de compra, Acta de entrega de documentos, Otro.

**Campos al subir**: Concepto\* (select), Año\* (solo obligatorio para Refrendo y Derechos vehiculares), Descripción (opcional), Archivo\* (PDF o imagen — JPG/PNG/WEBP/HEIC/HEIF). Permite historial: varios archivos para el mismo concepto (necesario para los conceptos que se repiten cada año, como Refrendo).

#### Editar unidad (`/unidades/[numeroEconomico]/editar`)

Aviso: el número económico y el VIN no se pueden modificar aquí (identidad permanente).

| Campo (etiqueta visible) | Tipo | Obligatorio | Notas |
|---|---|---|---|
| Placas | texto (mono) | Sí | Normalizada a mayúsculas sin espacios; valida unicidad |
| Número de serie (VIN) | texto | — | Deshabilitado, solo lectura |
| Marca | texto | Sí | |
| Unidad / modelo comercial | texto | Sí | |
| Año | número | Sí | min 1990, max 2100 |
| Tipo | select | Sí | Auto, Camioneta, Grúa, Moto, Otro |
| Tipo de combustible | select | Sí | Gasolina, Diésel, Eléctrico, Híbrido |
| Rendimiento promedio km/L | número (paso 0.1) | No | |
| Capacidad máxima de tanque (litros) | número (paso 0.1, min 1) | No | Requiere permiso especial `capacidadTanque` |
| Proyecto | select | No | "Sin proyecto" u opciones activas permitidas |
| Responsable de resguardo | select | No | "Sin asignar" u operadores activos |
| Licencia requerida | select | No | Sin especificar / Tipo A (auto, camioneta, moto) / Tipo B (grúa) |
| Tag IAVE (número) | texto (mono) | No | |
| Número de tarjeta de combustible | texto (mono) | No | |
| Origen de placa | texto | Sí | Estado de emisión |
| Propietario | select | Sí | SYM, 5 STAR SYSTEM, KABAT, Otro |

#### Acciones y botones

- **Encender/Apagar unidad** — deshabilitado si `estatus = BAJA`. Encender no pide nada. **Apagar abre un modal obligatorio "Motivo de indisponibilidad"**: Mantenimiento, Siniestro, Sin operador asignado, Trámite/documentación, Falta de combustible, u Otro (con detalle en texto libre) — no se puede apagar la unidad sin elegir un motivo. Escribe `disponibilidad`, `fechaCambioDisponibilidad`, `motivoIndisponibilidad` y `motivoIndisponibilidadDetalle` en `Unidad` (se limpian al volver a encender), y abre/cierra un periodo en `HistoricoDisponibilidadUnidad` guardando ese mismo motivo — así se puede desglosar por qué estuvo indisponible una unidad en un periodo pasado, no solo su motivo actual (lo usa, por ejemplo, el reporte "Estatus semanal de flota" de la sección 8.4).
- **Reasignar proyecto** — valida que origen y destino estén permitidos al usuario; cierra el registro histórico anterior y abre uno nuevo.
- **Editar capacidad de tanque** (inline) — requiere permiso especial, valida >0.
- **Guardar cambios** (Editar).
- **Imprimir** — `window.print()`.
- **Ocultar/Mostrar SLA** — preferencia personal, no cambia el permiso del rol.
- **Exportar** — CSV cliente.

#### Reglas de negocio no obvias

- **Estatus visible vs. real**: si `estatus = ACTIVO` pero `disponibilidad = false`, el badge muestra **"No disponible"** en vez de "Activo".
- **Días sin operar**: si la unidad está encendida, siempre es 0. Si está apagada con `fechaCambioDisponibilidad`, cuenta desde ese apagado manual. Si nunca se usó el switch, se estima con la señal de actividad más reciente (combustible, TAG o GPS).
- **Licencia del operador vs. licencia requerida**: al editar, si el resguardante tiene licencia Tipo A y la unidad requiere Tipo B (por defecto las grúas), la acción rechaza el guardado.
- **Cambio de placas**: al editar, si cambian, se cierra el registro de placa vigente y se crea uno nuevo con motivo "Actualización de placas" — el historial nunca se sobreescribe.
- **Reasignación de proyecto**: siempre cierra el histórico anterior y abre uno nuevo.
- **SLA de disponibilidad**: se calcula desde `HistoricoDisponibilidadUnidad`. El "SLA mes en curso" es el % de días activa desde el día 1 del mes hasta hoy (parcial, no acumulado). El SLA por proyecto es el promedio simple de las unidades del proyecto que ya tienen datos ese mes. Un SLA <90% se resalta en rojo.
- Toda acción de edición vuelve a validar en el servidor que el proyecto origen/destino esté dentro de los proyectos permitidos al usuario.

#### Notificaciones

No hay correo/push asociado; alertas visuales: banner de mantenimiento vencido, KPI de seguro por vencer, banner de "sin proyecto", semáforo de color, resaltado rojo de SLA <90% y días sin operar.

---

### 5.2 Módulo A.1 — Checklist

**Rutas:** `/checklist`, `/checklist/[id]`, `/checklist/historial`.

#### Propósito

Inspección diaria y semanal de unidades, más checklist de carga de combustible. Reemplaza un formulario externo (Fast Field).

#### Pantallas

**`/checklist`**: tres tarjetas de inicio (Checklist Diario, Checklist Semanal — "Inspección completa de 59 puntos", Carga de Combustible), cada una abre un wizard de pantalla completa. Banner con unidades activas sin checklist diario hoy. Dos listas del día ("Checklists diarios de hoy" y "Checklists semanales de hoy"), filas expandibles con buscador.

**`/checklist/historial`**: selector de fecha + tabla de checklists Diarios de esa fecha, casillas de selección, botón Exportar (CSV — todos o seleccionados).

**`/checklist/[id]`**: vista de detalle imprimible, secciones según tipo (Diario: datos generales, puntos de inspección, niveles, exterior, documentos en cabina, lecturas y evidencia, seguridad y equipamiento con firma; Semanal: datos generales + un bloque por sección; Carga de Combustible: generales, vehículo, carga con galería y firma).

**Chips de color**: Verde (BUEN ESTADO, MAXIMO, OK, SÍ, CON VIGENCIA), Rojo (MAL ESTADO, MINIMO, REVISAR, FALLA, NO, SIN VIGENCIA, ROTO, ESTRELLADO), Amarillo (MEDIO), Gris (otro valor).

#### Wizard Checklist Diario — 7 pasos

1. **Identificación**: Proyecto (si aplica) + Número económico* (combobox).
2. **Datos generales**: Zona* (Michoacán, Jalisco, Guerrero, Estado de México, CDMX, Colima, Guanajuato, Querétaro, Aguascalientes, Sonora, Sinaloa, Nayarit), Municipio* (dependiente), Área* (Operaciones, Administración, Mantenimiento, Logística, Campo, Supervisión, Dirección), Responsable* (dependiente), Tipo de licencia* (CON VIGENCIA/SIN VIGENCIA), Foto de licencia*.
3. **Guía**: 6 puntos uno a la vez — "OK — Todo en orden" (avanza automático) o "⚠ Revisar" (foto opcional): Luces, Frenos, Llantas, Niveles, Documentos a bordo, Limpieza general.
4. **Niveles**: ¿Luz de check encendida?* + foto*; Nivel de combustible* (MÍNIMO/MEDIO/MÁXIMO) + foto*.
5. **Exterior**: ¿Tiene golpes?*, Foto frente*, Estado de parabrisas/espejos* (BUEN ESTADO/ESTRELLADO/ROTO/N-A) + foto*, Foto lado derecho*, Foto trasera*, Foto lado izquierdo*, (solo Grúa) Foto brazo de grúa*.
6. **Interior**: Foto tarjeta de circulación*, Foto tarjeta de combustible*.
7. **Lecturas**: Odómetro (km)* (>0), Foto del odómetro*, (Grúa) Horómetro opcional + Foto* obligatoria.
8. **Seguridad y firma**: ¿Refacción?*+foto*, ¿Gato?*+foto*, ¿Cables de corriente?*+foto*, Observaciones (opcional), **Firma del responsable\*** (pad táctil).

Fotos: JPG/PNG/WEBP/HEIC, máx. 20 MB, subidas a Vercel Blob privado.

#### Wizard Checklist Semanal — una pregunta por pantalla

Licencia permanente (Sí/No) → foto de licencia* → odómetro (+foto)* → (Grúa) horómetro → luego 4 secciones (59 puntos totales):

| Sección | Campos |
|---|---|
| **Niveles** (7) | Aceite*+foto*; aceite de grúa (solo Grúa, opcional); líquido de frenos*+foto*; líquido de dirección*+foto* (Mín/Medio/Máx/No aplica); anticongelante*+foto*; líquido de transmisión*+foto*; bayoneta de aceite*+foto* |
| **Exterior** (20) | Frente, parabrisas delantero*+foto*, espejos laterales, faros (del. izq/der, neblineros), llantas (del. der./izq., tras. der./izq.), laterales, parte trasera, faros traseros (izq., generales), parabrisas posterior*+foto*, refacción*+foto, llantas (estado general)*+foto*, antena*+foto* |
| **Interior** (19) | Orden y limpieza cabina*+foto*, espejo retrovisor, tablero*+foto*, % combustible* (0–100), evidencia de combustible*, tarjeta de circulación*, póliza de seguro, freno de estacionamiento, claxon, luces (cortas/largas/direccionales/stop/intermitentes), papel de verificación*+foto*, volante*+foto*, batería*+foto*, cinturones*+foto*, ventanillas*+foto* |
| **Herramientas** (5) | Gato*, herramientas de palanca*, triángulo reflejante, evidencia de herramientas*, observación de irregularidades (opcional) |

Campos `soloTipoVehiculo: GRUA` solo se piden si la unidad es tipo Grúa. Las fotos del Semanal se suben con **carga directa a Vercel Blob** desde el navegador (a diferencia del Diario). La "Oficina/Sede" del resumen se toma automáticamente del nombre del proyecto — no se pregunta.

#### Wizard Carga de Combustible — 3 pasos

1. **Generales**: Fecha*, Zona*, Municipio*, Área*, Responsable*, Tipo de licencia*, Foto de licencia*.
2. **Vehículo**: Tipo de vehículo*, Número económico* (filtrado por tipo), Modelo (autocompletado).
3. **Carga**: Tipo de combustible* (Gasolina Regular/Premium/Diésel), Foto odómetro antes*, Foto odómetro después*, Evidencia de bomba 1*, Evidencia de bomba 2 (opcional), Foto del ticket*, Observaciones (opcional), Firma (recomendada).

#### Reglas de negocio no obvias

- Los tres tipos comparten el modelo `Checklist` (campo `tipo`). El Diario usa `odometro`+`puntosInspeccion` y también `respuestasSemanal` para las secciones extra añadidas después. El Semanal y el de Carga de Combustible solo usan `respuestasSemanal`.
- Se asocia siempre a un `numeroEconomico`, nunca directamente al proyecto; el permiso se valida contra el `proyectoId` de la unidad al guardar.
- En el Diario, marcar un punto "OK" avanza automáticamente; "Revisar" permite (no obliga) adjuntar foto.
- Horómetro solo relevante para Grúas.

#### Notificaciones

Todas en pantalla: banner de unidades sin checklist diario del día, badge "X alertas" en checklists Semanales (cuenta "MAL ESTADO"), íconos ✓/⚠. No se detectó envío de correo/push.

---

### 5.3 Módulo B — Alta / Baja de Unidades

**Rutas:** `/altas-bajas`, `/altas-bajas/nueva`, `/altas-bajas/importar`, `/unidades/[numeroEconomico]/baja`.

#### Propósito

Alta y baja lógica de unidades del parque vehicular, más importación masiva. *"El alta se hace desde aquí; la baja lógica se inicia desde la Ficha de cada unidad."*

#### Pantallas

**`/altas-bajas`**: botones "Importar desde Excel" y "Dar de alta". "Movimientos recientes (Bitácora)": últimos 30 registros con buscador y badges — Alta (verde), Baja (rojo), Reactivación (azul), Edición (gris).

**`/altas-bajas/nueva`**: formulario guiado con validación en línea de unicidad (económico, placas, VIN), bloques: Identificación, Vehículo, Asignación, Documentación, Tarjetas.

**`/altas-bajas/importar`**: wizard de 4 pasos (Subir → Mapear → Confirmar → Resultado). Soporta libros con muchas hojas; permite elegir Proyecto por defecto; auto-mapeo de columnas editable; vista previa de 5 filas; resultado con Creadas/Actualizadas/Omitidas/Advertencias.

**`/unidades/[numeroEconomico]/baja`**: wizard de 2 pasos — formulario (Motivo, Fecha efectiva, Comentario) y confirmación explicando que cierra asignación/resguardo vigentes y conserva el historial íntegro.

#### Campos — Alta de Unidad

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| Número económico | texto (mono), ej. "KAB-120" | Sí | Normalizado mayúsculas/guiones; valida unicidad |
| Placas | texto (mono) | Sí | Mayúsculas sin espacios; valida unicidad |
| N° de serie (VIN, 17 caracteres) | texto (mono) | Sí | valida unicidad |
| Marca | texto | Sí | |
| Unidad / modelo comercial | texto | Sí | |
| Año | número | Sí | min 1990, max 2100 |
| Tipo | select | Sí | Auto, Camioneta, Grúa, Moto, Otro |
| Tipo de combustible | select | Sí | Gasolina, Diésel, Eléctrico, Híbrido |
| Rendimiento promedio km/L | número | No | |
| Capacidad máxima de tanque (litros) | número | **Sí** (a diferencia de Editar) | |
| Proyecto | select | Sí | Solo proyectos activos permitidos |
| Responsable de resguardo | select | No | |
| Tag IAVE | texto (mono) | No | |
| Origen de placa | texto | Sí | Ej. Tamaulipas |
| Propietario | select | Sí | SYM, 5 STAR SYSTEM, KABAT, Otro |
| Tarjeta de circulación (PDF) | archivo | No | solo PDF |
| N° de tarjeta de combustible | texto (mono) | No | |
| Tarjeta de combustible (foto/PDF) | archivo | No | PDF/JPEG/PNG/WEBP/HEIC/HEIF |

#### Campos — Dar de baja

| Campo | Tipo | Obligatorio | Opciones |
|---|---|---|---|
| Motivo de baja | select | Sí | Venta, Siniestro total, Fin de vida útil, Devolución, Consignación cerrada, Otro |
| Fecha efectiva | fecha | Sí | No posterior a hoy; no anterior al último gasto vehicular registrado |
| Comentario | textarea | No | |

#### Campos mapeables — Importador de unidades

N° económico\*, Placas\*, N° de serie\*, Marca\*, Unidad/modelo\*, Año\*, Tipo de vehículo\*, Tipo de combustible\*, Rendimiento, Kilometraje, Capacidad de tanque, Proyecto, Estatus, Resguardante, Propietario, Origen de placa, Tag IAVE, N° de tarjeta de combustible.

#### Reglas de negocio no obvias

- **Alta**: valida duplicidad de número económico, placas y VIN por separado. Crea con `estatus = ACTIVO`, `disponibilidad = true`; crea el primer registro de historial de placas; abre el primer periodo de disponibilidad (para el SLA).
- **Baja**: es lógica, no borrado. Al confirmar: `estatus = BAJA`, `disponibilidad = false`, `proyectoId = null` (queda sin proyecto), se guardan motivo/comentario, se cierran los `Resguardo` abiertos. Ya no se puede encender/apagar ni editar.
- **Fecha efectiva**: rechaza fechas anteriores al último gasto vehicular registrado.
- **Importación**: mismas validaciones obligatorias que el alta manual; si faltan, la fila se omite. Número económico existente → actualiza; si no existe → crea. Valores no reconocidos (vía diccionario de alias, ej. "PICKUP"→Camioneta) se importan con valor por defecto y generan advertencia, no bloqueo. Duplicado dentro del mismo archivo se omite en su segunda aparición. Alcance de proyecto también se valida por fila.
- Toda alta/baja/importación queda en `BitacoraCambio` y en el log de actividad general.

#### Notificaciones

Ninguna por correo/push. Solo el resumen de resultados de importación y la bitácora de movimientos recientes.

---

## 6. Operación y gasto

### 6.1 Módulo C — Mantenimiento y Gastos Vehiculares

**Rutas:** `/mantenimiento`, `/mantenimiento/nueva`.

#### Propósito

Registra y da seguimiento a los 14 tipos de gasto vehicular (`CategoriaGasto`), desde mantenimiento hasta viáticos de operación, incluyendo el ciclo administrativo completo (SC → ODC → factura → CXP → pago).

- **Ver**: nivel `ver`.
- **Registrar una nueva orden**: nivel `editar`.
- **Marcar una orden como "Realizado"**: nivel `aprobar`.
- **Editar campos administrativos** de una orden ya creada: nivel `editar`.
- **Eliminar una orden**: exclusivo del **Administrador**, con motivo obligatorio (mín. 5 caracteres) registrado en Bitácora.

#### Pantallas

**`/mantenimiento`**: botón "Nueva orden". 5 tarjetas: Órdenes programadas, Vencidas/atrasadas, Gasto total registrado, Categorías con movimiento, Mant. preventivo vencido. Banner rojo si hay mantenimiento preventivo vencido por unidad. **Pendientes** (estatus PROGRAMADO, buscador, fecha en rojo si venció, acciones "Ver orden"/"Marcar realizado"). **Historial reciente** (los 30 más recientes por fecha, todos los estatus — con nota en pantalla de que solo se muestran esos 30; a partir de 2 caracteres el buscador consulta el **historial completo en el servidor** — unidad, proyecto, categoría o proveedor — y esos resultados, hasta 100 filas, reemplazan a los 30 mientras haya texto). **Reporte por categoría** (barra de progreso por `CategoriaGasto`).

**`/mantenimiento/nueva`**: formulario de alta.

#### Campos — Alta de gasto

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| Categoría | select | Sí | 13 categorías (todo `CategoriaGasto` menos Casetas, que solo se captura en Módulo E): Mant. preventivo, Mant. correctivo, Llantas, Refacciones, Consumibles, Tenencia, Verificación, Emplacamiento, Estacionamiento, Multas, Renta de vehículos, Gasolina, Viáticos de operación |
| Número económico / Proyecto | combobox / select | Sí (uno u otro) | Se pide Número económico salvo para **Viáticos de operación**, que se reporta a Proyecto |
| Descripción | texto libre | No | |
| Fecha | date | Sí | Máximo = hoy |
| Costo (MXN) | número decimal | Sí | |
| Km al momento | número entero | No | |
| Taller / proveedor | texto | No | |
| SC (Solicitud de compra) | texto (mono) | No | Folio SAP |
| ODC (Orden de compra) | texto (mono) | No | Folio SAP |
| Estatus | select | No (default Programado) | Programado, Realizado, Pagado, Cancelado |
| Fecha ingreso taller | date | No | Máximo = hoy |
| Fecha estimada de salida | date | No | Si se supera, se marca vencida |

**Edición de orden ya creada** añade: Servicio, Empresa, Entrada SAP, Fecha requisición, Fecha ODC, Fecha factura, Fecha CXP, Fecha de pago, más Costo* y Estatus* obligatorios. No permite cambiar categoría ni número económico.

**Eliminar orden** (Administrador): textarea "Razón de la eliminación\*", mínimo 5 caracteres.

#### Acciones

- Nueva orden (crea `GastoVehicular`, nivel `editar`).
- Marcar realizado (nivel `aprobar`).
- Ver orden / ocultar (acordeón local).
- Editar orden → Guardar cambios (nivel `editar`).
- Eliminar orden → confirmación con motivo (Administrador).

#### Reglas de negocio no obvias

- Todas las categorías se atan a unidad **excepto** Viáticos de operación (a proyecto).
- **Casetas** existe en el catálogo pero no se puede capturar aquí — su única fuente es el Módulo E (TAG).
- **Alerta de mantenimiento preventivo**: compara el km oficial actual contra el km del último `GastoVehicular` de categoría Mant. Preventivo con estatus Realizado/Pagado; si supera el `intervaloKm` configurado por tipo de vehículo, se marca vencida. Si el tipo tiene `intervaloHoras`, también compara horómetro (de los Checklist). Puede estar vencida por ambos motivos.
- **Temporizador de taller**: si hay `fechaIngresoTaller`, contador de días en taller (actualiza cada minuto); si supera `fechaEstimadaSalida`, se resalta en rojo "VENCIDA".
- Validación de alcance de proyecto en servidor, independiente de lo que permita seleccionar el formulario.
- **Proyecto del gasto**: un gasto ligado a unidad se vincula al periodo de proyecto vigente de esa unidad (`UnidadHistoricoProyecto`), no a su `proyectoId` actual — así el historial no cambia de proyecto retroactivamente si la unidad se reasigna después. Si la unidad no tiene un periodo abierto (unidades dadas de alta antes de que esto existiera), se abre uno automáticamente con su proyecto actual al capturar el primer gasto.

#### Notificaciones

Vía el motor central de notificaciones (`/usuarios/notificaciones`): gastos próximos a vencer de categorías Mant. preventivo, Mant. correctivo, Tenencia, Verificación y Renta de vehículos con estatus PROGRAMADO dentro de la ventana configurada. Severidad alta (ya venció), media (≤7 días), baja (resto). El banner rojo del propio panel es independiente de este sistema.

---

### 6.2 Módulo D — Combustible

**Rutas:** `/combustible`, `/combustible/autorizacion`, `/combustible/importar`, `/combustible/mapeo-tarjetas`.

#### Propósito

Registra transacciones de carga de combustible (manual o por archivo), calcula rendimiento (km/L) y detecta anomalías de sobrellenado; incluye submódulo de autorización cuando el gasto de combustible de un proyecto excede su presupuesto mensual.

- **Ver**: nivel `ver`.
- **Registrar carga, importar, crear mapeo, solicitar/responder autorización**: nivel `editar` (tanto solicitar como aprobar/rechazar requieren el mismo nivel — no hay un nivel "aprobar" diferenciado aquí, pese al nombre del submódulo).
- **Eliminar una carga**: exclusivo del Administrador, con motivo obligatorio.

#### Pantallas

**`/combustible`**: botones Autorizaciones, Mapeo tarjeta → económico, Importar transacciones. 4 tarjetas: Litros acumulados, Gasto acumulado, Rendimiento promedio flota, Unidades con carga. Formulario de captura manual siempre visible. **Transacciones por unidad**: acordeón con badge "N sobrellenado" (rojo) o rendimiento promedio (verde) por unidad; al expandir, tabla con badge "Excede capacidad" por fila. **Rendimiento por unidad**: lista simple.

**`/combustible/autorizacion`**: ver campos abajo.

**`/combustible/importar`**: wizard de 4 pasos.

**`/combustible/mapeo-tarjetas`**: registro de qué tarjeta corresponde a qué unidad.

#### Campos — Captura manual

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| Unidad | combobox | Sí | |
| Fecha | date | Sí | Máximo = hoy |
| Litros | número (paso 0.1) | Sí | |
| Costo | número (paso 0.01) | Sí | |
| Kilometraje | número entero | Sí | |
| Estación | texto | No | |

#### Campos — Mapeo Tarjeta → Económico

| Campo | Tipo | Obligatorio |
|---|---|---|
| Número de tarjeta | texto (mono, llave primaria) | Sí |
| Unidad | select | Sí |
| Proveedor | texto libre (ej. "Efectivale") | Sí |
| Vigente desde | date | Sí |

Tabla: Tarjeta, Unidad, Proveedor, Vigente desde, Vigente hasta ("Vigente" si nulo).

#### Campos — Solicitud de autorización de combustible

| Campo | Tipo | Obligatorio |
|---|---|---|
| Proyecto | select | Sí |
| Número económico (opcional) | texto | No |
| Monto solicitado (MXN) | número (min 1) | Sí |
| Litros (opcional) | número | No |
| Motivo de la solicitud | textarea | Sí |

Campos ocultos: `periodoPresupuesto` (AAAA-MM del mes actual) y `excedente` (autogenerado).

#### Campos mapeables — Importador de combustible

N° económico\*, Fecha\*, Litros\*, Costo\*, Kilometraje\*, Estación (opcional).

#### Acciones

- Registrar (captura manual → `Combustible`, `fuente = MANUAL`).
- Importar transacciones (wizard: Analizar → mapear → Continuar → Confirmar importación → resumen Importadas/Omitidas-duplicadas/Advertencias).
- Agregar (mapeo tarjeta→económico).
- Eliminar (fila, solo Administrador).
- Nueva solicitud de autorización (botón cambia a naranja "Solicitar autorización (N proyectos excedidos)" cuando aplica).
- Responder solicitud → Aprobar / Rechazar (con observaciones opcionales); solo mientras `estatus = PENDIENTE`.

#### Reglas de negocio no obvias

- **Rendimiento**: al crear una carga, busca la transacción anterior de la misma unidad con menor kilometraje; `rendimiento = (kmActual − kmAnterior) / litros`. Primera carga → `null`.
- **Alerta de sobrellenado**: requiere `capacidadTanqueLitros` capturada (si no, la captura manual se rechaza). Encadena cada carga con la anterior estimando litros consumidos por rendimiento histórico, y calcula el nivel estimado del tanque antes/después de cada carga; `alertaSobrellenado = nivelEstimadoDespues > capacidadTanqueLitros`.
- **Duplicados en importación**: se omite fila con misma unidad+fecha+litros+costo.
- **Hallazgo**: el "Mapeo Tarjeta → Económico" es un registro administrativo independiente — el importador **no lo consulta**; exige que el archivo traiga directamente el número económico.
- **Hallazgo**: `ConfiguracionProveedorCombustible` (plantillas de mapeo de columnas por proveedor) existe en el modelo de datos pero no tiene pantalla ni lógica asociada — cada importación exige remapear columnas manualmente.
- **Autorización de combustible**: compara, para el mes en curso, el `PresupuestoPartida` de categoría Gasolina por proyecto contra la suma real de `Combustible.costo` (agrupado por `proyectoReportanteId`). Si excede, el proyecto aparece "excedido" y el excedente se anexa automáticamente a la solicitud.

#### Notificaciones

**Hallazgo**: no existe notificación de campana para combustible (ni por caída de rendimiento, ni recarga de presupuesto, ni solicitudes pendientes). Las únicas señales son visuales en pantalla (badges y barras de progreso).

---

### 6.3 Módulo E — TAG / Peajes

**Rutas:** `/tag`, `/tag/importar`.

#### Propósito

Registra el gasto de casetas vía tres proveedores de tag electrónico, agrupado por unidad.

- **Ver**: nivel `ver`.
- **Registrar manual, importar, asignar económico a pendiente**: nivel `editar`.
- El nivel `aprobar` ya no desbloquea ninguna acción distinta a `editar` (ver Nota histórica abajo).

#### Pantallas

**`/tag`**: botón Importar estado de cuenta. 3 tarjetas: Transacciones totales, Gasto acumulado, Pendientes de asignar. Formulario de registro manual (panel plegable). **Pendientes de asignar económico**: tabla con combobox + botón Asignar por fila. **Transacciones TAG por unidad**: acordeón agrupado por número económico, con buscador.

**`/tag/importar`**: wizard de 4 pasos.

#### Campos — Transacción manual

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| Unidad (opcional) | combobox | No | Puede quedar sin asignar |
| Fecha | date | Sí | Máximo = hoy |
| Monto | número (paso 0.01) | Sí | |
| Caseta | texto | No | |
| Proveedor | select | Sí | IAVE, PASE, Televía |

#### Campos mapeables — Importador de TAG

Fecha\*, Monto\*, Caseta (opcional), N° económico (opcional). Selector de Proveedor\* fijo para todo el archivo.

#### Acciones

- Registrar (crea `Tag`).
- Asignar (fila pendiente, nivel `editar`).
- Importar estado de cuenta (wizard igual al de Combustible).

#### Reglas de negocio no obvias

- **Nota histórica**: hasta el 31 de agosto de 2026 existía un botón manual "Conciliar" (y un campo `Tag.conciliado`) que solo marcaba la transacción como revisada, sin comparar nada contra GPS — pese a que la descripción del módulo llegó a decir "conciliación cruzada con GPS". Se retiró por completo (botón, campo, badge "Conciliadas") y se sustituyó por 3 alertas automáticas de triangulación TAG/combustible/GPS que sí cruzan datos reales — ver sección 10.
- **Duplicados**: fecha+monto+caseta del mismo proveedor.
- Número económico no reconocido: la fila se importa igual con `numeroEconomico = null`, con advertencia, y va a "Pendientes de asignar".
- Transacciones sin unidad ni proyecto reportante son visibles para cualquier usuario con acceso al módulo, sin filtrar por proyectos asignados (limitación conocida).

#### Notificaciones

Ninguna de campana propia del módulo; las alertas de triangulación TAG/combustible/GPS (sección 10) sí aparecen en la campana general y enlazan a la ficha de unidad, no a `/tag`.

---

### 6.4 Módulo F — Seguros + Coberturas

**Rutas:** `/seguros`, `/seguros/nueva`, `/seguros/[id]`, `/seguros/[id]/tarjeta`.

#### Propósito

Administra pólizas por unidad (vigencia, costo, documento PDF), con seguimiento de vencimientos y tarjeta imprimible. El detalle comercial (aseguradora, costo, coberturas) y la descarga del PDF están restringidos por rol — no todo el que puede dar de alta una póliza puede después consultarla.

- **Ver el listado `/seguros` y el detalle comercial de una póliza**: requiere `puedeVerPolizaSeguro` — rol global (Administrador), **Dirección**, **Gerente administrativo** o **Jurídico**. Un rol con `F: ver` pero fuera de esta lista (ej. Control Vehicular) no puede entrar a `/seguros` en absoluto; la ficha de unidad tampoco le muestra el detalle en la pestaña Seguro.
- **Registrar póliza, renovar, subir/reemplazar PDF**: nivel `editar` del módulo F — disponible aunque no se tenga `puedeVerPolizaSeguro` ("alta a ciegas": se captura sin poder consultar después).
- **Descargar el PDF cargado o la tarjeta imprimible**: requiere `puedeDescargarPolizaSeguro` — rol global, **Dirección** o **Jurídico** (más restrictivo que `puedeVerPolizaSeguro`: Gerente administrativo puede ver pero no descargar).
- **Editar los datos ya capturados de una póliza** (aseguradora, número, fechas, costo, coberturas): requiere `puedeEditarPolizaCompletaSeguro` — rol global o **Jurídico** (antes era exclusivo del Administrador).

#### Pantallas

**`/seguros`** (requiere `puedeVerPolizaSeguro`): botón Registrar póliza. 4 tarjetas: Vigentes, Por vencer, Vencidas, Unidades sin póliza. Banner con unidades activas sin ninguna póliza. Lista con buscador y badge de Estatus.

**`/seguros/nueva`**: formulario de alta (puede preseleccionar unidad por query string) — accesible con solo `editar`, sin necesitar `puedeVerPolizaSeguro`.

**`/seguros/[id]`**: si el usuario no tiene `puedeVerPolizaSeguro`, la página muestra solo "Póliza {número}" + badge de estatus, un aviso de que no puede ver el detalle comercial, y los botones Renovar/Subir documento — sin aseguradora, costo, vigencia ni coberturas (recortado también en el servidor, no solo ocultado en el cliente). Con el permiso: encabezado con aseguradora — número de póliza, badge de estatus; panel resumen (Vigencia, Costo, Vencimiento con conteo de días, rojo si ≤30 o vencida); tabla de Coberturas (si la póliza las tiene, ver nota abajo). Botones: Renovar póliza, Subir/Reemplazar PDF, enlace a la tarjeta solo si `puedeDescargarPolizaSeguro`, botón Editar póliza solo si `puedeEditarPolizaCompletaSeguro`.

**`/seguros/[id]/tarjeta`**: requiere `puedeDescargarPolizaSeguro` (antes bastaba con `F: ver`). Vista imprimible tipo tarjeta (logo, número económico, aseguradora, póliza, vehículo, placas, vigencia, costo, coberturas resumidas).

#### Campos — Registrar póliza

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| Número económico | combobox | Sí (solo alta; fijo en edición) | |
| Aseguradora | texto | Sí | |
| Número de póliza | texto (mono) | Sí | |
| Costo | número (paso 0.01) | Sí | |
| Fecha de inicio | date | Sí | |
| Fecha de vencimiento | date | Sí | |
| PDF de la póliza | archivo (solo PDF) | **Sí** | Documento oficial emitido por la aseguradora — antes de esto opcional, se subía después |

**Nota**: hasta el 26 de agosto de 2026 este formulario también capturaba un sub-formulario dinámico de Coberturas (tipo, suma asegurada, deducible), precargado con RC daños a terceros y Daños materiales. Se retiró — el alta ya solo pide los datos de la póliza y el PDF. Las pólizas creadas antes de ese cambio conservan las coberturas que ya tenían capturadas (por eso la tabla de Coberturas de `/seguros/[id]` sigue existiendo); las nuevas simplemente no la generan.

#### Campos — Editar póliza (solo `puedeEditarPolizaCompletaSeguro`)

Mismos campos que Registrar (aseguradora, número, costo, fechas) más edición de las coberturas ya existentes de esa póliza — reemplaza todo (borra y recrea). No añade coberturas nuevas a una póliza que nunca las tuvo.

#### Campos — Renovar póliza

| Campo | Tipo | Obligatorio |
|---|---|---|
| Nueva fecha de vencimiento | date | Sí |
| Nuevo costo | número | No |

#### Campos — Subir PDF

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| Archivo PDF | file | Sí | Debe ser `application/pdf` |

#### Acciones

- Registrar póliza → Guardar póliza (crea `Seguro` y sube su PDF; ya no crea `CoberturaSeguro`).
- Renovar póliza → Confirmar renovación (solo fecha y opcionalmente costo).
- Subir/Reemplazar PDF de la póliza.
- Editar póliza (modal, requiere `puedeEditarPolizaCompletaSeguro`) → Guardar cambios (reemplaza todo, incluidas las coberturas que ya tuviera — borra y recrea).
- Tarjeta de seguro (PDF) → botón de impresión, requiere `puedeDescargarPolizaSeguro`.

#### Reglas de negocio no obvias

- **Estatus se recalcula automáticamente** a partir de `fechaVencimiento`: VENCIDO (ya pasó), POR_VENCER (≤30 días), VIGENTE (más de 30 días). El valor `RENOVADO` del enum existe pero **no se asigna en ningún flujo revisado**.
- **Renovar vs. Editar**: dos flujos con distinto permiso a propósito — Renovar (nivel editar del módulo) solo toca vigencia/costo (ciclo normal); Editar (`puedeEditarPolizaCompletaSeguro`) permite corregir cualquier dato, incluida la identidad de la póliza.
- **Ver vs. Editar vs. Descargar son tres permisos independientes**, no una escalera: Gerente administrativo puede ver el detalle comercial pero no descargar el PDF ni editar; Control Vehicular puede registrar/renovar/subir documento sin poder ver ni descargar nada después; Jurídico puede ver, descargar y editar, pero no aparece en `ROLES_VER_POLIZA_SEGURO` de forma redundante con "ver" — está en las tres listas por separado en `src/lib/permisos.ts`.
- Suma asegurada/deducible en 0 se muestran como "Amparada" / "—" (solo relevante para pólizas con coberturas heredadas de antes del 26 de agosto de 2026).
- Si el usuario no tiene el proyecto de la unidad dentro de sus permitidos, la ficha responde 404 (independiente de `puedeVerPolizaSeguro`, que se evalúa después).

#### Notificaciones

Vencimiento de seguro vía el motor central: pólizas VIGENTE/POR_VENCER dentro de la ventana configurada (`alertaSeguroDiasPrevios`), severidad alta/media/baja. El resaltado en rojo por ≤30 días es una regla fija independiente del umbral configurable.

---

## 7. Geolocalización

### 7.1 Módulo G — Geolocalización / IntelliHub

**Rutas:** `/mapa`, `/mapa/historial`.

#### Propósito

Centraliza la última posición GPS conocida de cada unidad activa y el historial de recorrido. **Opera en modo "simulación"**: el registro de posiciones se hace de forma manual mientras se conecta el proveedor real (IntelliHub, indicado como "Fase 2" — el mapa en tiempo real aún no está activo).

- **Ver**: consultar última posición, historial y estadísticas.
- **Editar**: además, registrar posiciones manuales.

#### Pantallas

**`/mapa`**: accesos a Historial de recorrido e Integridad de datos (G.1). 4 tarjetas: Unidades activas, Con señal reciente, Sin señal registrada, Con anomalía en último punto. Formulario "Registrar posición manual" (colapsable). Tabla "Última posición conocida" por unidad con buscador, columnas Unidad, Proyecto, Última actualización, Lat, Lng, Velocidad, **Estatus GPS** (badges: Sin datos / Anómalo con motivo / Válido).

**`/mapa/historial`**: filtros Unidad (select), Desde (default 7 días atrás), Hasta (default hoy), botón Filtrar. Resumen de distancia validada en el rango. Tabla de recorrido: Fecha/hora, Lat, Lng, Velocidad, Km validado, Estatus.

#### Campos — Registrar posición manual

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| Unidad | combobox | Sí | |
| Fecha/hora | datetime-local | Sí | |
| Latitud | número (paso 0.0001) | Sí | |
| Longitud | número (paso 0.0001) | Sí | |
| Velocidad (km/h) | número | No | Solo para mostrar |
| Km reportado | número | No | Ver regla de validación de km |

#### Reglas de negocio no obvias

- **Validación de km**: `kmValidado` solo se guarda igual a `kmReportado` si el punto **no** es anómalo; si es anómalo, `kmValidado = null`. Si el punto es válido y trae `kmReportado`, se actualiza `Unidad.kmOficial`.
- **Distancia validada del historial**: solo sobre lecturas con `kmValidado` no nulo.
- **Huecos de señal automáticos**: al registrar una posición, si pasaron más de **15 minutos** desde la anterior de la misma unidad, se crea automáticamente un `HuecoSenalGPS`.
- **Hallazgo**: el modelo `Geocerca` existe en el esquema de datos (nombre, tipo, polígono, proyecto, hora límite) pero **no tiene ninguna pantalla, formulario ni lógica de evaluación implementada** — funcionalidad prevista, no construida.
- **Hallazgo**: los umbrales de alerta GPS configurados en `/usuarios/notificaciones` no tienen, a la fecha de esta revisión, un cron/job que los dispare — son parámetros a la espera de un motor de alertas.

#### Notificaciones

Configurables en `/usuarios/notificaciones`, bloque "Geolocalización (Módulo A / G.1)": alerta de unidad disponible sin reporte GPS (horas) y alerta de señal perdida/huecos (minutos). Ver hallazgo arriba sobre su estado no conectado a un disparador automático.

---

### 7.2 Módulo G.1 — Integridad de datos GPS

**Ruta:** `/mapa/integridad`.

#### Propósito

Panel de control de calidad de datos GPS: filtra lecturas imposibles, detecta pérdidas de señal y valida kilometraje. Permiso independiente del Módulo G. Pantalla de solo consulta — los datos se generan automáticamente desde el Módulo G.

#### Pantalla

4 tarjetas: Lecturas procesadas, Puntos anómalos (Capa 1), Huecos de señal (Capa 2), Patrones recurrentes. Tres tarjetas explicativas de las "capas":
- **Capa 1 — Datos imposibles**: velocidad implícita >180 km/h, fuera de México, o salto de distancia sin puntos intermedios.
- **Capa 2 — Señal perdida**: más de 15 minutos sin transmitir genera un hueco.
- **Capa 3 — Respaldo independiente**: odómetro de checklist y combustible triangulan contra GPS validado; discrepancia >±5% genera alerta (descriptiva — no se encontró implementación del cálculo en este módulo).

Tabla "Puntos anómalos recientes" (últimos 30): Fecha/hora, Unidad, Motivo, Lat, Lng.
Tabla "Huecos de señal registrados" (últimos 30): Unidad, Inicio, Fin ("En curso" si abierto), Duración, Patrón recurrente.

#### Motor de detección (`evaluarAnomalia`)

Orden de evaluación:
1. **FUERA_DE_PAIS**: coordenada fuera de un rectángulo aproximado de México (lat 14.0–33.0, lng -118.5 a -86.0).
2. **VELOCIDAD_IMPOSIBLE**: velocidad implícita (Haversine, distancia/tiempo contra el punto anterior) >180 km/h.
3. **SALTO_DISTANCIA**: distancia contra el punto anterior >300 km.
4. Si nada aplica: válido.

#### Reglas de negocio no obvias

- Huecos se crean automáticamente si pasan >15 min entre posiciones de la misma unidad.
- **Hallazgo**: los campos `distanciaSaltoKm` y `patronRecurrente` del modelo `HuecoSenalGPS` se muestran en pantalla pero no se encontró código que los calcule con el flujo actual de registro manual — quedan en su valor por defecto.
- La "Capa 3" (triangulación ±5%) es una regla de negocio declarada en la interfaz, sin implementación localizada en este módulo.

#### Notificaciones

Comparte el mismo bloque de configuración del Módulo G.

---

## 8. Gestión

### 8.1 Módulo H — Proyectos

**Rutas:** `/proyectos`, `/proyectos/nuevo`, `/proyectos/[id]`, `/proyectos/[id]/presupuesto`, `/proyectos/[id]/presupuesto/importar`.

#### Propósito

Estructura la flota y el gasto por proyecto (unidad de negocio, típicamente ligada a un estado de la república). Administra el catálogo de proyectos, presupuesto (esquema simple mensual + esquema por partida/categoría), y navega a unidades/operadores asignados.

- **Ver**: nivel `ver`.
- **Crear proyecto, editar presupuesto mensual**: nivel `editar`.
- **Ajustar presupuesto aprobado anual** (techo simple): nivel `aprobar`.
- **Editar datos maestros (nombre, estado, fecha inicio, estatus) y eliminar proyecto**: exclusivo del rol global.
- **Importar/reemplazar presupuesto por partida**: además de `H: editar`, requiere el permiso especial `cargarPresupuesto`.

#### Pantallas

**`/proyectos`**: 4 KPIs (Proyectos activos, Unidades asignadas, Presupuesto aprobado {año}, Gastado en {año}). Buscador. Tabla: Proyecto, Estado, Unidades, Presupuesto {año}, Gastado (% en rojo si >90%), Estatus.

**`/proyectos/nuevo`**: formulario simple.

**`/proyectos/[id]`**: tarjetas condicionadas por `modulosActivos` del proyecto (Unidades, Disponibles si A; Operadores si L; Gasto acumulado histórico si C/D/E). Sección "Presupuesto por partida" (widget mensual + ajuste de presupuesto anual colapsable). "Unidades asignadas" (si A). "Operadores del proyecto" (si L).

**`/proyectos/[id]/presupuesto`**: 3 KPIs (Presupuestado, Real, Diferencia anual). Tabla por categoría × 12 meses (Real arriba, Presupuestado abajo por celda) + PTTO anual, Real anual, Diferencia. Fila expandible con desglose por número económico (excepto Viáticos de operación). Indicador "Actualizado hace N h" si hubo recarga reciente. Botón Importar presupuesto (solo con `cargarPresupuesto`).

**`/proyectos/[id]/presupuesto/importar`**: paso 1 "Subir" (Año del presupuesto + archivo .xlsx/.xls); paso 2 "Revisar" (emparejar alias de proyecto del Excel → proyecto real, y texto de partida → una de las 14 categorías); paso 3 "Resultado" (Nuevas, Actualizadas, Sin cambio, Omitidas).

#### Campos — Nuevo proyecto

| Campo | Tipo | Obligatorio |
|---|---|---|
| Nombre del proyecto | texto | Sí |
| Estado de la república | texto libre | Sí |
| Fecha de inicio | date | Sí |

Al crear: `estatus = ACTIVO`, `presupuestoAprobadoAnual = 0`, `modulosActivos = [A,B,C,D,E,F,G,H,I,J,L]` (**N, K, M, R, S, A.1, G.1 no vienen activos por defecto**), `procesosActivos = [checklist_diario, conciliacion_diaria]`.

#### Campos — Editar proyecto (solo rol global)

Nombre, Estado de la república, Fecha de inicio, Estatus (Activo/Cerrado). (`coordinadorId` y `fechaFin` existen en el modelo pero no están expuestos en ningún formulario.)

#### Campos — Presupuesto

- **Presupuesto aprobado {año}**: número, requiere `H: aprobar`.
- **Asignación mensual**: por mes, campo "Asignado" con guardado individual, requiere `H: editar`.
- **Importar — paso Subir**: Año del presupuesto (default año actual), Archivo (.xlsx/.xls, obligatorio).

#### Acciones

Nuevo proyecto, Editar/Eliminar (rol global, con confirmación), Guardar presupuesto anual/mensual, Importar presupuesto (Analizar → Confirmar), Ver año completo, expandir/colapsar partida.

#### Reglas de negocio no obvias

- **Dos sistemas de presupuesto conviven**: el "simple" (un monto por mes sin categorizar) y el "por partida" (por categoría × mes × año, con versionado, alimentado por importación).
- **Versionado al reimportar**: si el monto cambia, se actualiza y `version` +1 (con bitácora); si es igual, "Sin cambio" sin tocar nada; si no existía, se crea con `version = 1`.
- **Resolución de alias de proyecto**: nombre exacto → coincidencia con estado → subcadena; lo no resuelto queda para emparejamiento manual.
- **Origen del "Real" no es uniforme**: Gasolina de `Combustible`; Casetas solo de `Tag`; Viáticos de operación de `GastoVehicular` reportado al proyecto directamente (sin desglose por unidad); el resto de `GastoVehicular` de las unidades.
- **Atribución de gasto por histórico**: el gasto se atribuye al proyecto donde estaba la unidad **en la fecha del gasto** (vía `UnidadHistoricoProyecto`), no al proyecto actual.
- **Visibilidad por módulo activo por proyecto**: cada proyecto tiene su propio `modulosActivos`; para roles no globales, un proyecto solo aparece en un módulo si además tiene ese módulo activado.
- **Eliminar proyecto** solo procede si no tiene unidades, operadores ni gasto asociado; en cascada se borran presupuestos, insumos y configuración de notificación de rescate.
- Crear proyecto solo requiere `H: editar`; editar/eliminar datos maestros requiere rol global — asimetría deliberada.

#### Notificaciones

Indicador visual (no correo/push) de recarga de presupuesto si hubo cambio en las últimas 24h y el toggle está activo.

---

### 8.2 Módulo I — Bitácora de movimientos / Auditoría

**Ruta:** `/auditoria`.

#### Propósito

Buscador de trazabilidad: consulta cualquier movimiento registrado de una unidad, proyecto u operador, construido sobre `ActivityLog` (el log general de actividad de toda la plataforma). Reemplaza el antiguo panel de "Auditoría diaria y calidad".

- **Ver**: único nivel relevante — no hay acciones de escritura.

**Nota sobre el modelo de datos**: existe también `BitacoraCambio` (log más acotado de CREAR/EDITAR/DAR_DE_BAJA/REACTIVAR/ELIMINAR), pero **este módulo I no la lee** — se consulta en otras pantallas puntuales: el listado del Módulo B (`/altas-bajas`) y el indicador de recarga de presupuesto del Módulo H.

#### Pantalla

**`/auditoria`**: combo Tipo (Unidad/Proyecto/Operador) + campo de búsqueda + botón Buscar. Si hay varias coincidencias, se listan antes de mostrar eventos. Línea de tiempo por evento: usuario + descripción, fecha/hora (México), etiqueta del módulo de origen, y el detalle campo: "anterior" → "nuevo" si aplica.

#### Reglas de negocio no obvias

- **Qué trae cada tipo**: Unidad → la unidad + sus gastos, combustible, TAG, seguros, checklists y accidentes; Proyecto → el proyecto + sus filas de presupuesto por partida; Operador → el operador + sus documentos y accidentes.
- Límites: máximo 20 coincidencias de entidad, máximo 300 eventos mostrados (más recientes primero).
- Búsqueda por subcadena, insensible a mayúsculas.

#### Notificaciones

Ninguna — módulo puramente de consulta pasiva.

---

### 8.3 Módulo J — Reportes

**Rutas:** `/reportes`, `/reportes/generador`, `/reportes/presupuesto`, `/reportes/sla`.

#### Propósito

Punto de entrada ejecutivo: dashboard consolidado de flota, gasto y vencimientos, más el generador de reportes configurables enviados por correo.

- **Ver**: todas las páginas de consulta.
- **Crear/pausar/reactivar/ejecutar un reporte programado**: nivel `editar`.
- **SLA**: requiere además el permiso especial `verSlaDisponibilidad`.

#### Pantallas

**`/reportes`** — Dashboard Ejecutivo: 4 tarjetas (Unidades totales, Activas/disponibles, Bajas, Gasto total). 3 tarjetas de vencimientos (Mantenimientos ≤15 días, Seguros ≤30 días, Documentos de operador ≤60 días). Panel "Gasto por categoría". Panel "Presupuesto {año} por proyecto" con enlace al desglose. Panel "Partidas con mayor sobregasto" (top 3). Botones: SLA de disponibilidad (si aplica), Explorador de BI (si módulo M), Generador de reportes.

**`/reportes/generador`**: formulario `ReporteBuilder` + lista de reportes programados existentes (de todos los usuarios).

**`/reportes/presupuesto`**: réplica PTTO/REAL/Diferencia por proyecto y partida, filtro Proyecto/Año.

**`/reportes/sla`**: solo con `verSlaDisponibilidad`. Tabla histórica Mes/Proyecto/Unidades con datos/% SLA promedio; SLA mensual, no acumulado, mes en curso parcial. Color de alerta si <90%.

#### Campos — Generador de Reportes

| Campo | Etiqueta | Tipo | Obligatorio | Opciones |
|---|---|---|---|---|
| `nombre` | Nombre del reporte | texto libre | Sí | — |
| `tipo` | Tipo | combo | Sí | Inventario de unidades, Mantenimiento y gastos, Combustible, Seguros y vencimientos, Operadores y documentación, Ubicación nocturna |
| `campos` | Campos a incluir | checkboxes (según tipo) | Sí (mín. 1) | — |
| `destinatarios` | Destinatarios (correos, coma) | texto libre | Sí (mín. 1) | — |
| `hora` | Hora de envío | time | No (default 08:00) | — |
| `frecuencia` | Frecuencia | combo | No (default Semanal) | Diario, Semanal (lunes), Mensual (día 1) |
| `formato` | Formato del archivo | combo | No (default Excel) | Excel, PDF |

Campos disponibles por tipo: Inventario de unidades (N° económico, Placas, Proyecto, Estatus, Km oficial); Mantenimiento y gastos (Categoría, Costo, Estatus, Proveedor); Combustible (Litros, Costo, Rendimiento); Seguros y vencimientos (Aseguradora, Vencimiento, Estatus); Operadores y documentación (Nombre, Proyecto, Estatus documental); Ubicación nocturna — plantilla predefinida (N° económico, Última posición, Hora de reporte).

#### Acciones

- **Crear y programar** — crea `ReporteProgramado` (`filtrosJson: {}` — el generador no expone filtros adicionales, solo campos).
- **Ejecutar ahora** — dispara el mismo motor que el cron; síncrono.
- **Pausar / Reactivar** — alterna `activo`; un reporte pausado nunca corre en el cron.
- **No existe editar ni eliminar** un reporte programado ya creado.

#### Motor de ejecución (compartido cron / "Ejecutar ahora")

1. Sin destinatarios → estatus `sin_destinatarios`, no envía.
2. Resuelve el alcance de proyecto del **dueño del reporte** (no de quien lo ejecuta manualmente).
3. Resuelve filas reales (máx. 500 filas para mantenimiento/combustible/seguros).
4. Genera Excel o PDF.
5. Envía por correo (requiere SMTP configurado; si falta, estatus `error`).
6. Registra en `EjecucionReporteProgramado` y actualiza `ultimaEjecucionEn`/`ultimoEstatus`/`ultimoErrorDetalle`.
7. Si exitoso, registra auditoría en `AccesoReporteBI` (`recibio_correo`).

**Cron de Vercel** (`0 * * * *`, cada hora): filtra por hora configurada (huso México); Diario corre siempre, Semanal solo lunes, Mensual solo día 1; evita reenvíos duplicados dentro del mismo periodo.

#### Reglas de negocio no obvias

- El alcance de proyecto de un reporte se recalcula en cada ejecución (no se congela al crear).
- El generador no permite filtros adicionales — solo elección de columnas.
- "Ejecutar ahora" y el cron comparten exactamente el mismo motor.

---

### 8.4 Módulo M — Dashboards

**Rutas:** `/dashboards`, `/dashboards?tab=explorador`, `/dashboards?tab=inventario`, `/reportes/metricas`.

#### Propósito

Unifica en pestañas los dashboards guardados (widgets en cuadrícula), el explorador libre de BI (lenguaje natural, insights, forecast, análisis avanzado) y, para quien también tiene acceso al Módulo A, el Inventario de Unidades. Las primeras dos eran pantallas separadas (`/dashboards` y `/reportes/bi`); la tercera reutiliza tal cual el resumen de `/unidades`. Las tres corren sobre el mismo motor `/api/bi/query` salvo la de Inventario, que no pasa por BI.

- **Ver**: consulta de dashboards/explorador/inventario.
- **Editar**: guardar/eliminar vistas, crear/editar/eliminar métricas de negocio, botón "Editar dashboard", y activar/editar el envío automático del reporte "Estatus semanal de flota" (ver abajo).

#### Pestañas

| Pestaña | Contenido | Requiere |
|---|---|---|
| Mis dashboards | Cuadrícula de vistas guardadas (`BiDashboardEditor`) | `M: ver` |
| Explorador libre | `BiExplorer` — combinaciones ad-hoc, lenguaje natural, insight, forecast, análisis avanzado (ver abajo) | `M: ver` |
| Inventario de Unidades | Los mismos widgets/tabla de `/unidades`, sin duplicar código ni datos | `M: ver` **y** `A: ver` — si falta el segundo, la pestaña no aparece |

Dos botones son visibles en cualquier pestaña: **"Exportar resumen ejecutivo"** y **"Estatus semanal de flota"** (ambos detallados abajo).

#### Selección de dataset — whitelist `BI_DATASETS`

Todo el motor de BI lee exclusivamente de este catálogo (18 datasets); ningún endpoint acepta nombres de tabla/columna arbitrarios:

| id | Etiqueta |
|---|---|
| `unidades` | Inventario de unidades |
| `mantenimiento` | Mantenimiento y gastos |
| `combustible` | Combustible |
| `seguros` | Seguros y vencimientos |
| `operadores` | Operadores |
| `documentos_operador` | Documentos de operadores |
| `peajes` | TAG / Peajes |
| `presupuesto_partida` | Presupuesto por partida (autorizado) |
| `proyectos` | Proyectos |
| `siniestros` | Siniestros |
| `accidentes` | Accidentes (legacy) |
| `tickets_rescate` | Tickets de rescate |
| `checklist` | Checklist de unidades |
| `gps_posiciones` | Posiciones GPS |
| `gps_huecos_senal` | Huecos de señal GPS |
| `inventario_insumos` | Consumo de insumos |
| `historico_proyecto` | Histórico de reasignación de unidades |

#### Explorador de BI — controles

- **Dataset**, **Eje X**, **Eje Y** (si aplica), **Agregación** (Conteo/Suma/Promedio), **Segundo grupo/cruce** (obligatorio en "Comparación de dos grupos", opcional en Barras), **Orden**, **Alcance de proyecto** (Nacional o proyectos específicos — siempre intersectado en servidor con los permitidos), **Filtros** (por campo, OR entre valores, AND entre filtros), **Tipo de gráfica** (12 tipos: Barras, Líneas, Pie, Contador, Tira de puntos, Barra divergente, Histograma, Dispersión, Calendario, Caja, Comparación de dos grupos, Mapa coroplético).

24 combinaciones sugeridas como chips de acceso rápido; métricas de negocio activas también aparecen como chips. Alternar Gráfica ↔ Tabla.

#### Drill-down y cross-filter (dashboards guardados)

Cada widget puede marcarse "emite filtro" y/o "escucha filtro". Clic en una categoría de un widget que emite filtra los widgets que escuchan (cascada de 1 nivel); chip visible del filtro activo con botón para quitarlo.

#### Pregunta en lenguaje natural (`/api/bi/nl-query`)

- Requiere `GEMINI_API_KEY`; rate limit de **10 preguntas/usuario/minuto**.
- El modelo (Gemini 2.5 Flash) usa function calling forzado con el catálogo completo de datasets en el prompt — **nunca genera SQL**, solo produce los mismos parámetros que `/api/bi/query`.
- Ambigüedad → `aclaracion_necesaria: true` con pregunta aclaratoria.
- **Doble validación**: se revalida con Zod contra el whitelist real; si el modelo alucina algo inexistente, se rechaza.
- El endpoint nunca ejecuta la consulta — solo devuelve parámetros validados.
- Toda pregunta queda en `NlQueryLog`.

#### Resumen automático ("insight", `/api/bi/insight`)

- Se dispara automáticamente cuando la gráfica tiene datos.
- **Re-ejecuta la consulta server-side** (no confía en datos del cliente) — el modelo (Gemini 2.5 Pro) solo ve agregados ya filtrados por permisos.
- Caché de 15 minutos por hash de parámetros + datos (`InsightCache`).

#### Forecast (`/api/bi/forecast`)

Proyección **100% determinista** (regresión lineal, sin LLM), detección de anomalías por z-score, clasificación de tendencia. Explicación opcional en español vía Gemini, cacheada igual que insight. **Hallazgo**: el endpoint existe y funciona pero, a la fecha de esta revisión, ningún componente de la UI lo invoca — no hay botón de "Proyectar" visible.

#### Análisis avanzado

- **Variación %**: Periodo, Métrica, Agregación, Comparar contra (Periodo anterior | Mismo periodo año anterior).
- **Funnel**: campo con opciones fijas como progresión ordenada (máx. 8 etapas).
- **Cohorte**: solo disponible para el dataset `combustible` (único con `cohorteConfig`); retención mes a mes (M0–M11).

#### Exportar

Excel, PDF (server, revalida permiso, confía en los datos que ya recibió el cliente — mismos datos ya validados de esa sesión), Imagen PNG (100% cliente). Tope 5000 filas. Cada exportación queda en `AccesoReporteBI`.

#### Dashboards guardados

Modo edición: Agregar combinación (con nombre opcional, interactividad emite/escucha, vista previa), arrastre/redimensión libre, Guardar / Guardar como nueva / Eliminar vista / Imprimir / Salir de edición.

#### Métricas de negocio (`/reportes/metricas`)

Capa semántica reutilizable — define centralizadamente una métrica (ej. "Costo por km").

| Campo | Tipo | Obligatorio |
|---|---|---|
| Nombre (máx. 120) | texto | Sí |
| Descripción (máx. 300) | texto | No |
| Dataset | combo (18 datasets) | Sí |
| Campo | combo (según dataset) | Sí |
| Agregación | combo (Conteo/Suma/Promedio) | Sí |

La `clave` interna se autogenera del nombre si no se especifica; debe ser única. Cada métrica tiene toggle Activa y botón eliminar.

#### Exportar resumen ejecutivo (PDF)

Botón "Exportar resumen ejecutivo", visible en cualquier pestaña, siempre que haya al menos un KPI o gráfica "registrada" para exportar en la pestaña activa (deshabilitado si no hay ninguna).

1. Se abre un modal con instrucciones opcionales para la IA (texto libre, ej. "enfócate en la disponibilidad del proyecto X"), y listas con checkbox de los KPIs y gráficas disponibles en la pestaña activa (todos preseleccionados).
2. Al generar: si hay KPIs seleccionados o instrucciones, se pide a `/api/dashboards/resumen-ejecutivo` una narrativa breve con IA (Gemini) a partir de esos valores — si falla, se muestra una advertencia y el PDF se descarga igual, sin narrativa.
3. Las gráficas seleccionadas se rasterizan en el navegador (`html-to-image`, no en servidor).
4. Se arma un PDF con formato propio (no una captura de pantalla) vía `@react-pdf/renderer` — título, fecha, narrativa, KPIs y gráficas — y se descarga como `resumen-ejecutivo-{fecha}.pdf`.

Mismo patrón ya usado en el dashboard de Órbita. Cada pestaña "registra" sus propios KPIs/gráficas exportables (ej. la de Inventario registra Unidades totales, Activas, Disponibles hoy, No disponibles hoy, Bajas y Gasto al día) — el modal solo ofrece lo que la pestaña activa trae registrado en ese momento.

#### Estatus semanal de flota

Botón "Estatus semanal de flota", visible en cualquier pestaña — **no es un módulo aparte**, reutiliza el motor de `ReporteProgramado` y de correo ya existentes en `/reportes` (sección 8.3).

Reporte de 5 bloques para un rango de fechas y alcance de proyectos (o "General" = todas las unidades) elegidos en el modal:

| Bloque | Contenido |
|---|---|
| SLA | SLA promedio del rango (mismo motor que el Módulo A, sección 5.1, pero sobre el rango elegido en vez del mes en curso) |
| Disponibilidad | Unidades disponibles vs. no disponibles **al final del rango** (`hasta`), leído del histórico `HistoricoDisponibilidadUnidad` — no del estado actual, para que un reporte de un periodo pasado no se contamine con cambios posteriores |
| Estatus | Desglose por `EstatusUnidad` (Activas, En consignación, En dirección, Bajas) — este sí es un corte del estado **actual**, porque no existe histórico de estatus |
| Motivos de indisponibilidad | Desglose de las unidades no disponibles al final del rango por `MotivoIndisponibilidad` (o "Sin motivo" si el periodo es anterior a que existiera esta captura) |
| Gastos | Gasto total y por `CategoriaGasto` en el rango |

Acciones en el modal:
- **Descargar PDF** — inmediato, cualquiera con acceso al módulo M.
- **Enviar por correo ahora** — a los destinatarios que se escriban en el modal (separados por coma), cualquiera con acceso al módulo M.
- **Envío automático semanal** (solo con `M: editar`) — activa/desactiva, define hora (México) y guarda proyectos/destinatarios; se envía los lunes, mismo criterio que el resto de reportes programados semanales de la plataforma. Se guarda como un único `ReporteProgramado` de tipo `estatus_flota` (no uno por proyecto).

#### Panel de gobernanza/auditoría de accesos BI

En `/admin/actividad/reportes-bi` (área de administración de actividad). Filtros por correo y por acción (Vio, Exportó PDF/Excel/imagen, Recibió por correo). Cada registro guarda `datasetIds` y `proyectoIds` — el alcance de datos efectivamente expuesto.

#### Reglas de negocio transversales del motor BI/IA

- Whitelist estricto en absolutamente todos los endpoints de BI.
- Alcance de proyecto nunca confiado del cliente — siempre intersectado en servidor.
- Caché de consultas BI: 5 minutos, invalidado al escribir en las tablas base; distinta de la caché de insight/forecast (15 min).
- **Insight/forecast re-ejecutan** la consulta server-side (nunca confían en datos del cliente porque alimentan a un LLM); **exportar sí confía** en los datos del cliente (porque son los mismos ya validados en esa sesión).

---

### 8.5 Módulo L — Gestión de Operadores

**Rutas:** `/operadores`, `/operadores/nuevo`, `/operadores/[id]`, `/operadores/[id]/editar`, `/operadores/pendientes`.

#### Propósito

Expediente digital de choferes/operadores: datos personales, tipo de sangre y contacto de emergencia, licencia de manejo, documentación con vigencia, historial de unidades resguardadas, cursos de capacitación y accidentes. Un `Operador` puede opcionalmente vincularse 1:1 a un `Usuario` (para darle acceso a la plataforma, ver Módulo K).

#### Pantallas

**`/operadores`**: 4 tarjetas (Operadores totales, Documentación completa/incompleta/vencida). Buscador (nombre o CURP), filtro proyecto y estatus documental, Exportar (CSV cliente), Pendientes documentales, Dar de alta. Tabla: Nombre+CURP, Proyecto, Unidad(es), Estatus, Doc. estatus.

**`/operadores/pendientes`**: documentos de operadores activos que vencen en ≤60 días o ya vencieron, ordenados por vencimiento. Columnas: Operador, Proyecto, Documento, Vencimiento, Estado.

**`/operadores/[id]`** — Ficha:
- Cabecera: avatar, nombre, badge de estatus documental, proyecto+estatus, botón Editar.
- **Datos personales**: CURP, RFC, NSS, Tipo de sangre, Teléfono, Contacto de emergencia, Tipo de licencia, Última capacitación.
- **Unidades resguardadas actualmente**: con badge "Requiere licencia X" si hay incompatibilidad.
- **Documentación**: lista de `DocumentoOperador` con tipo, número, fecha emisión, vigencia, estatus de verificación, badge de vigencia.
- **Pestañas**: Historial de resguardo (tabla `Resguardo`); Siniestros (título en pantalla — en realidad muestra `Accidente`, ver 9.3); Cursos (tabla `CursoOperador`).

#### Campos — Alta de operador

**Datos personales**

| Campo | Etiqueta | Tipo | Obligatorio | Notas |
|---|---|---|---|---|
| `nombre` | Nombre completo | texto | Sí | |
| `curp` | CURP | texto (máx. 18, mono) | Sí | Se guarda en mayúsculas |
| `rfc` | RFC | texto (mono) | No | Mayúsculas |
| `nss` | NSS | texto (mono) | No | |
| `tipoSangre` | Tipo de sangre | combo | No | O+, O-, A+, A-, B+, B-, AB+, AB- |
| `telefono` | Teléfono | texto | No | |
| `contactoEmergencia` | Contacto de emergencia | texto | No | |
| `proyectoId` | Proyecto | combo | No | Activos, alcance del usuario; "Sin asignar" |
| `tipoLicenciaManejo` | Tipo de licencia de manejo | combo | No | No especificado / Tipo A (autos/camionetas/motos) / Tipo B (solo grúas) |

**Documentación inicial — Licencia de conducir** (opcional en conjunto)

| Campo | Etiqueta | Tipo | Opciones |
|---|---|---|---|
| `tipoLicencia` | Tipo de licencia | combo | A / B (distinto de `tipoLicenciaManejo`) |
| `numeroLicencia` | Número de licencia | texto (mono) | |
| `estadoEmisor` | Estado emisor | texto | |
| `fechaVencimientoLicencia` | Fecha de vencimiento | fecha | Deshabilitado si "permanente" |
| `licenciaPermanente` | checkbox "Licencia permanente (sin vencimiento)" | booleano | |
| `archivoLicencia` | Licencia de conducir (foto o PDF) | archivo | pdf/jpeg/png/webp/heic/heif |

**Hallazgo**: el formulario indica que el resto de la documentación (INE, comprobante de domicilio, antecedentes, CSF, examen médico, antidoping, curso de manejo) "se adjunta después desde la ficha" — pero **no existe hoy ningún botón o formulario en la ficha para agregar documentos adicionales**; solo la licencia se puede cargar al alta.

#### Campos — Editar operador

Mismo bloque de datos personales, precargado. **No permite** tocar `estatus` (Activo/Suspendido/Baja) ni documentación ni foto — no existe ninguna pantalla en el sistema para cambiar el estatus de un operador; queda fijo en ACTIVO desde su creación.

#### Campos — Agregar curso (inline)

| Campo | Etiqueta | Tipo | Obligatorio |
|---|---|---|---|
| `nombre` | Nombre del curso | texto | Sí |
| `fecha` | Fecha | fecha | Sí |
| `evidenciaUrl` | Evidencia (constancia/diploma) | archivo | No |

Al guardar, siempre actualiza `Operador.fechaUltimaCapacitacion` con esa fecha (sin comparar si es más reciente).

#### Campos — Registrar accidente (inline)

| Campo | Etiqueta | Tipo | Obligatorio |
|---|---|---|---|
| `fecha` | Fecha (máx. hoy) | fecha | Sí |
| `tipo` | Tipo | combo | Sí — Choque frontal, lateral, trasero, Raspón/rayón, Robo parcial, Volcadura, Otro |
| `descripcion` | Descripción | textarea | Sí |
| evidencias | Evidencias fotográficas | múltiples fotos | No |

Toma automáticamente `numeroEconomico = primera unidad resguardada del operador` — si no tiene ninguna, el registro falla; si tiene varias, siempre usa la primera (sin poder elegir).

#### Acciones y permisos

| Acción | Permiso requerido |
|---|---|
| Ver listado/ficha/pendientes | L → `ver` |
| Exportar CSV | L → `ver` (cliente) |
| Dar de alta / Guardar operador | L → `editar` |
| Editar → Guardar cambios | L → `editar` |
| Agregar curso | L → `editar` |
| **Registrar accidente** | **A → `editar`** (no L) |

#### Reglas de negocio no obvias

- **`estatusDocumental` es estático**: se fija en INCOMPLETO al crear y **ningún proceso lo recalcula** (ni al vencer documentos, ni al verificarlos). La fuente de verdad "en vivo" es `/operadores/pendientes`.
- **No existe UI para verificar documentos**: `verificado` siempre se crea `false`, sin botón para marcarlo.
- **No existe UI para agregar documentos después del alta**, ni para suspender/dar de baja a un operador.
- **Incompatibilidad de licencia vs. tipo de unidad**: si el operador tiene licencia A y alguna unidad resguardada es grúa, se marca advertencia visual (no bloquea desde este módulo; el bloqueo real ocurre al asignar la unidad en el Módulo A).
- **"Siniestros" de la ficha ≠ Módulo S**: usa el modelo legado `Accidente`, completamente separado de `Siniestro` (ver 9.3).
- **Alerta de documentos por vencer** (usada en notificaciones globales) se dispara para cualquier `DocumentoOperador` próximo a vencer sin filtrar por proyecto del usuario ni por estatus activo — a diferencia de `/operadores/pendientes`, que sí filtra por operador activo y alcance del usuario.

---

### 8.6 Módulo K — Administración

**Rutas:** `/usuarios`, `/usuarios/roles`, `/usuarios/proyectos`, `/usuarios/notificaciones`, `/usuarios/widgets`.

#### Propósito

Centraliza gestión de usuarios, roles y permisos, alcance de módulos por proyecto, umbrales de notificaciones globales y widgets del resumen. Por diseño, casi nunca se asigna a roles operativos — en los datos semilla solo el rol "Administrador" lo tiene.

#### Pantallas

`/usuarios` es un hub con 5 tarjetas (Usuarios, Roles y permisos, Módulos por proyecto, Notificaciones, Widgets del resumen) y 3 KPIs (Usuarios totales, Activos, Roles configurados). Formulario **Invitar usuario** (colapsable) + lista con buscador.

`/usuarios/roles`: un desplegable por rol con la matriz de permisos.

`/usuarios/proyectos`: un formulario por proyecto para activar/desactivar módulos.

`/usuarios/notificaciones`: umbrales globales + destinatarios de rescate por proyecto.

`/usuarios/widgets`: editor drag-and-drop de widgets del resumen — **exclusivamente para el Módulo A** (aunque el modelo de datos es genérico por módulo, no existe hoy UI para configurar widgets de ningún otro módulo).

#### Campos — Invitar usuario

| Campo | Etiqueta | Tipo | Obligatorio | Notas |
|---|---|---|---|---|
| `nombre` | Nombre | texto | Sí | |
| `correo` | Correo | email | Sí | Minúsculas |
| `rolId` | Rol | combo | Sí | Todos los roles existentes |
| `operadorId` | Operador vinculado | combo | No | Liga a una ficha de Operador ACTIVO; "Sin vincular" |
| `sinCorreoInstitucional` | checkbox "No tiene correo institucional…" | booleano | — | Determina `metodoAcceso` |
| `proyectoIds[]` | Proyectos asignados | checkboxes | No | Proyectos ACTIVO |

#### Campos — Editar usuario (inline)

Nombre, Rol, Proyectos asignados. No permite cambiar correo ni método de acceso.

#### Roles y permisos (`/usuarios/roles`)

**No hay formulario para crear un rol nuevo** — los 5 roles existentes (Administrador, Control Vehicular, Gerente administrativo, Dirección, Operador) vienen sembrados; esta pantalla solo edita sus permisos.

Por rol, agrupado por los 5 grupos de módulos: 4 botones tipo pastilla por módulo (Ninguno/Ver/Editar/Aprobar). Sección "Permisos especiales": toggle por cada uno de los 3 permisos especiales (sección 4.2). Si el rol tiene acceso global (`"*"`), no se muestra matriz editable — solo el texto "Acceso global a todos los módulos".

#### Campos — Módulos por proyecto

Un checkbox-chip por cada uno de los 18 módulos, por cada proyecto (sin filtrar por estatus). Guarda en `Proyecto.modulosActivos`.

#### Campos — Notificaciones

Ver detalle completo en sección 10.

#### Widgets del resumen

Catálogo (`CATALOGO_WIDGETS_UNIDADES`): activar/desactivar, arrastrar, redimensionar. Por defecto activos todos menos "Gasto al día (hoy)" y "SLA de disponibilidad por proyecto".

#### Acciones y permisos

| Acción | Permiso requerido |
|---|---|
| Enviar invitación | K → `editar` |
| Desactivar / Reactivar usuario | K → `editar` |
| Editar usuario | K → `editar` |
| Eliminar usuario | K → `editar`; no puede ser tu propia cuenta; falla si el usuario tiene historial asociado (sugiere desactivar en su lugar) |
| Guardar matriz de permisos de un rol | K → `editar` |
| Activar/desactivar permiso especial | K → `editar` |
| Guardar módulos activos de un proyecto | K → `editar` |
| Guardar configuración de notificaciones | K → `editar` |
| Guardar destinatarios de rescate por proyecto | K → `editar` |
| **Guardar widgets** | **acceso global ("\*")** — no basta K → aprobar |
| **Forzar cierre de sesión de un usuario** | **exclusivo `esDevAdmin()`** — ni siquiera el Administrador puede si su correo no está en la allowlist |

#### Reglas de negocio no obvias

- Los roles no se crean ni se borran desde la UI, solo se editan sus permisos.
- Para `MICROSOFT`, el usuario se crea `INVITADO` y pasa a `ACTIVO` en el primer login exitoso (correo coincidente, insensible a mayúsculas).
- Para `CORREO_PASSWORD`, requiere aceptar `/invitacion/[token]` (7 días de vigencia, un solo uso).
- **Alcance por proyecto = intersección** de proyectos asignados al usuario y módulo activo en ese proyecto. Sin ningún proyecto asignado, el usuario no ve datos de ningún proyecto en ningún módulo.
- **Rol "Operador"**: restricción adicional a nivel de fila dentro del Módulo A (solo ve unidades que resguarda él mismo).
- Reportes programados resuelven el permiso del **dueño del reporte**, no de un "usuario sistema" sin restricciones.
- Eliminar usuario es "hard delete" — solo funciona sin historial relacionado; en la práctica, la única opción viable para un usuario con actividad real es Desactivar.

---

### 8.7 Módulo N — Inventario de Insumos

**Ruta:** `/inventario-insumos`.

#### Propósito

Control de existencias de insumos consumibles por proyecto (aceite, anticongelante, etc.) — catálogo con stock/mínimo y registro de consumo por unidad.

- **Ver** listado: nivel `ver`.
- **Crear/editar/eliminar** insumos del catálogo: nivel `editar`.
- **Registrar un consumo** (desde la ficha de unidad, pestaña Insumos): requiere **`A: editar`**, no `N` — quien puede editar la ficha de una unidad puede registrar consumo de insumos de esa unidad, tenga o no acceso al módulo N.
- **Por defecto, un proyecto nuevo NO tiene el módulo N activo** — debe activarse en `/usuarios/proyectos`.

#### Pantalla

**`/inventario-insumos`**: 2 tarjetas (Insumos registrados, Bajo mínimo si aplica). Filtro por proyecto. Botón Agregar insumo. Tabla: Estado (⚠️/✓), Proyecto, Insumo, Categoría, Existencias (rojo/negritas si bajo mínimo), Mínimo, acciones Editar/Eliminar. Banner inferior si hay insumos bajo mínimo.

**Pestaña "Insumos" en la ficha de unidad**: formulario "Registrar consumo" (combo insumo con existencias disponibles, Cantidad, Nota) y tabla de histórico de consumos de esa unidad.

#### Campos — Alta / edición de insumo

| Campo | Etiqueta | Tipo | Obligatorio | Notas |
|---|---|---|---|---|
| `proyectoId` | Proyecto | combo | Sí (solo alta) | No editable después |
| `nombre` | Nombre del insumo | texto | Sí | Ej. "Aceite 15W-40" |
| `categoria` | Categoría | texto libre | No | No es catálogo fijo |
| `unidad` | Unidad de medida | combo | No (default "pza") | pza, L, kg, caja, m, par |
| `existencias` | Existencias actuales | número (min 0) | No (default 0) | |
| `minimoStock` | Mínimo de stock | número (min 0) | No (default 0) | |

#### Campos — Registrar consumo

| Campo | Tipo | Obligatorio |
|---|---|---|
| Insumo | combo (del proyecto de la unidad) | Sí |
| Cantidad | número (min 0.01) | Sí |
| Nota | texto | No |

#### Reglas de negocio no obvias

- Alerta de stock mínimo es puramente visual — no dispara correos ni push.
- Registrar consumo es **transaccional**: crea `ConsumoInsumo` y descuenta `existencias` en una sola transacción de Prisma.
- Rechaza si la cantidad supera las existencias disponibles.
- Se ata al `UnidadHistoricoProyecto` abierto de la unidad (igual que el gasto vehicular), para reportes históricos consistentes.
- El catálogo visible en la ficha de una unidad es siempre el del **proyecto actual** de la unidad, no el histórico.
- Para roles no globales: listado y combo de proyectos se restringen a `proyectosPermitidosParaModulo("N")`; el rol global no tiene esta restricción.
- Al eliminar un proyecto completo, sus insumos se eliminan en cascada.

---

## 9. Rescate y campo

### 9.1 Módulo R — Rescate de Unidades

**Rutas:** `/rescate`, `/rescate/nuevo`, `/rescate/[id]`.

#### Propósito

Gestiona tickets de auxilio en campo para unidades con falla mecánica, eléctrica, de neumáticos, combustible, accidente o situaciones de seguridad.

- **Ver**: nivel `ver`.
- **Crear tickets, cambiar estatus, asignar**: nivel `editar`. No hay nivel "aprobar" implementado.
- **Por defecto, ningún rol estándar (salvo Administrador) tiene el módulo R habilitado** — debe otorgarse explícitamente desde `/usuarios/roles`.
- Alcance por proyecto igual que en los demás módulos.

#### Pantallas

**`/rescate`**: botón "Nuevo ticket". 4 KPIs (Tickets abiertos, Urgentes, Total histórico, Cerrados/Resueltos). Tabla filtrable (buscador, Estatus, Prioridad): punto de color (Prioridad), Folio, Unidad, Motivo, Estatus, Asignado a, Creado, expandible con Proyecto/Reportado por/Ubicación/Descripción y controles de acción inline; enlace "Ver detalle completo y timeline".

**`/rescate/nuevo`** — Wizard de 3 pasos + éxito:
1. **Unidad**: combo Número económico* (unidades no dadas de baja del/los proyectos permitidos).
2. **Motivo**: lista de motivos activos agrupados por categoría (Mecánico, Eléctrico, Neumático, Accidente, Seguridad, Combustible, Otro), cada uno con chip de prioridad por defecto.
3. **Detalle**: Prioridad (editable, oculta y fijada a URGENTE si la categoría es Seguridad), Descripción adicional (opcional), Ubicación/referencia (opcional). Botón "Crear ticket" (rojo "Crear ticket URGENTE" si aplica).

**`/rescate/[id]`**: encabezado con folio, badge de Estatus, chip de Prioridad. Info: Unidad (link), Motivo, Proyecto, Reportado por, Asignado a, Creado, Ubicación, Descripción. Bloque de Acciones. **Timeline**: histórico cronológico con punto de color por estatus.

#### Campos — Nuevo ticket

| Campo | Tipo | Obligatorio | Opciones |
|---|---|---|---|
| Número económico | select | Sí | Unidades activas del/los proyectos permitidos |
| Motivo | selección de catálogo | Sí | Agrupado por categoría, solo `activo = true` |
| Prioridad | select | No (default = del motivo) | Baja, Media, Alta, Urgente — forzada si categoría = Seguridad |
| Descripción adicional | textarea | No | |
| Ubicación / referencia | texto | No | |

#### Campos — Acciones de ticket

| Campo | Tipo | Obligatorio |
|---|---|---|
| Asignar a | select de usuarios | Sí para asignar |
| Comentario | texto | **Obligatorio solo si el nuevo estatus es CERRADO o CANCELADO** |

#### Máquina de estados (`EstatusTicketRescate`)

| Estatus | Etiqueta | Color |
|---|---|---|
| ABIERTO | Abierto | naranja |
| ASIGNADO | Asignado | azul |
| EN_ATENCION | En atención | morado |
| EN_TRANSITO | En tránsito | cian |
| RESUELTO | Resuelto | verde |
| CERRADO | Cerrado | gris |
| CANCELADO | Cancelado | rojo |

Transiciones válidas: ABIERTO → Asignado, En atención, Cancelado · ASIGNADO → En atención, Cancelado · EN_ATENCION → En tránsito, Resuelto, Cancelado · EN_TRANSITO → Resuelto, Cancelado · RESUELTO → Cerrado · CERRADO / CANCELADO → finales.

Prioridad: Baja verde, Media ámbar, Alta naranja, Urgente rojo.

#### Reglas de negocio no obvias

- **Folio**: `RSC-{año}-{consecutivo de 6 dígitos}` — el consecutivo **no reinicia por año** (es un `COUNT(*)` global + 1).
- **Prioridad forzada** a URGENTE si la categoría del motivo es Seguridad (servidor y UI).
- **No duplicados**: no se puede crear un ticket para la misma unidad y motivo si ya existe uno abierto.
- **Cierre restringido en tickets de Seguridad**: quien lo reportó no puede cerrarlo ni resolverlo.
- **Comentario obligatorio** para Cerrado/Cancelado (validado en servidor).
- El proyecto del ticket se hereda del proyecto de la unidad — no es un campo del formulario.
- El envío del correo de notificación nunca bloquea la creación del ticket (si falla, solo se registra el error).
- **Hallazgo**: no existe una pantalla de administración de `CatalogoMotivoRescate` — debe gestionarse directamente en base de datos.

#### Notificaciones

Al crear un ticket, si la unidad pertenece a un proyecto con destinatarios configurados (`ConfiguracionNotificacionProyecto.destinatariosRescate`), se envía correo con folio, unidad, motivo, prioridad y ubicación. Destinatarios administrados en `/usuarios/notificaciones` (bloque separado por proyecto).

---

### 9.2 Módulo S — Siniestros

**Ruta:** `/siniestros` (única pantalla del módulo, sin subrutas).

#### Propósito

Registro formal y seguimiento de siniestros vehiculares (colisiones, robos, vandalismo, incendio, fenómenos naturales) con datos de aseguradora y estimación de daños.

- **Ver**: nivel `ver`.
- **Registrar/actualizar siniestros y su estatus**: nivel `editar`. No hay nivel "aprobar" implementado.
- **Por defecto, ningún rol estándar (salvo Administrador) tiene el módulo S habilitado.**

#### Pantalla

3 KPIs (Total, En proceso, Cerrados). Botón "Registrar siniestro" (despliega formulario inline). Filtros: buscador (folio o unidad), Estatus, Tipo. Tabla: Folio, Unidad, Fecha, Tipo, Estatus, Aseguradora, Estimación, expandible con detalle completo y mini-formulario de cambio de estatus.

#### Campos — Registrar nuevo siniestro

| Campo (etiqueta visible) | Tipo | Obligatorio | Opciones |
|---|---|---|---|
| Unidad | select | Sí | Unidades activas |
| Fecha del siniestro | date (no futura) | Sí | |
| Tipo | select | Sí | Colisión, Robo total, Robo parcial, Vandalismo, Incendio, Fenómeno natural, Otro |
| Operador involucrado | select | No | "Ninguno" + operadores activos |
| Ubicación | texto | No | |
| Estimación de daños ($) | número (min 0) | No | |
| Descripción | textarea | Sí | |
| Aseguradora | texto | No | |
| No. siniestro aseguradora | texto | No | |
| No. reporte / acta | texto | No | |
| Personas involucradas | texto | No | |
| Daños a terceros | texto | No | |
| Daños a la unidad | texto | No | |

Al crear, el estatus se fija automáticamente en ABIERTO.

**Edición inline**: permite modificar Aseguradora, No. siniestro, No. reporte, Personas involucradas, Daños a terceros, Daños a la unidad, Estimación y Estatus — fecha, tipo, unidad, operador y descripción **no** son editables después de creado.

#### Cambio de estatus

| Valor | Etiqueta | Color |
|---|---|---|
| ABIERTO | Abierto | naranja |
| EN_PROCESO | En proceso | azul |
| CERRADO | Cerrado | verde |
| CERRADO_SIN_INDEMNIZACION | Cerrado sin indemnización | gris |

**A diferencia del Módulo R, no hay máquina de estados restringida**: cualquier usuario con permiso editar puede pasar de cualquier estatus a cualquier otro, incluido quien reportó el siniestro cerrándolo él mismo.

#### Reglas de negocio no obvias

- **Folio**: `SIN-{año de la fecha del siniestro}-{6 dígitos aleatorios}` — **no secuencial** (a diferencia de R), con riesgo teórico bajo de colisión (sin reintento ante duplicado).
- La fecha no puede ser futura, tanto al crear como al editar.
- No hay tabla de histórico de estatus (a diferencia de `HistoricoTicketRescate` en R) — no hay timeline visible, solo el estatus actual.
- **Hallazgo**: el modelo define `evidencias: Documento[]`, pero **no existe en la UI actual ninguna forma de subir/ver evidencias** en un siniestro.
- No hay restricción de "no duplicados" — se puede registrar más de un siniestro abierto para la misma unidad.
- El siniestro no guarda `proyectoId` propio — siempre se infiere vía la unidad.

#### Notificaciones

**Hallazgo**: no se encontró ningún mecanismo de notificación por correo asociado a la creación o cambio de estatus de un Siniestro (a diferencia de R).

---

### 9.3 Nota sobre el módulo legacy "Accidente"

**Hallazgo clave**: el modelo `Accidente` **sigue activo en producción y no fue reemplazado por `Siniestro`** — ambos coexisten con propósitos distintos:

- **`Accidente`** es un registro rápido de incidente (tipo texto libre, sin folio, sin aseguradora), capturado desde un formulario embebido en:
  - La ficha de **Unidad**, pestaña propia "Accidentes".
  - La ficha de **Operador**, pestaña rotulada **"Siniestros"** — pero cuyo contenido real solo lista registros `Accidente`, no `Siniestro`.
  - Su acción exige el permiso del **Módulo A**, no un módulo propio.
- **`Siniestro`** es el módulo formal (folio, aseguradora, estatus) del Módulo S, con su propia pestaña de solo lectura en la ficha de Unidad (nota explícita: *"Los siniestros se gestionan en el Módulo S"*).

**Para el usuario**: "Registrar accidente" (botón rápido en la ficha de unidad/operador) y "Registrar siniestro" (formulario completo en `/siniestros`) son dos flujos distintos e independientes que coexisten — un siniestro dado de alta en el Módulo S **no aparece** en la pestaña de la ficha del operador, y viceversa.

---

## 10. Notificaciones y alertas (resumen transversal)

Hay dos capas que conviene no confundir: las notificaciones **in-app** (campana) y los umbrales configurables en `/usuarios/notificaciones` (modelo `ConfiguracionNotificaciones`). No todos los umbrales configurados generan hoy una notificación in-app o un correo.

### Campana de notificaciones (in-app)

Ícono en el header con punto rojo si hay pendientes. Muestra hasta 20, cada una con severidad por color (alta = venció/vence hoy, media = ≤7 días, baja = resto), título, descripción y enlace a la entidad. Clic marca como leída (`NotificacionLeida`, única por usuario+notificación) y ya no reaparece para ese usuario.

**Importante**: las notificaciones in-app hoy cubren **seis** de los once tipos configurables: los tres históricos — **seguros por vencer**, **mantenimiento/tenencia/verificación/renta próximos** y **documentos de operador por vencer** — más los tres de triangulación TAG/combustible/GPS agregados el 31 de agosto de 2026 (ver bloque abajo). Los demás (señal GPS perdida/huecos, rendimiento de combustible, checklist diario faltante) están en el formulario de configuración pero, a la fecha de esta revisión, no generan notificación de campana ni correo automático. El de "recarga de presupuesto" es un indicador visual directo en la página de presupuesto del proyecto, no una notificación de campana. Ninguno de los tres tipos de triangulación envía correo — solo campana.

### Triangulación TAG / Combustible / GPS (Módulo E)

Reemplaza la conciliación manual de TAG retirada de `/tag` (sección 6.3): en vez de un botón que marcaba "conciliado" sin comparar nada, estas tres alertas cruzan datos reales, acotadas siempre a los últimos 7 días y máximo 10 alertas por categoría en la campana:

| Alerta | Severidad | Lógica |
|---|---|---|
| **TAG sin GPS cercano** | media | Un cargo de TAG reciente sin ninguna posición GPS de esa unidad dentro de la tolerancia configurada (minutos) alrededor de la hora del cargo |
| **Combustible sin actividad** | media | Una carga de combustible reciente sin ninguna posición GPS ni cruce de TAG de esa unidad ese mismo día |
| **Activa sin señal GPS** | alta | Una unidad `ACTIVO` y `disponible = true` sin ninguna posición GPS en los últimos N días configurados (o nunca) |

Las tres son configurables (activar/desactivar, tolerancia) desde `/usuarios/notificaciones`, bloque "Triangulación TAG / Combustible / GPS" — ver tabla de umbrales abajo. La tercera es distinta del toggle de "Alertar si unidad disponible no reporta GPS" del bloque de Geolocalización (que sigue existiendo, se mide en horas y **no** genera notificación de campana): son dos alertas separadas con el mismo espíritu pero configuración y cobertura distintas — no confundirlas.

### Configuración de umbrales — `/usuarios/notificaciones` (módulo K)

| Bloque | Controles |
|---|---|
| **Geolocalización (A / G.1)** | Alertar si unidad disponible no reporta GPS (toggle) + Horas sin reporte (default 48) · Alertar por señal perdida/huecos (toggle) + Minutos sin señal (default 15) |
| **Mantenimiento, tenencia y verificación (C)** | Alertar antes del vencimiento (toggle) + Días de anticipación, coma-separados (default 15, 5) |
| **Combustible (D)** | Alertar cuando el rendimiento cae del umbral (toggle) + Umbral de caída % (default 20) |
| **Seguros (F)** | Alertar antes del vencimiento (toggle) + Días de anticipación (default 30, 7) |
| **Checklist diario (I)** | Recordatorio si unidad activa no capturó checklist (toggle) + Hora límite (default 18:00) |
| **Documentación de operadores (L)** | Alertar antes del vencimiento de documentos (toggle) + Días de anticipación (default 60, 30, 7) |
| **Triangulación TAG / Combustible / GPS (E)** | Alertar cargo de TAG sin GPS cercano (toggle) + minutos de tolerancia (default 60) · Alertar carga de combustible sin GPS ni TAG ese día (toggle) · Alertar unidad activa sin señal GPS (toggle) + días sin señal antes de alertar (default 3) |
| **Presupuesto por partida** | Mostrar indicador cuando se recarga el presupuesto de un proyecto (toggle) |
| **Destinatarios** | Correos que reciben las alertas, separados por coma (lista global) |

Formulario separado, **`NotificacionesRescateProyectoForm`**: por proyecto, correos que reciben aviso de un nuevo ticket de rescate (`ConfiguracionNotificacionProyecto.destinatariosRescate`) — independiente de la lista global de arriba, y es el único mecanismo de notificación por correo del Módulo R.

---

## 11. Importador genérico de Excel

Patrón reutilizado en Alta/Baja de unidades, Combustible, TAG/Peajes y Presupuesto por partida — mismo flujo de 4 pasos en los cuatro módulos:

1. **Subir** — selecciona `.xlsx`, `.xls` o `.csv`; se parsea en el servidor.
2. **Mapear** — selector de hoja del libro (si tiene varias pestañas), selector de valor por defecto cuando aplica (ej. "Proyecto por defecto"), auto-mapeo de columnas por coincidencia de encabezado (editable), grilla de mapeo campo-por-campo (marcados con `*` los obligatorios), vista previa de 5 filas. Si faltan obligatorios, el botón "Continuar" queda deshabilitado.
3. **Confirmar** — resumen de cuántas filas se importarán, nota de qué pasa con registros existentes (se actualizan) y con valores no reconocidos (se importan con valor por defecto, marcados como advertencia).
4. **Resultado** — tarjetas con conteos de **Creadas / Actualizadas / Omitidas / Advertencias**, con el detalle línea por línea (número de fila + motivo).

---

## 12. Documentos, evidencias y Vercel Blob

### Modelo `Documento`

Genérico, sin tipar por módulo: `entidadRelacionada` + `entidadId`, más `url`, `tipo`, `fechaCarga`. Se usa como fotos de operador, evidencias de accidentes, tarjeta de circulación/combustible, documentos de checklist, pólizas de seguro y evidencias.

### Subida

Tipos permitidos: PDF, JPG, PNG, WEBP, HEIC/HEIF. Tamaño máximo: **15 MB**. Se sube a Vercel Blob con `access: "private"` mediante **Server Action** (no expone el token de escritura al cliente), con nombre único.

### Proxy de blob privado

Como los blobs son privados, no son accesibles por URL directa. `blobProxy(url)` reescribe URLs de Vercel Blob a `/api/blob?url=...`; el endpoint `/api/blob` exige sesión activa, valida que la URL pertenezca a `.blob.vercel-storage.com`, y sirve el archivo con el token de servidor. Se aplica de forma consistente en toda la app (checklist, ficha de unidad, ficha de operador, PDF de póliza).

---

## 13. Envío de correos

Implementado con nodemailer sobre SMTP (por defecto `smtp.office365.com`). Todo envío usa reintento (hasta 3 intentos, sin reintentar en errores de autenticación). Si SMTP no está configurado, cualquier envío falla silenciosamente sin bloquear la operación de negocio.

| Correo | Disparador |
|---|---|
| **Invitación (Microsoft)** | Alta de usuario con correo institucional |
| **Invitación (Operador, correo+contraseña)** | Alta de usuario "sin correo institucional" — enlace de un solo uso, vigente 7 días |
| **Ticket de rescate nuevo** | Creación de ticket en Módulo R, a los destinatarios configurados por proyecto |
| **Reportes programados** | Ejecución del cron horario o "Ejecutar ahora" en el Módulo J |

**Hallazgo**: no existe correo transaccional para autorización de combustible (se resuelve dentro de la plataforma), ni correos automáticos ligados a los demás umbrales de `/usuarios/notificaciones` más allá de los dos casos de arriba.

---

## 14. Analítica de uso y trazabilidad (ActivityLog)

**Exclusivo del equipo de Desarrollo** (`esDevAdmin`) — no disponible para el rol Administrador ni ningún otro rol de negocio, ni aparece en el menú lateral estándar. Se accede desde el menú de usuario, en `/admin/actividad`, con tres pestañas.

### Modelo `ActivityLog`

Registro **append-only**: `userId`, `modulo`, `accion`, `entidad`/`entidadId`, `detalle` (JSON), `ip`, `userAgent`, timestamp. Un fallo al registrar nunca tumba la operación real que lo disparó.

### Pestaña "Adopción"

KPIs de uso (activos hoy/7 días/mes, % adopción), gráfica de eventos diarios (30 días), tabla de usuarios por última actividad (filtrable por rol/módulo). Por usuario: detalle completo (línea de tiempo por día) y botón **"Cerrar sesión"** (fuerza `sesionInvalidadaEn`, con confirmación en línea) — exclusivo de `esDevAdmin`.

### Pestaña "Trazabilidad"

Búsqueda por registro afectado (ej. número económico) para reconstruir quién tocó ese registro y cuándo. Resultados exportables a PDF.

### Pestaña "Reportes BI"

Panel de gobernanza de accesos a BI — ver sección 8.4.

---

*Fin del manual. Documento generado a partir de una revisión exhaustiva del código fuente de la plataforma; cualquier discrepancia entre este manual y el comportamiento observado en producción debe resolverse a favor de lo que el código haga en ese momento — la plataforma evoluciona con nuevos commits.*
