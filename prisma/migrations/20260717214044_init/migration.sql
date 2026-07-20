-- CreateEnum
CREATE TYPE "TipoVehiculo" AS ENUM ('AUTO', 'CAMIONETA', 'GRUA', 'MOTO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoCombustible" AS ENUM ('GASOLINA', 'DIESEL', 'ELECTRICO', 'HIBRIDO');

-- CreateEnum
CREATE TYPE "EstatusUnidad" AS ENUM ('ACTIVO', 'CONSIGNACION', 'DIRECCION', 'BAJA');

-- CreateEnum
CREATE TYPE "MotivoBaja" AS ENUM ('VENTA', 'SINIESTRO_TOTAL', 'FIN_VIDA_UTIL', 'DEVOLUCION', 'CONSIGNACION_CERRADA', 'OTRO');

-- CreateEnum
CREATE TYPE "PropietarioUnidad" AS ENUM ('SYM', 'FIVE_STAR_SYSTEM', 'KABAT', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoSangre" AS ENUM ('O_POSITIVO', 'O_NEGATIVO', 'A_POSITIVO', 'A_NEGATIVO', 'B_POSITIVO', 'B_NEGATIVO', 'AB_POSITIVO', 'AB_NEGATIVO');

-- CreateEnum
CREATE TYPE "EstatusOperador" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'BAJA');

-- CreateEnum
CREATE TYPE "EstatusDocumental" AS ENUM ('COMPLETO', 'INCOMPLETO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "TipoDocumentoOperador" AS ENUM ('LICENCIA', 'INE', 'COMPROBANTE_DOMICILIO', 'ANTECEDENTES', 'CSF', 'EXAMEN_MEDICO', 'ANTIDOPING', 'CURSO_MANEJO', 'CERTIFICACION');

-- CreateEnum
CREATE TYPE "TipoLicencia" AS ENUM ('A', 'B', 'C', 'D', 'E');

-- CreateEnum
CREATE TYPE "CategoriaGasto" AS ENUM ('MANTENIMIENTO_PREVENTIVO', 'MANTENIMIENTO_CORRECTIVO', 'LLANTAS', 'REFACCIONES', 'CONSUMIBLES', 'TENENCIA', 'VERIFICACION', 'EMPLACAMIENTO', 'ESTACIONAMIENTO', 'MULTAS', 'RENTA_VEHICULOS', 'CASETAS');

-- CreateEnum
CREATE TYPE "EstatusGasto" AS ENUM ('PROGRAMADO', 'REALIZADO', 'PAGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "FuenteCombustible" AS ENUM ('API', 'ARCHIVO', 'MANUAL');

-- CreateEnum
CREATE TYPE "ProveedorTag" AS ENUM ('IAVE', 'PASE', 'TELEVIA');

-- CreateEnum
CREATE TYPE "EstatusSeguro" AS ENUM ('VIGENTE', 'POR_VENCER', 'VENCIDO', 'RENOVADO');

-- CreateEnum
CREATE TYPE "TipoCobertura" AS ENUM ('RC_TERCEROS', 'DANOS_MATERIALES', 'ROBO_TOTAL', 'ROBO_PARCIAL', 'GASTOS_MEDICOS', 'ASISTENCIA_VIAL', 'RC_PERSONAS', 'COBERTURA_LEGAL', 'PERDIDA_TOTAL', 'EXTENSION_RC', 'ESPECIAL');

-- CreateEnum
CREATE TYPE "FuenteGPS" AS ENUM ('API', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "MotivoAnomaliaGPS" AS ENUM ('VELOCIDAD_IMPOSIBLE', 'FUERA_DE_PAIS', 'SALTO_DISTANCIA');

-- CreateEnum
CREATE TYPE "TipoGeocerca" AS ENUM ('INMUEBLE', 'ZONA_TRABAJO', 'RUTA', 'PAIS');

-- CreateEnum
CREATE TYPE "CategoriaAuditoria" AS ENUM ('COMBUSTIBLE', 'TAG', 'MANTENIMIENTO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoDiscrepancia" AS ENUM ('MONTO', 'UNIDAD_FALTANTE', 'DUPLICADO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstatusAuditoria" AS ENUM ('ABIERTA', 'RESUELTA');

-- CreateEnum
CREATE TYPE "AccionBitacora" AS ENUM ('CREAR', 'EDITAR', 'DAR_DE_BAJA', 'REACTIVAR');

-- CreateEnum
CREATE TYPE "EstatusProyecto" AS ENUM ('ACTIVO', 'CERRADO');

-- CreateEnum
CREATE TYPE "EstatusUsuario" AS ENUM ('ACTIVO', 'INVITADO', 'DESACTIVADO');

-- CreateTable
CREATE TABLE "Rol" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "permisos" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,
    "estatus" "EstatusUsuario" NOT NULL DEFAULT 'INVITADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioProyecto" (
    "usuarioId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,

    CONSTRAINT "UsuarioProyecto_pkey" PRIMARY KEY ("usuarioId","proyectoId")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "entidadRelacionada" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaCarga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proyecto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estadoRepublica" TEXT NOT NULL,
    "coordinadorId" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "estatus" "EstatusProyecto" NOT NULL DEFAULT 'ACTIVO',
    "presupuestoSemanal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "semanaActualGastado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "modulosActivos" JSONB NOT NULL,
    "procesosActivos" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidad" (
    "numeroEconomico" TEXT NOT NULL,
    "placas" TEXT NOT NULL,
    "numeroSerie" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "unidadModelo" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "tipoVehiculo" "TipoVehiculo" NOT NULL,
    "tipoCombustible" "TipoCombustible" NOT NULL,
    "rendimientoPromedio" DECIMAL(6,2),
    "kmOficial" INTEGER NOT NULL DEFAULT 0,
    "proyectoId" TEXT,
    "estadoOperacion" TEXT NOT NULL,
    "estatus" "EstatusUnidad" NOT NULL DEFAULT 'ACTIVO',
    "disponibilidad" BOOLEAN NOT NULL DEFAULT true,
    "diasSinOperar" INTEGER NOT NULL DEFAULT 0,
    "resguardanteId" TEXT,
    "propietario" "PropietarioUnidad" NOT NULL,
    "origenPlaca" TEXT NOT NULL,
    "tagIave" TEXT,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaBaja" TIMESTAMP(3),
    "motivoBaja" "MotivoBaja",
    "comentarioBaja" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidad_pkey" PRIMARY KEY ("numeroEconomico")
);

-- CreateTable
CREATE TABLE "Operador" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "curp" TEXT NOT NULL,
    "rfc" TEXT,
    "nss" TEXT,
    "tipoSangre" "TipoSangre",
    "telefono" TEXT,
    "contactoEmergencia" TEXT,
    "fotoId" TEXT,
    "proyectoId" TEXT,
    "estatus" "EstatusOperador" NOT NULL DEFAULT 'ACTIVO',
    "estatusDocumental" "EstatusDocumental" NOT NULL DEFAULT 'INCOMPLETO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoOperador" (
    "id" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumentoOperador" NOT NULL,
    "numero" TEXT,
    "tipoLicencia" "TipoLicencia",
    "estadoEmisor" TEXT,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3),
    "archivoId" TEXT NOT NULL,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "fechaVerificacion" TIMESTAMP(3),
    "verificadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoOperador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignacionOperador" (
    "id" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "fechaDesde" TIMESTAMP(3) NOT NULL,
    "fechaHasta" TIMESTAMP(3),
    "motivoCambio" TEXT,

    CONSTRAINT "AsignacionOperador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resguardo" (
    "id" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,
    "fechaDesde" TIMESTAMP(3) NOT NULL,
    "fechaHasta" TIMESTAMP(3),
    "motivoCambio" TEXT,

    CONSTRAINT "Resguardo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "odometro" INTEGER NOT NULL,
    "puntosInspeccion" JSONB NOT NULL,
    "evidenciaId" TEXT,
    "capturadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastoVehicular" (
    "id" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL,
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "costo" DECIMAL(12,2) NOT NULL,
    "kmAlMomento" INTEGER,
    "proveedor" TEXT,
    "servicio" TEXT,
    "empresa" TEXT,
    "sc" TEXT,
    "odc" TEXT,
    "entradaSap" TEXT,
    "fechaRequisicion" TIMESTAMP(3),
    "fechaOdc" TIMESTAMP(3),
    "fechaFactura" TIMESTAMP(3),
    "fechaCxp" TIMESTAMP(3),
    "fechaPago" TIMESTAMP(3),
    "evidenciaId" TEXT,
    "estatus" "EstatusGasto" NOT NULL DEFAULT 'PROGRAMADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GastoVehicular_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionProveedorCombustible" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "mapeoColumnas" JSONB NOT NULL,
    "formatoFecha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionProveedorCombustible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Combustible" (
    "id" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "litros" DECIMAL(10,2) NOT NULL,
    "costo" DECIMAL(12,2) NOT NULL,
    "kmActual" INTEGER NOT NULL,
    "estacion" TEXT,
    "rfcEstacion" TEXT,
    "proyectoReportanteId" TEXT,
    "fuente" "FuenteCombustible" NOT NULL DEFAULT 'MANUAL',
    "proveedorConfigId" TEXT,
    "rendimientoCalculado" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Combustible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapeoTarjetaEconomico" (
    "numeroTarjeta" TEXT NOT NULL,
    "placaAsociada" TEXT,
    "numeroEconomico" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),

    CONSTRAINT "MapeoTarjetaEconomico_pkey" PRIMARY KEY ("numeroTarjeta")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "numeroEconomico" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "caseta" TEXT,
    "proveedorTag" "ProveedorTag" NOT NULL,
    "tarjetaIdmx" TEXT,
    "proyectoReportanteId" TEXT,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seguro" (
    "id" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "aseguradora" TEXT NOT NULL,
    "numeroPoliza" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "costo" DECIMAL(12,2) NOT NULL,
    "documentoId" TEXT,
    "estatus" "EstatusSeguro" NOT NULL DEFAULT 'VIGENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seguro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoberturaSeguro" (
    "id" TEXT NOT NULL,
    "seguroId" TEXT NOT NULL,
    "tipoCobertura" "TipoCobertura" NOT NULL,
    "sumaAsegurada" DECIMAL(12,2) NOT NULL,
    "deducible" DECIMAL(12,2) NOT NULL,
    "condicionesEspeciales" TEXT,

    CONSTRAINT "CoberturaSeguro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosicionGPS" (
    "id" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "velocidad" DECIMAL(6,2),
    "timestamp" TIMESTAMP(3) NOT NULL,
    "fuente" "FuenteGPS" NOT NULL,
    "kmReportado" INTEGER,
    "kmValidado" INTEGER,
    "esAnomalo" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnomalia" "MotivoAnomaliaGPS",

    CONSTRAINT "PosicionGPS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuecoSenalGPS" (
    "id" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "ultimaPosicionLat" DECIMAL(9,6) NOT NULL,
    "ultimaPosicionLng" DECIMAL(9,6) NOT NULL,
    "timestampInicio" TIMESTAMP(3) NOT NULL,
    "timestampFin" TIMESTAMP(3),
    "duracionMinutos" INTEGER,
    "primeraPosicionLat" DECIMAL(9,6),
    "primeraPosicionLng" DECIMAL(9,6),
    "distanciaSaltoKm" DECIMAL(8,2),
    "patronRecurrente" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HuecoSenalGPS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Geocerca" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoGeocerca" NOT NULL,
    "poligono" JSONB NOT NULL,
    "proyectoId" TEXT,
    "horaLimite" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Geocerca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "numeroEconomico" TEXT NOT NULL,
    "fechaRevision" TIMESTAMP(3) NOT NULL,
    "revisorId" TEXT NOT NULL,
    "categoriaGasto" "CategoriaAuditoria" NOT NULL,
    "montoPptto" DECIMAL(12,2) NOT NULL,
    "montoReal" DECIMAL(12,2) NOT NULL,
    "montoCv" DECIMAL(12,2) NOT NULL,
    "diferencia" DECIMAL(12,2) NOT NULL,
    "tipoDiscrepancia" "TipoDiscrepancia",
    "resolucion" TEXT,
    "estatus" "EstatusAuditoria" NOT NULL DEFAULT 'ABIERTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BitacoraCambio" (
    "id" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accion" "AccionBitacora" NOT NULL,
    "valoresAnteriores" JSONB,
    "valoresNuevos" JSONB,

    CONSTRAINT "BitacoraCambio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rol_nombre_key" ON "Rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_placas_key" ON "Unidad"("placas");

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_numeroSerie_key" ON "Unidad"("numeroSerie");

-- CreateIndex
CREATE INDEX "Unidad_proyectoId_idx" ON "Unidad"("proyectoId");

-- CreateIndex
CREATE INDEX "Unidad_estatus_idx" ON "Unidad"("estatus");

-- CreateIndex
CREATE UNIQUE INDEX "Operador_curp_key" ON "Operador"("curp");

-- CreateIndex
CREATE INDEX "Operador_proyectoId_idx" ON "Operador"("proyectoId");

-- CreateIndex
CREATE INDEX "DocumentoOperador_operadorId_idx" ON "DocumentoOperador"("operadorId");

-- CreateIndex
CREATE INDEX "DocumentoOperador_fechaVencimiento_idx" ON "DocumentoOperador"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "AsignacionOperador_numeroEconomico_idx" ON "AsignacionOperador"("numeroEconomico");

-- CreateIndex
CREATE INDEX "AsignacionOperador_operadorId_idx" ON "AsignacionOperador"("operadorId");

-- CreateIndex
CREATE INDEX "Resguardo_numeroEconomico_idx" ON "Resguardo"("numeroEconomico");

-- CreateIndex
CREATE INDEX "Resguardo_operadorId_idx" ON "Resguardo"("operadorId");

-- CreateIndex
CREATE INDEX "Checklist_numeroEconomico_fecha_idx" ON "Checklist"("numeroEconomico", "fecha");

-- CreateIndex
CREATE INDEX "GastoVehicular_numeroEconomico_idx" ON "GastoVehicular"("numeroEconomico");

-- CreateIndex
CREATE INDEX "GastoVehicular_categoria_idx" ON "GastoVehicular"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionProveedorCombustible_nombre_key" ON "ConfiguracionProveedorCombustible"("nombre");

-- CreateIndex
CREATE INDEX "Combustible_numeroEconomico_fecha_idx" ON "Combustible"("numeroEconomico", "fecha");

-- CreateIndex
CREATE INDEX "MapeoTarjetaEconomico_numeroEconomico_idx" ON "MapeoTarjetaEconomico"("numeroEconomico");

-- CreateIndex
CREATE INDEX "Tag_numeroEconomico_fecha_idx" ON "Tag"("numeroEconomico", "fecha");

-- CreateIndex
CREATE INDEX "Seguro_numeroEconomico_idx" ON "Seguro"("numeroEconomico");

-- CreateIndex
CREATE INDEX "Seguro_fechaVencimiento_idx" ON "Seguro"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "CoberturaSeguro_seguroId_idx" ON "CoberturaSeguro"("seguroId");

-- CreateIndex
CREATE INDEX "PosicionGPS_numeroEconomico_timestamp_idx" ON "PosicionGPS"("numeroEconomico", "timestamp");

-- CreateIndex
CREATE INDEX "HuecoSenalGPS_numeroEconomico_idx" ON "HuecoSenalGPS"("numeroEconomico");

-- CreateIndex
CREATE INDEX "Auditoria_numeroEconomico_fechaRevision_idx" ON "Auditoria"("numeroEconomico", "fechaRevision");

-- CreateIndex
CREATE INDEX "BitacoraCambio_entidad_entidadId_idx" ON "BitacoraCambio"("entidad", "entidadId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioProyecto" ADD CONSTRAINT "UsuarioProyecto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioProyecto" ADD CONSTRAINT "UsuarioProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unidad" ADD CONSTRAINT "Unidad_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unidad" ADD CONSTRAINT "Unidad_resguardanteId_fkey" FOREIGN KEY ("resguardanteId") REFERENCES "Operador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operador" ADD CONSTRAINT "Operador_fotoId_fkey" FOREIGN KEY ("fotoId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operador" ADD CONSTRAINT "Operador_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoOperador" ADD CONSTRAINT "DocumentoOperador_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Operador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoOperador" ADD CONSTRAINT "DocumentoOperador_archivoId_fkey" FOREIGN KEY ("archivoId") REFERENCES "Documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoOperador" ADD CONSTRAINT "DocumentoOperador_verificadoPorId_fkey" FOREIGN KEY ("verificadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionOperador" ADD CONSTRAINT "AsignacionOperador_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Operador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionOperador" ADD CONSTRAINT "AsignacionOperador_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resguardo" ADD CONSTRAINT "Resguardo_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resguardo" ADD CONSTRAINT "Resguardo_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Operador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_capturadoPorId_fkey" FOREIGN KEY ("capturadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoVehicular" ADD CONSTRAINT "GastoVehicular_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoVehicular" ADD CONSTRAINT "GastoVehicular_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combustible" ADD CONSTRAINT "Combustible_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combustible" ADD CONSTRAINT "Combustible_proyectoReportanteId_fkey" FOREIGN KEY ("proyectoReportanteId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combustible" ADD CONSTRAINT "Combustible_proveedorConfigId_fkey" FOREIGN KEY ("proveedorConfigId") REFERENCES "ConfiguracionProveedorCombustible"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapeoTarjetaEconomico" ADD CONSTRAINT "MapeoTarjetaEconomico_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_proyectoReportanteId_fkey" FOREIGN KEY ("proyectoReportanteId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seguro" ADD CONSTRAINT "Seguro_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seguro" ADD CONSTRAINT "Seguro_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoberturaSeguro" ADD CONSTRAINT "CoberturaSeguro_seguroId_fkey" FOREIGN KEY ("seguroId") REFERENCES "Seguro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosicionGPS" ADD CONSTRAINT "PosicionGPS_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HuecoSenalGPS" ADD CONSTRAINT "HuecoSenalGPS_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Geocerca" ADD CONSTRAINT "Geocerca_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_numeroEconomico_fkey" FOREIGN KEY ("numeroEconomico") REFERENCES "Unidad"("numeroEconomico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_revisorId_fkey" FOREIGN KEY ("revisorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitacoraCambio" ADD CONSTRAINT "BitacoraCambio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
