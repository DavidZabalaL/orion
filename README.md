# Orion — Control Vehicular · Grupo Kabat

Plataforma web (Next.js + Prisma + PostgreSQL) para la administración de la flota vehicular de Grupo Kabat. Sustituye el libro de Excel de 34 hojas usado hoy por el área de Control Vehicular.

Especificación funcional completa en [`SPEC_COMPLETA_Control_Vehicular.md`](./SPEC_COMPLETA_Control_Vehicular.md).

## Stack

- **Frontend + Backend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **Base de datos:** PostgreSQL (Neon) vía Prisma ORM 7 con `@prisma/adapter-pg`
- **Design system:** K1 v2 (tokens en `src/app/globals.css`)

## Requisitos

- Node.js 20+
- Una base de datos PostgreSQL (se usó [Neon](https://neon.tech) en desarrollo)

## Setup local

```bash
npm install
cp .env.example .env   # llenar DATABASE_URL (y DIRECT_URL si tu proveedor usa pooler)
npx prisma migrate deploy   # aplica las migraciones existentes
npm run db:seed             # (opcional) datos de ejemplo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) — redirige a `/unidades`.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string de PostgreSQL usada en runtime (puede ser la conexión con pooler/PgBouncer) |
| `DIRECT_URL` | Connection string directa (sin pooler), usada por Prisma Migrate. Si tu proveedor no separa ambas, usa el mismo valor en las dos |
| `AUTH_SECRET` | Clave para firmar sesiones (Auth.js). Genera una con `openssl rand -base64 32` |
| `AZURE_AD_CLIENT_ID` | Application (client) ID del App Registration en Microsoft Entra ID |
| `AZURE_AD_CLIENT_SECRET` | Client secret generado para ese App Registration |
| `AZURE_AD_TENANT_ID` | Directory (tenant) ID de Grupo Kabat en Microsoft Entra ID |

## Login con Microsoft (Azure AD / Entra ID)

Orion requiere que cada usuario inicie sesión con su cuenta de Microsoft corporativa. Solo pueden entrar correos que ya existan como `Usuario` en la base de datos (creados desde **Usuarios y roles → Invitar usuario**, o insertados directamente).

### 1. Crear el App Registration

1. Entra a [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Nombre: `Orion - Control Vehicular` (o el que prefieras).
3. **Supported account types**: "Accounts in this organizational directory only" (single tenant — solo Grupo Kabat).
4. **Redirect URI** (tipo **Web**): agrega una por cada entorno donde corra la app:
   - `http://localhost:3000/api/auth/callback/microsoft-entra-id` (desarrollo local)
   - `https://<tu-dominio-de-vercel>/api/auth/callback/microsoft-entra-id` (producción)
5. Registra la app.

### 2. Obtener las credenciales

- **Application (client) ID** → `AZURE_AD_CLIENT_ID`
- **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`
- Ve a **Certificates & secrets → New client secret**, cópialo de inmediato (no se vuelve a mostrar) → `AZURE_AD_CLIENT_SECRET`

Los permisos de API por defecto (`User.Read` de Microsoft Graph, delegado) son suficientes — no hace falta agregar nada más.

### 3. Configurar las variables

Agrega las 4 variables (`AUTH_SECRET`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`) tanto en tu `.env` local como en **Vercel → Project Settings → Environment Variables**.

### 4. Crear el primer usuario administrador

Como solo puede iniciar sesión quien ya exista como `Usuario`, necesitas insertar manualmente el primer administrador (con tu correo real de Microsoft) antes de poder entrar. Sin este paso, nadie puede iniciar sesión — es un problema del huevo y la gallina que solo se resuelve una vez, a mano.

## Despliegue en Vercel

El proyecto está conectado al repositorio de GitHub: cada push a `main` dispara un deploy automático a producción.

1. Importa el repositorio en Vercel.
2. En **Project Settings → Environment Variables**, agrega `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET` y `AZURE_AD_TENANT_ID`.
3. Vercel corre `npm install` (dispara `postinstall` → `prisma generate`) y luego `npm run build` automáticamente. No hace falta configurar nada más — el schema de Prisma no necesita generarse manualmente.
4. Las migraciones **no** se aplican automáticamente en cada deploy. Para aplicar una migración nueva a la base de producción, corre localmente (apuntando al `DATABASE_URL` de producción):
   ```bash
   npm run db:migrate
   ```

## Estructura del proyecto

- `prisma/schema.prisma` — modelo de datos completo (20+ entidades, ver Parte 6 de la spec)
- `prisma/seed.ts` — datos de ejemplo (proyectos, operadores, unidades, etc.) — script de desarrollo, no usar en producción
- `src/auth.ts` / `src/auth.config.ts` — configuración de Auth.js (login con Microsoft). `auth.config.ts` es la versión sin Prisma que usa `src/proxy.ts` para proteger rutas
- `src/proxy.ts` — protección de rutas: redirige a `/iniciar-sesion` si no hay sesión
- `src/app/(app)/` — rutas autenticadas de la app (una carpeta por módulo: `unidades`, `operadores`, `mantenimiento`, `combustible`, `tag`, `seguros`, `mapa`, `proyectos`, `auditoria`, `reportes`, `usuarios`, `checklist`, `altas-bajas`), envueltas por el `AppShell` (sidebar + header)
- `src/app/iniciar-sesion/` — pantalla de login, fuera del grupo `(app)` (sin sidebar/header)
- `src/components/` — componentes de UI compartidos y específicos por módulo
- `src/lib/` — helpers (formato, catálogos/enums, lógica de negocio como el filtro GPS del Módulo G.1, normalización para el importador de Excel)

## Pendiente (Fase 2, ver Parte 9 de la spec)

- Conexión real con IntelliHub (API/webhook de GPS)
- Envío efectivo de correos para alertas y reportes programados (requiere proveedor SMTP)
- Carga de archivos real para evidencias, pólizas y documentos (requiere Vercel Blob o S3)
