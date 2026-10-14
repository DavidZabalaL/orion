import { prisma } from "@/lib/prisma";
import type { HojaParseada } from "@/lib/excel-parse";
import { elegirHojaPadron, extraerRegistrosPadron, normalizarNombre, type FilaInvalidaPadron } from "@/lib/padron-personal";
import { enviarResumenSincronizacionPadron } from "@/lib/email";

/** Solo se crean/revocan accesos de este rol — nunca Administrador, gerentes ni Control Vehicular. */
const ROL_SINCRONIZADO = "Operador";
/** Freno: si llegan menos de este % de los registros que ya hay, el archivo probablemente viene roto. */
const PROPORCION_MINIMA = 0.9;
const REGISTROS_MINIMOS = 50;
/** Se revoca hasta la 2a lectura seguida sin la persona y al menos estas horas después de la primera. */
const LECTURAS_PARA_REVOCAR = 2;
const HORAS_MINIMAS_PARA_REVOCAR = 20;
/** Freno de revocaciones: más de esto en una sola corrida se retiene para revisión manual. */
const MAX_REVOCACIONES_ABSOLUTO = 10;
const MAX_REVOCACIONES_PROPORCION = 0.1;

export type PersonaSincronizada = { curp: string; nombre: string; correo: string };
export type ResumenSincronizacionPadron = {
  id: string;
  aplicada: boolean;
  motivoFreno: string | null;
  filasArchivo: number;
  validas: number;
  altasPadron: number;
  bajasPadron: number;
  invalidas: FilaInvalidaPadron[];
  revocados: PersonaSincronizada[];
  reactivados: PersonaSincronizada[];
  enObservacion: PersonaSincronizada[];
  coincidenPorNombre: PersonaSincronizada[];
};

async function registrar(r: Omit<ResumenSincronizacionPadron, "id">, simular: boolean): Promise<ResumenSincronizacionPadron> {
  if (simular) return { ...r, id: "simulacion" };
  const fila = await prisma.sincronizacionPadron.create({ data: r, select: { id: true } });
  const resumen = { ...r, id: fila.id };
  if (!r.aplicada || r.revocados.length > 0 || r.reactivados.length > 0 || r.motivoFreno) {
    await notificar(resumen);
  }
  return resumen;
}

async function notificar(resumen: ResumenSincronizacionPadron) {
  const configurados = (process.env.PADRON_SYNC_NOTIFICAR ?? "").split(",").map((c) => c.trim()).filter(Boolean);
  const destinatarios = configurados.length
    ? configurados
    : (await prisma.usuario.findMany({ where: { estatus: "ACTIVO", rol: { nombre: "Control Vehicular" } }, select: { correo: true } })).map((u) => u.correo);
  if (destinatarios.length === 0) return;
  // Un correo fallido no debe deshacer ni frenar la sincronización ya aplicada.
  await enviarResumenSincronizacionPadron({ destinatarios, resumen }).catch(() => undefined);
}

/**
 * Sincroniza el padrón de personal activo con el archivo de RH y, a partir de
 * él, revoca o reactiva accesos de Operadores. Ver los frenos arriba: ante
 * cualquier señal de archivo incompleto no se toca nada y se avisa.
 */
