import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DIAS = (n: number) => new Date(Date.now() + n * 86_400_000);

async function main() {
  console.log("Sembrando datos mock…");

  // ── Roles ── (permisos por módulo, ver Parte 5 de la spec — Matriz de Roles y Permisos)
  const editar = { ver: true, editar: true };
  const ver = { ver: true };

  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: "Administrador" },
    update: {},
    create: {
      nombre: "Administrador",
      permisos: { "*": { "*": true } },
    },
  });
  const rolCV = await prisma.rol.upsert({
    where: { nombre: "Control Vehicular" },
    update: {},
    create: {
      nombre: "Control Vehicular",
      permisos: {
        A: editar, "A.1": editar, B: editar, C: editar, D: editar, E: editar,
        F: editar, G: editar, "G.1": editar, H: editar, I: editar, J: editar,
        L: editar,
      },
    },
  });
  const rolCoordinador = await prisma.rol.upsert({
    where: { nombre: "Coordinador de Proyecto" },
    update: {},
    create: {
      nombre: "Coordinador de Proyecto",
      permisos: {
        A: ver, "A.1": editar, C: ver, D: editar, E: editar, F: ver,
        G: ver, "G.1": ver, H: ver, I: ver, J: editar, L: ver,
      },
    },
  });
  const rolDireccion = await prisma.rol.upsert({
    where: { nombre: "Dirección" },
    update: {},
    create: {
      nombre: "Dirección",
      permisos: {
        A: ver, B: ver, C: ver, D: ver, E: ver, F: ver,
        G: ver, "G.1": ver, H: ver, I: ver, J: ver, L: ver,
      },
    },
  });

  // ── Usuarios ──
  const [uAdmin, uCV, uCoord, uDireccion] = await Promise.all([
    prisma.usuario.upsert({
      where: { correo: "admin@grupokabat.com" },
      update: {},
      create: { nombre: "Ana Martínez", correo: "admin@grupokabat.com", rolId: rolAdmin.id, estatus: "ACTIVO" },
    }),
    prisma.usuario.upsert({
      where: { correo: "control.vehicular@grupokabat.com" },
      update: {},
      create: { nombre: "Jorge Ramírez", correo: "control.vehicular@grupokabat.com", rolId: rolCV.id, estatus: "ACTIVO" },
    }),
    prisma.usuario.upsert({
      where: { correo: "coordinador.tampico@grupokabat.com" },
      update: {},
      create: { nombre: "Laura Sánchez", correo: "coordinador.tampico@grupokabat.com", rolId: rolCoordinador.id, estatus: "ACTIVO" },
    }),
    prisma.usuario.upsert({
      where: { correo: "direccion@grupokabat.com" },
      update: {},
      create: { nombre: "Roberto Kabat", correo: "direccion@grupokabat.com", rolId: rolDireccion.id, estatus: "ACTIVO" },
    }),
  ]);

  // ── Proyectos (multi-estado) ──
  const proyectosData = [
    { nombre: "Tampico Industrial", estadoRepublica: "Tamaulipas" },
    { nombre: "CDMX Corporativo", estadoRepublica: "Ciudad de México" },
    { nombre: "Monterrey Norte", estadoRepublica: "Nuevo León" },
    { nombre: "Guadalajara Occidente", estadoRepublica: "Jalisco" },
    { nombre: "Veracruz Puerto", estadoRepublica: "Veracruz" },
  ];
  const proyectos = [];
  for (const p of proyectosData) {
    const proyecto = await prisma.proyecto.create({
      data: {
        nombre: p.nombre,
        estadoRepublica: p.estadoRepublica,
        coordinadorId: uCoord.id,
        fechaInicio: new Date("2024-01-01"),
        estatus: "ACTIVO",
        presupuestoSemanal: 45000,
        semanaActualGastado: 18250.5,
        modulosActivos: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "L"],
        procesosActivos: ["checklist_diario", "conciliacion_diaria"],
      },
    });
    proyectos.push(proyecto);
  }

  await prisma.usuarioProyecto.createMany({
    data: proyectos.map((p) => ({ usuarioId: uCoord.id, proyectoId: p.id })),
    skipDuplicates: true,
  });

  // ── Operadores ──
  const operadoresData = [
    { nombre: "Carlos Hernández López", curp: "HELC850312HTSRPZ01", licencia: "C" as const },
    { nombre: "Miguel Ángel Torres", curp: "TOAM900521HDFRRG05", licencia: "B" as const },
    { nombre: "Fernando García Ruiz", curp: "GARF880115HVZRZR02", licencia: "C" as const },
    { nombre: "Ricardo Pérez Domínguez", curp: "PEDR920804HNLRMC08", licencia: "A" as const },
    { nombre: "Alejandro Sosa Medina", curp: "SOMA870630HJCSDL03", licencia: "B" as const },
    { nombre: "Javier Morales Castillo", curp: "MOCJ950228HTSRRV06", licencia: "C" as const },
    { nombre: "Daniel Reyes Aguilar", curp: "READ830917HDFYGL09", licencia: "D" as const },
    { nombre: "Luis Ángel Vázquez", curp: "VALA910405HVZZGS04", licencia: "B" as const },
  ];

  const operadores = [];
  for (let i = 0; i < operadoresData.length; i++) {
    const o = operadoresData[i];
    const proyecto = proyectos[i % proyectos.length];

    const fotoDoc = await prisma.documento.create({
      data: { entidadRelacionada: "Operador", entidadId: "pendiente", url: "/mock/foto-operador.jpg", tipo: "foto" },
    });

    const operador = await prisma.operador.create({
      data: {
        nombre: o.nombre,
        curp: o.curp,
        rfc: o.curp.slice(0, 10) + "A1",
        nss: `${10000000000 + i}`,
        tipoSangre: "O_POSITIVO",
        telefono: `833${(1000000 + i * 137).toString().slice(-7)}`,
        contactoEmergencia: "Familiar directo — 833 000 0000",
        fotoId: fotoDoc.id,
        proyectoId: proyecto.id,
        estatus: "ACTIVO",
        estatusDocumental: i === 3 ? "VENCIDO" : i === 5 ? "INCOMPLETO" : "COMPLETO",
      },
    });

    const licenciaArchivo = await prisma.documento.create({
      data: { entidadRelacionada: "DocumentoOperador", entidadId: operador.id, url: "/mock/licencia.pdf", tipo: "licencia" },
    });
    await prisma.documentoOperador.create({
      data: {
        operadorId: operador.id,
        tipoDocumento: "LICENCIA",
        numero: `LIC-${1000 + i}`,
        tipoLicencia: o.licencia,
        estadoEmisor: proyecto.estadoRepublica,
        fechaEmision: new Date("2023-01-15"),
        fechaVencimiento: i === 3 ? DIAS(-10) : DIAS(300 + i * 20),
        archivoId: licenciaArchivo.id,
        verificado: true,
        fechaVerificacion: new Date("2023-01-20"),
        verificadoPorId: uCV.id,
      },
    });

    const antidopingArchivo = await prisma.documento.create({
      data: { entidadRelacionada: "DocumentoOperador", entidadId: operador.id, url: "/mock/antidoping.pdf", tipo: "antidoping" },
    });
    await prisma.documentoOperador.create({
      data: {
        operadorId: operador.id,
        tipoDocumento: "ANTIDOPING",
        fechaEmision: new Date("2025-06-01"),
        fechaVencimiento: i === 5 ? DIAS(15) : DIAS(120),
        archivoId: antidopingArchivo.id,
        verificado: i !== 5,
      },
    });

    operadores.push(operador);
  }

  // ── Unidades ──
  const tipos = ["AUTO", "CAMIONETA", "GRUA", "MOTO"] as const;
  const marcas = [
    { marca: "Nissan", unidad: "NP300" },
    { marca: "Chevrolet", unidad: "Silverado" },
    { marca: "Ford", unidad: "Ranger" },
    { marca: "Toyota", unidad: "Hilux" },
    { marca: "Freightliner", unidad: "M2 106 (Grúa)" },
  ];
  const estatusList = ["ACTIVO", "ACTIVO", "ACTIVO", "CONSIGNACION", "DIRECCION", "BAJA"] as const;

  const unidades = [];
  for (let i = 0; i < 20; i++) {
    const numero = `KAB-${String(100 + i)}`;
    const proyecto = proyectos[i % proyectos.length];
    const marca = marcas[i % marcas.length];
    const estatus = estatusList[i % estatusList.length];
    const esBaja = estatus === "BAJA";
    const resguardante = operadores[i % operadores.length];

    const unidad = await prisma.unidad.create({
      data: {
        numeroEconomico: numero,
        placas: `${proyecto.estadoRepublica.slice(0, 2).toUpperCase()}-${String(10000 + i)}`,
        numeroSerie: `3N1CN7AP${(100000 + i).toString().padStart(8, "0")}`,
        marca: marca.marca,
        unidadModelo: marca.unidad,
        anio: 2020 + (i % 6),
        tipoVehiculo: tipos[i % tipos.length],
        tipoCombustible: i % 5 === 4 ? "DIESEL" : "GASOLINA",
        rendimientoPromedio: 8 + (i % 6),
        kmOficial: 15000 + i * 3200,
        proyectoId: esBaja ? null : proyecto.id,
        estadoOperacion: proyecto.estadoRepublica,
        estatus,
        disponibilidad: !esBaja && estatus === "ACTIVO",
        diasSinOperar: estatus === "ACTIVO" ? i % 3 : 5 + i,
        resguardanteId: esBaja ? null : resguardante.id,
        propietario: i % 3 === 0 ? "KABAT" : i % 3 === 1 ? "SYM" : "FIVE_STAR_SYSTEM",
        origenPlaca: proyecto.estadoRepublica,
        tagIave: `IAVE-${(500000 + i).toString()}`,
        fechaAlta: new Date(2021, i % 12, 1 + (i % 27)),
        fechaBaja: esBaja ? DIAS(-30) : null,
        motivoBaja: esBaja ? "FIN_VIDA_UTIL" : null,
      },
    });
    unidades.push(unidad);

    if (esBaja) continue;

    await prisma.resguardo.create({
      data: {
        numeroEconomico: unidad.numeroEconomico,
        operadorId: resguardante.id,
        fechaDesde: unidad.fechaAlta,
      },
    });

    // Checklist reciente
    await prisma.checklist.create({
      data: {
        numeroEconomico: unidad.numeroEconomico,
        fecha: DIAS(-1),
        odometro: unidad.kmOficial - 40,
        puntosInspeccion: {
          luces: "ok", frenos: "ok", llantas: "ok", niveles: "ok",
          documentos: "ok", limpieza: i % 4 === 0 ? "revisar" : "ok",
        },
        capturadoPorId: uCV.id,
      },
    });

    // Seguro + coberturas
    const polizaArchivo = await prisma.documento.create({
      data: { entidadRelacionada: "Seguro", entidadId: unidad.numeroEconomico, url: "/mock/poliza.pdf", tipo: "poliza" },
    });
    const vencePronto = i % 6 === 0;
    const seguro = await prisma.seguro.create({
      data: {
        numeroEconomico: unidad.numeroEconomico,
        aseguradora: i % 2 === 0 ? "Qualitas" : "GNP Seguros",
        numeroPoliza: `POL-${2024000 + i}`,
        fechaInicio: new Date("2025-06-01"),
        fechaVencimiento: vencePronto ? DIAS(5) : DIAS(200),
        costo: 14500 + i * 120,
        documentoId: polizaArchivo.id,
        estatus: vencePronto ? "POR_VENCER" : "VIGENTE",
      },
    });
    await prisma.coberturaSeguro.createMany({
      data: [
        { seguroId: seguro.id, tipoCobertura: "RC_TERCEROS", sumaAsegurada: 3000000, deducible: 0 },
        { seguroId: seguro.id, tipoCobertura: "DANOS_MATERIALES", sumaAsegurada: 350000, deducible: 5000 },
        { seguroId: seguro.id, tipoCobertura: "ROBO_TOTAL", sumaAsegurada: 350000, deducible: 5000 },
        { seguroId: seguro.id, tipoCobertura: "ASISTENCIA_VIAL", sumaAsegurada: 0, deducible: 0 },
      ],
    });

    // Combustible
    await prisma.combustible.create({
      data: {
        numeroEconomico: unidad.numeroEconomico,
        fecha: DIAS(-2),
        litros: 45.5,
        costo: 1092,
        kmActual: unidad.kmOficial - 20,
        estacion: "Estación Efectivale Centro",
        proyectoReportanteId: proyecto.id,
        fuente: "ARCHIVO",
        rendimientoCalculado: unidad.rendimientoPromedio,
      },
    });

    // TAG
    await prisma.tag.create({
      data: {
        numeroEconomico: unidad.numeroEconomico,
        fecha: DIAS(-1),
        monto: 85.5,
        caseta: "Caseta Cadereyta",
        proveedorTag: "IAVE",
        proyectoReportanteId: proyecto.id,
        conciliado: i % 3 !== 0,
      },
    });

    // Gasto vehicular (mantenimiento)
    await prisma.gastoVehicular.create({
      data: {
        numeroEconomico: unidad.numeroEconomico,
        categoria: i % 2 === 0 ? "MANTENIMIENTO_PREVENTIVO" : "LLANTAS",
        descripcion: "Servicio programado",
        fecha: DIAS(-10),
        costo: 3200 + i * 50,
        kmAlMomento: unidad.kmOficial - 500,
        proveedor: "Taller Autorizado Kabat",
        sc: `SC-${8000 + i}`,
        odc: `ODC-${8000 + i}`,
        estatus: "PAGADO",
      },
    });

    // Auditoría diaria
    const real = 1200 + i * 15;
    const cv = real - (i % 4 === 0 ? 150 : 0);
    await prisma.auditoria.create({
      data: {
        numeroEconomico: unidad.numeroEconomico,
        fechaRevision: DIAS(-1),
        revisorId: uCV.id,
        categoriaGasto: "COMBUSTIBLE",
        montoPptto: 1300,
        montoReal: real,
        montoCv: cv,
        diferencia: real - cv,
        tipoDiscrepancia: real !== cv ? "MONTO" : null,
        estatus: real !== cv ? "ABIERTA" : "RESUELTA",
      },
    });
  }

  console.log(`Listo: ${proyectos.length} proyectos, ${operadores.length} operadores, ${unidades.length} unidades.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
