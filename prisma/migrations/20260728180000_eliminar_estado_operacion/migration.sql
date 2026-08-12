-- Elimina "Estado de operación" de Unidad: era redundante con Proyecto
-- (cada Proyecto ya trae su propio estadoRepublica).
ALTER TABLE "Unidad" DROP COLUMN "estadoOperacion";