/** `simular`: calcula todo y devuelve el resumen sin escribir nada (ni padrón, ni accesos, ni bitácora, ni correo). */
export async function sincronizarPadron(hojas: HojaParseada[], { ahora = new Date(), simular = false }: { ahora?: Date; simular?: boolean } = {}): Promise<ResumenSincronizacionPadron> {
  const vacio = { altasPadron: 0, bajasPadron: 0, invalidas: [], revocados: [], reactivados: [], enObservacion: [], coincidenPorNombre: [] };
  const hoja = elegirHojaPadron(hojas);
  if (!hoja) return registrar({ ...vacio, aplicada: false, motivoFreno: "El archivo no trae hojas con datos.", filasArchivo: 0, validas: 0 }, simular);

  const extraccion = extraerRegistrosPadron(hoja);
  if (!extraccion.ok) return registrar({ ...vacio, aplicada: false, motivoFreno: extraccion.error, filasArchivo: hoja.filas.length, validas: 0 }, simular);
  const { registros, invalidas, nombres, filas } = extraccion;

  const previos = await prisma.personalActivo.findMany({ select: { curp: true } });
  const frenoArchivo =
    registros.length < REGISTROS_MINIMOS
      ? `Solo llegaron ${registros.length} registros válidos (mínimo ${REGISTROS_MINIMOS}).`
      : previos.length > 0 && registros.length < previos.length * PROPORCION_MINIMA
        ? `Llegaron ${registros.length} registros válidos contra ${previos.length} del padrón actual (caída de ${Math.round((1 - registros.length / previos.length) * 100)}%). Probablemente el archivo viene incompleto o con fórmulas rotas.`
        : null;
  if (frenoArchivo) return registrar({ ...vacio, aplicada: false, motivoFreno: frenoArchivo, filasArchivo: filas, validas: registros.length, invalidas }, simular);

  const curpsArchivo = new Set(registros.map((r) => r.curp));
  const curpsPrevios = new Set(previos.map((p) => p.curp));
  const altasPadron = [...curpsArchivo].filter((c) => !curpsPrevios.has(c)).length;
  const bajasPadron = [...curpsPrevios].filter((c) => !curpsArchivo.has(c)).length;

  // Reemplazo completo, igual que la carga manual: el padrón es una foto del personal activo.
  if (!simular) await prisma.$transaction([prisma.personalActivo.deleteMany({}), prisma.personalActivo.createMany({ data: registros })]);

  const [usuarios, ausencias] = await Promise.all([
    prisma.usuario.findMany({
      where: { rol: { nombre: ROL_SINCRONIZADO }, operadorId: { not: null } },
      select: { id: true, correo: true, estatus: true, operador: { select: { curp: true, nombre: true } } },
    }),
    prisma.ausenciaPadron.findMany(),
  ]);
  const ausenciaPorCurp = new Map(ausencias.map((a) => [a.curp, a]));

  const reactivados: PersonaSincronizada[] = [];
  const enObservacion: PersonaSincronizada[] = [];
  const coincidenPorNombre: PersonaSincronizada[] = [];
  const porRevocar: { usuarioId: string; persona: PersonaSincronizada; lecturas: number }[] = [];
  const curpsVigentes = new Set<string>();

  for (const u of usuarios) {
    if (!u.operador) continue;
    const persona = { curp: u.operador.curp, nombre: u.operador.nombre, correo: u.correo };
    curpsVigentes.add(persona.curp);
    const ausencia = ausenciaPorCurp.get(persona.curp);
    const porCurp = curpsArchivo.has(persona.curp);
    const porNombre = !porCurp && nombres.has(normalizarNombre(persona.nombre));

    if (porCurp || porNombre) {
      if (porNombre) coincidenPorNombre.push(persona);
      if (ausencia) {
        if (ausencia.revocadoEn && u.estatus === "DESACTIVADO") {
          if (!simular) await prisma.usuario.update({ where: { id: u.id }, data: { estatus: "ACTIVO" } });
          reactivados.push(persona);
        }
        if (!simular) await prisma.ausenciaPadron.delete({ where: { curp: persona.curp } });
      }
      continue;
    }

    // Ausente. Una cuenta desactivada a mano (sin registro de ausencia) no se toca.
    if (!ausencia) {
      if (u.estatus === "ACTIVO") {
        if (!simular) await prisma.ausenciaPadron.create({ data: { curp: persona.curp, usuarioId: u.id, primeraAusencia: ahora } });
        enObservacion.push(persona);
      }
      continue;
    }
    if (ausencia.revocadoEn) continue;

    const lecturas = ausencia.lecturas + 1;
    const horas = (ahora.getTime() - ausencia.primeraAusencia.getTime()) / 3_600_000;
    if (u.estatus === "ACTIVO" && lecturas >= LECTURAS_PARA_REVOCAR && horas >= HORAS_MINIMAS_PARA_REVOCAR) {
      porRevocar.push({ usuarioId: u.id, persona, lecturas });
    } else {
      if (!simular) await prisma.ausenciaPadron.update({ where: { curp: persona.curp }, data: { lecturas } });
      enObservacion.push(persona);
    }
  }

  const operadoresActivos = usuarios.filter((u) => u.estatus === "ACTIVO").length;
  const limiteRevocaciones = Math.max(MAX_REVOCACIONES_ABSOLUTO, Math.floor(operadoresActivos * MAX_REVOCACIONES_PROPORCION));
  let motivoFreno: string | null = null;
  const revocados: PersonaSincronizada[] = [];

  if (porRevocar.length > limiteRevocaciones) {
    motivoFreno = `Se retuvieron ${porRevocar.length} revocaciones (límite por corrida: ${limiteRevocaciones}). Revisa el archivo; si las bajas son correctas, desactívalas a mano en Usuarios.`;
    for (const r of porRevocar) {
      if (!simular) await prisma.ausenciaPadron.update({ where: { curp: r.persona.curp }, data: { lecturas: r.lecturas } });
      enObservacion.push(r.persona);
    }
  } else {
    for (const r of porRevocar) {
      if (!simular) {
        await prisma.usuario.update({ where: { id: r.usuarioId }, data: { estatus: "DESACTIVADO", sesionInvalidadaEn: ahora } });
        await prisma.ausenciaPadron.update({ where: { curp: r.persona.curp }, data: { lecturas: r.lecturas, revocadoEn: ahora } });
      }
      revocados.push(r.persona);
    }
  }

  // Ausencias de cuentas que ya no son de Operador (cambio de rol, usuario borrado).
  if (!simular) await prisma.ausenciaPadron.deleteMany({ where: { curp: { notIn: [...curpsVigentes] } } });

  return registrar({
    aplicada: true,
    motivoFreno,
    filasArchivo: filas,
    validas: registros.length,
    altasPadron,
    bajasPadron,
    invalidas,
    revocados,
    reactivados,
    enObservacion,
    coincidenPorNombre,
  }, simular);
}
