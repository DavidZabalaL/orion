-- Simplifica el catálogo de EstatusUnidad a ACTIVO / INACTIVO / BAJA.
-- Las unidades que hoy están en CONSIGNACION o DIRECCION pasan a ACTIVO
-- (decisión de negocio: se consideran operativas dentro del ciclo de vida
-- binario Activo/Inactivo).

ALTER TYPE "EstatusUnidad" RENAME TO "EstatusUnidad_old";

CREATE TYPE "EstatusUnidad" AS ENUM ('ACTIVO', 'INACTIVO', 'BAJA');

ALTER TABLE "Unidad" ALTER COLUMN "estatus" DROP DEFAULT;

ALTER TABLE "Unidad" ALTER COLUMN "estatus" TYPE "EstatusUnidad" USING (
  CASE "estatus"::text
    WHEN 'CONSIGNACION' THEN 'ACTIVO'
    WHEN 'DIRECCION' THEN 'ACTIVO'
    ELSE "estatus"::text
  END
)::"EstatusUnidad";

ALTER TABLE "Unidad" ALTER COLUMN "estatus" SET DEFAULT 'ACTIVO';

DROP TYPE "EstatusUnidad_old";

-- El widget "consignacionODireccion" se renombra a "inactivas" (src/lib/widgets.ts).
-- Se actualiza el id dentro del JSON de configuración guardado por cada
-- usuario/módulo para no perder su preferencia de encendido/apagado ni el
-- layout ya personalizado.
UPDATE "ConfiguracionWidgets"
SET widgets = (
  SELECT jsonb_agg(
    CASE WHEN elem->>'id' = 'consignacionODireccion'
      THEN jsonb_set(elem, '{id}', '"inactivas"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(widgets::jsonb) AS elem
)
WHERE widgets::jsonb @> '[{"id":"consignacionODireccion"}]';
