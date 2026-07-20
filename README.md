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

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. En **Project Settings → Environment Variables**, agrega `DATABASE_URL` y `DIRECT_URL` (mismos valores que en `.env`, o los de tu base de producción).
3. Vercel corre `npm install` (dispara `postinstall` → `prisma generate`) y luego `npm run build` automáticamente. No hace falta configurar nada más — el schema de Prisma no necesita generarse manualmente.
4. Las migraciones **no** se aplican automáticamente en cada deploy. Para aplicar una migración nueva a la base de producción, corre localmente (apuntando al `DATABASE_URL` de producción):
   ```bash
   npm run db:migrate
   ```

## Estructura del proyecto

- `prisma/schema.prisma` — modelo de datos completo (20+ entidades, ver Parte 6 de la spec)
- `prisma/seed.ts` — datos de ejemplo (proyectos, operadores, unidades, etc.)
- `src/app/` — rutas de la app (una carpeta por módulo: `unidades`, `operadores`, `mantenimiento`, `combustible`, `tag`, `seguros`, `mapa`, `proyectos`, `auditoria`, `reportes`, `usuarios`, `checklist`, `altas-bajas`)
- `src/components/` — componentes de UI compartidos y específicos por módulo
- `src/lib/` — helpers (formato, catálogos/enums, lógica de negocio como el filtro GPS del Módulo G.1)

## Pendiente (Fase 2, ver Parte 9 de la spec)

- Conexión real con IntelliHub (API/webhook de GPS)
- Envío efectivo de correos para alertas y reportes programados (requiere proveedor SMTP)
- Carga de archivos real para evidencias, pólizas y documentos (requiere Vercel Blob o S3)
