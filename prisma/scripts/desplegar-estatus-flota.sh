#!/usr/bin/env bash
# Un solo paso para desplegar el feature de "Estatus semanal de flota" +
# motivo de indisponibilidad + triangulación: aplica la migración pendiente y
# actualiza los permisos de Control Vehicular / Gerente administrativo (que
# el seed no actualiza solo porque ya existen como filas en la base).
#
# Uso: ./prisma/scripts/desplegar-estatus-flota.sh
#
# Este script y actualizar-permisos-roles.ts son de un solo uso — bórralos
# después de confirmar que corrieron bien (una vez aplicados, `npm run
# db:seed` ya deja los permisos correctos si algún día se re-siembra desde
# cero, ver prisma/seed.ts).
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "→ Aplicando migraciones pendientes (prisma migrate deploy)..."
npx prisma migrate deploy

echo "→ Actualizando permisos de Control Vehicular y Gerente administrativo..."
npx tsx prisma/scripts/actualizar-permisos-roles.ts

echo "✓ Listo."
