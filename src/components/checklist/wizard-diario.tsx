"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Camera, CheckCircle2, ChevronLeft, Loader2, X, Image as ImageIcon } from "lucide-react";
import { crearChecklist, subirFotoChecklist } from "@/app/(app)/checklist/actions";
import { ComboboxUnidad } from "@/components/ui/combobox-unidad";
import { PUNTOS_INSPECCION } from "@/lib/checklist";
import { ESTADOS_CARGA, MUNICIPIOS_POR_ESTADO, AREAS_CARGA } from "@/lib/checklist-carga-combustible";
import { prepararFotoDiferida } from "@/lib/foto-diferida";
import { FirmaPad } from "@/components/checklist/firma-pad";
import { leerBorrador, guardarBorrador, borrarBorrador } from "@/lib/borrador-checklist";

// ─── tipos ───────────────────────────────────────────────────────────────────

type UnidadWizard = {
  numeroEconomico: string;
  placas: string;
  marca: string;
  unidadModelo: string;
  tipoVehiculo: string;
  proyectoId: string | null;
  proyectoNombre: string | null;
  /** Quién tiene la unidad tomada activamente en "Mi Turno" ahora mismo — null si nadie. */
  responsableActivo: string | null;
  /** true si quien tiene la unidad tomada es la persona en sesión actual. */
  esResponsableActual: boolean;
};

type Props = {
  unidades: UnidadWizard[];
  proyectos: { id: string; nombre: string }[];
  esAdmin: boolean;
  fechaHoraActual: string;
  /** Gerencial/Control Vehicular pueden elegir fotos ya tomadas (ej. recibidas por WhatsApp) para cualquier evidencia; el resto de roles solo puede usar la cámara, salvo la licencia (siempre permite galería). */
  permitirGaleriaFotos?: boolean;
  onTerminar: () => void;
  onCancelar: () => void;
};

type Fase =
  | "identificacion"
  | "generales"
  | "guia"
  | "niveles_extra"
  | "exterior"
  | "interior"
  | "lecturas"
  | "seguridad"
  | "exito";

const ITEMS_INSPECCION = PUNTOS_INSPECCION.map((p) => ({ tipo: "punto" as const, key: p.key, label: p.label }));

// Borrador en localStorage — ver src/lib/borrador-checklist.ts. Solo se
// guardan datos y URLs ya subidas, nunca archivos (un File no sobrevive una
// recarga de página de todas formas).
const CLAVE_BORRADOR = "diario";
type Borrador = {
  fase: Fase;
  idx: number;
  proyectoFiltro: string;
  numeroEconomico: string;
  estados: Record<string, "ok" | "revisar">;
  odometro: string;
  horometro: string;
  respuestasExtra: Record<string, string>;
  firmaBase64: string;
  urlsSubidas: Record<string, string>;
};

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-lg)",
  width: "100%",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  display: "block",
  marginBottom: 6,
};

const navBtnStyle: React.CSSProperties = {
  background: "var(--chip)",
  color: "var(--sidebar-text-active)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-sm)",
};

const btnPrimaryStyle: React.CSSProperties = {
  background: "var(--color-primary)",
  color: "#fff",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
};

const errorStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-sm)",
  color: "var(--color-status-escena)",
};

// ─── sub-componentes ─────────────────────────────────────────────────────────

function BarraProgreso({ actual, total }: { actual: number; total: number }) {
  const pct = total > 0 ? Math.round((actual / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5 flex-1">
      <div className="flex justify-between items-center">
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
          Inspección diaria
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
          {actual} / {total}
        </span>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "var(--field-bg)" }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: "var(--color-primary)" }} />
      </div>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export function WizardDiario({ unidades, proyectos, esAdmin, fechaHoraActual, permitirGaleriaFotos = false, onTerminar, onCancelar }: Props) {
  const [borradorInicial] = useState(() => leerBorrador<Borrador>(CLAVE_BORRADOR));

  const [fase, setFase] = useState<Fase>(borradorInicial?.fase ?? "identificacion");
  const [idx, setIdx] = useState(borradorInicial?.idx ?? 0);
  const [proyectoFiltro, setProyectoFiltro] = useState(borradorInicial?.proyectoFiltro ?? proyectos[0]?.id ?? "");
  const [numeroEconomico, setNumeroEconomico] = useState(borradorInicial?.numeroEconomico ?? "");

  // Guia phase
  const [estados, setEstados] = useState<Record<string, "ok" | "revisar">>(borradorInicial?.estados ?? {});
  // Las fotos ya NO se suben al tomarlas — se comprimen y se guardan en
  // memoria (archivo comprimido, unos cientos de KB) hasta que se envía todo
  // el checklist al final. Así ningún paso intermedio depende de tener buena
  // señal; solo el envío final la necesita. Ver enviar().
  const [archivosPorPunto, setArchivosPorPunto] = useState<Record<string, File>>({});

  // Lecturas phase
  const [odometro, setOdometro] = useState(borradorInicial?.odometro ?? "");
  const [horometro, setHorometro] = useState(borradorInicial?.horometro ?? "");
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null);
  const [fotoHorometroArchivo, setFotoHorometroArchivo] = useState<File | null>(null);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [procesandoFotoHorometro, setProcesandoFotoHorometro] = useState(false);
  const [procesandoFotoPunto, setProcesandoFotoPunto] = useState(false);

  // Extra sections
  const [respuestasExtra, setRespuestasExtra] = useState<Record<string, string>>(borradorInicial?.respuestasExtra ?? {});
  const [archivosExtra, setArchivosExtra] = useState<Record<string, File>>({});
  const [firmaBase64, setFirmaBase64] = useState(borradorInicial?.firmaBase64 ?? "");
  const [procesandoExtra, setProcesandoExtra] = useState<string | null>(null);

  // Subida en bloque al enviar — ver enviar(). `urlsSubidas` persiste entre
  // reintentos (si el envío falla a la mitad, no se vuelve a subir lo que ya
  // se subió con éxito), indexado por el mismo nombre de campo que usa
  // crearChecklist (ej. "evidenciaUrl", "foto_horometro", "gen_foto_licencia").
  // También es la parte más valiosa del borrador en localStorage: son fotos
  // que ya se subieron de verdad y que no habría que repetir si el navegador
  // recarga la página a medio checklist.
  const [urlsSubidas, setUrlsSubidas] = useState<Record<string, string>>(borradorInicial?.urlsSubidas ?? {});
  const [progresoSubida, setProgresoSubida] = useState<{ actual: number; total: number } | null>(null);

  // Guarda el borrador en localStorage cada vez que cambia algo relevante —
  // así, si Android recarga la pestaña por falta de memoria mientras estaba
  // en segundo plano, el wizard recupera dónde se había quedado en vez de
  // volver a "identificación". No incluye archivos locales (no sobreviven una
  // recarga); solo datos y URLs ya subidas.
  useEffect(() => {
    if (fase === "exito") return;
    guardarBorrador<Borrador>(CLAVE_BORRADOR, {
      fase, idx, proyectoFiltro, numeroEconomico, estados, odometro, horometro, respuestasExtra, firmaBase64, urlsSubidas,
    });
  }, [fase, idx, proyectoFiltro, numeroEconomico, estados, odometro, horometro, respuestasExtra, firmaBase64, urlsSubidas]);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Copia "viva" de qué archivo es el vigente por campo — para que, si la
  // subida en segundo plano de una foto ya reemplazada por una más nueva
  // termina tarde, no pise el estado con una URL obsoleta. Ver los handlers
  // de abajo (handleExtraFoto, subirFotoPunto, subirFoto, subirFotoHorometro).
  const archivoVigenteExtraRef = useRef<Record<string, File>>({});
  const archivoVigentePuntoRef = useRef<Record<string, File>>({});
  const archivoVigenteOdometroRef = useRef<File | null>(null);
  const archivoVigenteHorometroRef = useRef<File | null>(null);

  // File input refs
  const extraFotoInputRef = useRef<HTMLInputElement>(null);
  const fotoPuntoInputRef = useRef<HTMLInputElement>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const fotoHorometroInputRef = useRef<HTMLInputElement>(null);
  // Cuando un campo permite galería (la licencia siempre; el resto solo para
  // Gerencial/Control Vehicular vía permitirGaleriaFotos) se ofrecen dos
  // opciones explícitas — un input con `capture` (cámara) y otro sin él
  // (galería) — en vez de un solo botón que deje la elección al selector
  // nativo del sistema operativo, que no se comporta igual en todos los
  // dispositivos. Comparten el mismo extraFotoKeyRef que el input de solo
  // cámara para saber a qué campo pertenece la foto seleccionada.
  const extraGaleriaInputRef = useRef<HTMLInputElement>(null);
  const extraFotoKeyRef = useRef("");
  const puntoFotoActualRef = useRef<string | null>(null);

  // Derived
  const unidadesFiltradas = useMemo(
    () => (proyectoFiltro ? unidades.filter((u) => u.proyectoId === proyectoFiltro) : unidades),
    [unidades, proyectoFiltro],
  );
  const unidadSel = unidades.find((u) => u.numeroEconomico === numeroEconomico);
  const esGrua = unidadSel?.tipoVehiculo === "GRUA";

  const fechaDisplay = (() => {
    try {
      return new Date(fechaHoraActual).toLocaleString("es-MX", {
        weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return fechaHoraActual;
    }
  })();

  // Una foto "cuenta" tanto si todavía está en memoria esperando su turno de
  // subir como si ya se subió (y por eso ya se soltó de `archivosExtra`/
  // `archivosPorPunto`/`fotoArchivo`/`fotoHorometroArchivo` — ver los
  // handlers de arriba). Las validaciones y el render usan esto, nunca el
  // estado local a secas, para no "perder" una foto ya lista de vista apenas
  // termina de subirse en segundo plano.
  function tieneFotoExtra(clave: string): boolean {
    return !!archivosExtra[clave] || !!urlsSubidas[clave];
  }
  function tieneFotoPunto(key: string): boolean {
    return !!archivosPorPunto[key] || !!urlsSubidas[`foto_${key}`];
  }
  const tieneOdometro = !!fotoArchivo || !!urlsSubidas["evidenciaUrl"];
  const tieneHorometro = !!fotoHorometroArchivo || !!urlsSubidas["foto_horometro"];

  const zona = respuestasExtra["gen_zona"] ?? "";
  const area = respuestasExtra["gen_area"] ?? "";
  const municipiosDisponibles = zona ? ((MUNICIPIOS_POR_ESTADO as Record<string, string[]>)[zona] ?? []) : [];
  const responsableActivo = unidadSel?.responsableActivo ?? null;
  const puedeCompletarla = !!unidadSel && unidadSel.esResponsableActual;

  const total = ITEMS_INSPECCION.length;
  const guiaItem = ITEMS_INSPECCION[idx];

  // Solo una foto a la vez procesándose (comprimiéndose) en todo el
  // checklist — evita acumular varias compresiones simultáneas si se va
  // rápido tocando "tomar foto" en distintos campos antes de que termine la
  // anterior. Ya no depende de la red (la subida real es hasta el final).
  const bloqueoGlobalFoto = procesandoFoto || procesandoFotoHorometro || procesandoFotoPunto || procesandoExtra !== null;

  // ─── Captura + compresión local + subida en segundo plano ─────────────────
  // Cada foto se comprime aquí mismo (rápido, sin red) y de inmediato marca
  // el campo como "listo" para poder avanzar — la subida real a Vercel Blob
  // corre en segundo plano, sin bloquear. En cuanto esa subida termina, el
  // archivo local se suelta de memoria (solo se conserva la URL) — así nunca
  // se acumulan todas las fotos de la sesión en RAM a la vez, a diferencia de
  // subirlas todas hasta el final. Si la subida falla (sin señal en ese
  // momento), el archivo se queda tal cual para reintentarse al enviar() el
  // checklist completo.

  function iniciarFotoExtra(key: string) {
    extraFotoKeyRef.current = key;
    if (extraFotoInputRef.current) extraFotoInputRef.current.value = "";
    extraFotoInputRef.current?.click();
  }

  function iniciarFotoExtraGaleria(key: string) {
    extraFotoKeyRef.current = key;
    if (extraGaleriaInputRef.current) extraGaleriaInputRef.current.value = "";
    extraGaleriaInputRef.current?.click();
  }

  async function handleExtraFoto(file: File | undefined) {
    const key = extraFotoKeyRef.current;
    if (!file || !key) return;
    setProcesandoExtra(key);
    setError(null);
    const { archivo, subida } = await prepararFotoDiferida(file);
    archivoVigenteExtraRef.current[key] = archivo;
    setArchivosExtra((p) => ({ ...p, [key]: archivo }));
    setUrlsSubidas((p) => { const c = { ...p }; delete c[key]; return c; });
    setProcesandoExtra(null);
    subida.then((r) => {
      if (archivoVigenteExtraRef.current[key] !== archivo) return; // se retomó la foto mientras subía
      if (r.ok) {
        setArchivosExtra((p) => { const c = { ...p }; delete c[key]; return c; });
        setUrlsSubidas((p) => ({ ...p, [key]: r.url }));
      }
    });
  }

  function abrirFotoPunto(key: string) {
    puntoFotoActualRef.current = key;
    if (fotoPuntoInputRef.current) fotoPuntoInputRef.current.value = "";
    fotoPuntoInputRef.current?.click();
  }

  async function subirFotoPunto(file: File | undefined) {
    const key = puntoFotoActualRef.current;
    if (!file || !key) return;
    setProcesandoFotoPunto(true);
    setError(null);
    const { archivo, subida } = await prepararFotoDiferida(file);
    archivoVigentePuntoRef.current[key] = archivo;
    setArchivosPorPunto((p) => ({ ...p, [key]: archivo }));
    setUrlsSubidas((p) => { const c = { ...p }; delete c[`foto_${key}`]; return c; });
    setProcesandoFotoPunto(false);
    subida.then((r) => {
      if (archivoVigentePuntoRef.current[key] !== archivo) return;
      if (r.ok) {
        setArchivosPorPunto((p) => { const c = { ...p }; delete c[key]; return c; });
        setUrlsSubidas((p) => ({ ...p, [`foto_${key}`]: r.url }));
      }
    });
  }

  async function subirFoto(file: File | undefined) {
    if (!file) return;
    setProcesandoFoto(true);
    setError(null);
    const { archivo, subida } = await prepararFotoDiferida(file);
    archivoVigenteOdometroRef.current = archivo;
    setFotoArchivo(archivo);
    setUrlsSubidas((p) => { const c = { ...p }; delete c["evidenciaUrl"]; return c; });
    setProcesandoFoto(false);
    subida.then((r) => {
      if (archivoVigenteOdometroRef.current !== archivo) return;
      if (r.ok) {
        setFotoArchivo(null);
        setUrlsSubidas((p) => ({ ...p, evidenciaUrl: r.url }));
      }
    });
  }

  async function subirFotoHorometro(file: File | undefined) {
    if (!file) return;
    setProcesandoFotoHorometro(true);
    setError(null);
    const { archivo, subida } = await prepararFotoDiferida(file);
    archivoVigenteHorometroRef.current = archivo;
    setFotoHorometroArchivo(archivo);
    setUrlsSubidas((p) => { const c = { ...p }; delete c["foto_horometro"]; return c; });
    setProcesandoFotoHorometro(false);
    subida.then((r) => {
      if (archivoVigenteHorometroRef.current !== archivo) return;
      if (r.ok) {
        setFotoHorometroArchivo(null);
        setUrlsSubidas((p) => ({ ...p, foto_horometro: r.url }));
      }
    });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  function avanzar() {
    if (idx < total - 1) setIdx(idx + 1);
    else setFase("niveles_extra");
  }

  function seleccionarPunto(key: string, valor: "ok" | "revisar") {
    setEstados((s) => ({ ...s, [key]: valor }));
    if (valor === "ok") setTimeout(avanzar, 160);
  }

  // ─── Validations ─────────────────────────────────────────────────────────

  function validarGenerales(): string | null {
    if (!zona) return "Selecciona un estado.";
    if (!respuestasExtra["gen_municipio"]) return "Selecciona un municipio.";
    if (!area) return "Selecciona un área.";
    if (!responsableActivo) return "Esta unidad no tiene un responsable activo — debe tomarse primero desde \"Mi Turno\".";
    if (!puedeCompletarla) return `Esta unidad la tiene tomada ${responsableActivo}. Solo esa persona puede completar este checklist.`;
    if (!respuestasExtra["gen_tipo_licencia"]) return "Indica el tipo de licencia.";
    if (!tieneFotoExtra("gen_foto_licencia")) return "La foto de licencia es obligatoria.";
    return null;
  }

  function validarNivelesExtra(): string | null {
    if (!respuestasExtra["niv_luz_check"]) return "Indica si hay luz de check encendida.";
    if (!tieneFotoExtra("niv_evidencia_luz_check")) return "La foto de la luz de check es obligatoria.";
    if (!respuestasExtra["niv_nivel_combustible"]) return "Indica el nivel de combustible.";
    if (!tieneFotoExtra("niv_evidencia_combustible")) return "La foto del nivel de combustible es obligatoria.";
    return null;
  }

  function validarExterior(): string | null {
    if (!respuestasExtra["ext_tiene_golpes"]) return "Indica si el vehículo tiene golpes.";
    if (respuestasExtra["ext_tiene_golpes"] === "SÍ" && !tieneFotoExtra("ext_evidencia_golpes_1")) return "Adjunta al menos una foto de evidencia de los golpes.";
    if (!tieneFotoExtra("ext_evidencia_frente")) return "La foto del frente es obligatoria.";
    if (!respuestasExtra["ext_parabrisas_espejos"]) return "Indica el estado del parabrisas y espejos.";
    if (!tieneFotoExtra("ext_evidencia_parabrisas_espejos")) return "La foto de parabrisas/espejos es obligatoria.";
    if (!tieneFotoExtra("ext_evidencia_lado_derecho")) return "La foto del lado derecho es obligatoria.";
    if (!tieneFotoExtra("ext_evidencia_parte_trasera")) return "La foto de la parte trasera es obligatoria.";
    if (!tieneFotoExtra("ext_evidencia_lado_izquierdo")) return "La foto del lado izquierdo es obligatoria.";
    if (esGrua && !tieneFotoExtra("ext_brazo_grua")) return "La foto del brazo de grúa es obligatoria.";
    return null;
  }

  function validarInterior(): string | null {
    if (!tieneFotoExtra("int_evidencia_tarjeta_circulacion")) return "La foto de la tarjeta de circulación es obligatoria.";
    if (!tieneFotoExtra("int_evidencia_tarjeta_combustible")) return "La foto de la tarjeta de combustible es obligatoria.";
    return null;
  }

  function validarLecturas(): string | null {
    if (!odometro || Number(odometro) <= 0) return "Ingresa una lectura de odómetro válida.";
    if (!tieneOdometro) return "La foto del odómetro es obligatoria.";
    if (esGrua && !tieneHorometro) return "La foto del horómetro es obligatoria para grúas.";
    return null;
  }

  function validarSeguridad(): string | null {
    if (!respuestasExtra["seg_llanta_refaccion"]) return "Indica si cuenta con llanta de refacción.";
    if (!tieneFotoExtra("seg_evidencia_llanta_refaccion")) return "La foto de la llanta de refacción es obligatoria.";
    if (!respuestasExtra["seg_gato"]) return "Indica si cuenta con gato.";
    if (!tieneFotoExtra("seg_evidencia_gato")) return "La foto del gato es obligatoria.";
    if (!respuestasExtra["seg_cables_corriente"]) return "Indica si cuenta con cables de corriente.";
    if (!tieneFotoExtra("seg_evidencia_cables_corriente")) return "La foto de los cables es obligatoria.";
    if (!firmaBase64) return "La firma del responsable es obligatoria.";
    return null;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  function enviar() {
    const errSeg = validarSeguridad();
    if (errSeg) { setError(errSeg); return; }
    setError(null);
    startTransition(async () => {
      // Cada foto ya se subió en segundo plano apenas se tomó (ver los
      // handlers arriba) — lo normal es que aquí ya no quede nada pendiente.
      // Esto es solo la red de seguridad para las que no hayan alcanzado a
      // subir (sin señal en su momento): se reintentan aquí, en bloque, antes
      // de guardar el checklist. `urlsSubidas` ya trae las que sí se subieron,
      // así no se repite ninguna subida exitosa.
      const pendientes: { campo: string; archivo: File }[] = [];
      if (fotoArchivo && !urlsSubidas["evidenciaUrl"]) pendientes.push({ campo: "evidenciaUrl", archivo: fotoArchivo });
      if (esGrua && fotoHorometroArchivo && !urlsSubidas["foto_horometro"]) pendientes.push({ campo: "foto_horometro", archivo: fotoHorometroArchivo });
      for (const [k, archivo] of Object.entries(archivosPorPunto)) {
        const campo = `foto_${k}`;
        if (!urlsSubidas[campo]) pendientes.push({ campo, archivo });
      }
      for (const [campo, archivo] of Object.entries(archivosExtra)) {
        if (!urlsSubidas[campo]) pendientes.push({ campo, archivo });
      }

      const urls = { ...urlsSubidas };
      if (pendientes.length > 0) {
        setProgresoSubida({ actual: 0, total: pendientes.length });
        for (let i = 0; i < pendientes.length; i++) {
          const { campo, archivo } = pendientes[i];
          const fdFoto = new FormData();
          fdFoto.set("file", archivo);
          const r = await subirFotoChecklist(fdFoto);
          if (!r.ok) {
            setUrlsSubidas(urls); // conserva lo ya subido en este intento para el próximo reintento
            setProgresoSubida(null);
            setError(`No se pudo subir una evidencia fotográfica: ${r.error} Puedes intentar de nuevo — lo ya subido no se repite.`);
            return;
          }
          urls[campo] = r.url;
          setProgresoSubida({ actual: i + 1, total: pendientes.length });
        }
        setUrlsSubidas(urls);
      }
      setProgresoSubida(null);

      const fd = new FormData();
      fd.set("numeroEconomico", numeroEconomico);
      fd.set("gen_responsable", responsableActivo ?? "");
      fd.set("odometro", odometro);
      if (esGrua && horometro) fd.set("horometro", horometro);
      fd.set("evidenciaUrl", urls["evidenciaUrl"] ?? "");
      if (esGrua && urls["foto_horometro"]) fd.set("foto_horometro", urls["foto_horometro"]);
      for (const [k, v] of Object.entries(estados)) fd.set(`punto_${k}`, v);
      for (const k of Object.keys(archivosPorPunto)) {
        const url = urls[`foto_${k}`];
        if (url) fd.set(`foto_${k}`, url);
      }
      for (const [k, v] of Object.entries(respuestasExtra)) fd.set(k, v);
      for (const campo of Object.keys(archivosExtra)) {
        const url = urls[campo];
        if (url) fd.set(campo, url);
      }
      if (firmaBase64) fd.set("seg_firma_responsable", firmaBase64);
      const res = await crearChecklist(fd);
      if (!res.ok) { setError(res.error); return; }
      borrarBorrador(CLAVE_BORRADOR);
      setFase("exito");
    });
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  function rFoto(clave: string, label: string, requerido = true, permitirGaleria = permitirGaleriaFotos) {
    const lista = tieneFotoExtra(clave);
    const sub = procesandoExtra === clave;
    const deshabilitado = bloqueoGlobalFoto && !sub;
    if (lista) {
      return (
        <div key={clave}>
          <label style={labelStyle}>{label}{requerido ? " *" : ""}</label>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.3)" }}>
            <CheckCircle2 size={15} color="#16a34a" className="shrink-0" />
            <span className="flex-1 truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#16a34a" }}>Foto lista</span>
            <button type="button" onClick={() => {
              delete archivoVigenteExtraRef.current[clave];
              setArchivosExtra((p) => { const c = { ...p }; delete c[clave]; return c; });
              setUrlsSubidas((p) => { const c = { ...p }; delete c[clave]; return c; });
            }} style={{ color: "#16a34a", opacity: 0.6, cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
        </div>
      );
    }
    if (permitirGaleria) {
      return (
        <div key={clave}>
          <label style={labelStyle}>{label}{requerido ? " *" : ""}</label>
          <div className="flex gap-2">
            <button type="button" disabled={deshabilitado} onClick={() => iniciarFotoExtra(clave)} className="flex flex-1 items-center justify-center gap-2 rounded-xl disabled:opacity-50"
              style={{ height: 52, background: "var(--field-bg)", border: "1px dashed var(--field-border)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", cursor: deshabilitado ? "not-allowed" : "pointer" }}>
              {sub ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              {sub ? "Procesando…" : "Tomar foto"}
            </button>
            <button type="button" disabled={deshabilitado} onClick={() => iniciarFotoExtraGaleria(clave)} className="flex flex-1 items-center justify-center gap-2 rounded-xl disabled:opacity-50"
              style={{ height: 52, background: "var(--field-bg)", border: "1px dashed var(--field-border)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", cursor: deshabilitado ? "not-allowed" : "pointer" }}>
              {sub ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              {sub ? "Procesando…" : "Elegir de galería"}
            </button>
          </div>
          {deshabilitado && (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>Espera a que termine la foto anterior…</p>
          )}
        </div>
      );
    }
    return (
      <div key={clave}>
        <label style={labelStyle}>{label}{requerido ? " *" : ""}</label>
        <button type="button" disabled={deshabilitado} onClick={() => iniciarFotoExtra(clave)} className="flex items-center justify-center gap-2 rounded-xl w-full disabled:opacity-50"
          style={{ height: 52, background: "var(--field-bg)", border: "1px dashed var(--field-border)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", cursor: deshabilitado ? "not-allowed" : "pointer" }}>
          {sub ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {sub ? "Procesando…" : "Tomar foto"}
        </button>
        {deshabilitado && (
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>Espera a que termine la foto anterior…</p>
        )}
      </div>
    );
  }

  function rRadio(clave: string, label: string, opciones: string[]) {
    const val = respuestasExtra[clave] ?? "";
    return (
      <div key={clave}>
        <label style={labelStyle}>{label} *</label>
        <div className="flex flex-wrap gap-2">
          {opciones.map((op) => (
            <button key={op} type="button" onClick={() => setRespuestasExtra((p) => ({ ...p, [clave]: op }))}
              className="rounded-full px-4 h-9 font-semibold transition-colors"
              style={{ background: val === op ? "var(--color-primary)" : "var(--field-bg)", color: val === op ? "#fff" : "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", border: val === op ? "none" : "1px solid var(--field-border)", cursor: "pointer", whiteSpace: "nowrap" }}>
              {op}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function rToggle(clave: string, label: string) {
    const val = respuestasExtra[clave] ?? "";
    return (
      <div key={clave}>
        <label style={labelStyle}>{label} *</label>
        <div className="flex gap-2">
          {["SÍ", "NO"].map((op) => (
            <button key={op} type="button" onClick={() => setRespuestasExtra((p) => ({ ...p, [clave]: op }))}
              className="flex-1 rounded-xl font-semibold transition-colors"
              style={{ height: 48, background: val === op ? "var(--color-primary)" : "var(--field-bg)", color: val === op ? "#fff" : "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", border: val === op ? "none" : "1px solid var(--field-border)", cursor: "pointer" }}>
              {val === op ? "✓ " : ""}{op}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Éxito ───────────────────────────────────────────────────────────────

  if (fase === "exito") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl p-10 text-center" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <CheckCircle2 size={52} color="var(--color-status-cerrado)" />
        <div>
          <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Checklist diario guardado
          </h3>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", marginTop: 6 }}>
            La inspección de <strong>{numeroEconomico}</strong> fue registrada correctamente.
          </p>
        </div>
        <button type="button" onClick={onTerminar} className="flex items-center gap-2 rounded-md px-5 h-10 font-semibold"
          style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          Capturar otro checklist
        </button>
      </div>
    );
  }

  // ─── Todas las demás fases comparten los inputs ocultos ───────────────────

  return (
    <>
      {/* Inputs ocultos — siempre montados para estabilidad de refs */}
      <input ref={extraFotoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => handleExtraFoto(e.target.files?.[0])} />
      {/* Input sin `capture` para los campos con galería habilitada (abre la galería en vez de forzar la cámara). */}
      <input ref={extraGaleriaInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => handleExtraFoto(e.target.files?.[0])} />
      <input ref={fotoPuntoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => subirFotoPunto(e.target.files?.[0])} />
      <input ref={fotoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => subirFoto(e.target.files?.[0])} />
      <input ref={fotoHorometroInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => subirFotoHorometro(e.target.files?.[0])} />

      {/* ── IDENTIFICACIÓN ── */}
      {fase === "identificacion" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { borrarBorrador(CLAVE_BORRADOR); onCancelar(); }} className="flex items-center gap-1 rounded-md px-2 h-8" style={navBtnStyle}>
              <ChevronLeft size={14} /> Volver
            </button>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <div>
              <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
                Checklist diario
              </h3>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", marginTop: 4 }}>
                {fechaDisplay}
              </p>
            </div>

            {(esAdmin || proyectos.length > 1) && (
              <div>
                <label style={labelStyle}>Proyecto</label>
                <select value={proyectoFiltro} onChange={(e) => { setProyectoFiltro(e.target.value); setNumeroEconomico(""); }} style={fieldStyle} className="rounded-md">
                  <option value="">Todos los proyectos</option>
                  {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            )}

            <div>
              <label style={labelStyle}>Número económico *</label>
              <ComboboxUnidad
                name="numeroEconomico"
                unidades={unidadesFiltradas.map((u) => ({ numeroEconomico: u.numeroEconomico, etiqueta: `${u.numeroEconomico} — ${u.marca} ${u.unidadModelo} — ${u.placas}` }))}
                defaultValue={numeroEconomico}
                required
                onSeleccionar={setNumeroEconomico}
                style={fieldStyle}
              />
            </div>

            {unidadSel && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Vehículo</label>
                  <div className="flex items-center px-3 rounded-md" style={{ ...fieldStyle, opacity: 0.7, cursor: "default" }}>
                    {unidadSel.marca} {unidadSel.unidadModelo}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Proyecto</label>
                  <div className="flex items-center px-3 rounded-md" style={{ ...fieldStyle, opacity: 0.7, cursor: "default" }}>
                    {unidadSel.proyectoNombre ?? "—"}
                  </div>
                </div>
              </div>
            )}

            {unidadSel && !unidadSel.responsableActivo && (
              <div className="rounded-md px-4 py-3" style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
                Esta unidad no tiene un responsable activo. Debe tomarse primero desde &quot;Mi Turno&quot; antes de hacer el checklist.
              </div>
            )}

            {unidadSel && unidadSel.responsableActivo && !unidadSel.esResponsableActual && (
              <div className="rounded-md px-4 py-3" style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
                Esta unidad la tiene tomada <strong>{unidadSel.responsableActivo}</strong>. Solo esa persona puede completar este checklist.
              </div>
            )}

            {error && <p style={errorStyle}>{error}</p>}

            <button type="button" onClick={() => {
              if (!numeroEconomico) { setError("Selecciona un número económico."); return; }
              if (!unidadSel?.responsableActivo) { setError("Esta unidad no tiene un responsable activo. Tómala primero desde \"Mi Turno\"."); return; }
              if (!unidadSel.esResponsableActual) { setError(`Esta unidad la tiene tomada ${unidadSel.responsableActivo}. Solo esa persona puede completar este checklist.`); return; }
              setError(null);
              setFase("generales");
            }} className="w-full rounded-xl h-12 font-semibold transition-colors"
              style={{ ...(numeroEconomico ? btnPrimaryStyle : { background: "var(--chip)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }), cursor: numeroEconomico ? "pointer" : "default" }}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── GENERALES ── */}
      {fase === "generales" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); setFase("identificacion"); }} className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0" style={navBtnStyle}>
              <ChevronLeft size={14} /> Unidad
            </button>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Paso 1 de 7 — Datos generales</span>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>Datos generales</h3>

            <div>
              <label style={labelStyle}>Estado *</label>
              <select value={zona} onChange={(e) => setRespuestasExtra((p) => ({ ...p, gen_zona: e.target.value, gen_municipio: "" }))} style={fieldStyle} className="rounded-md">
                <option value="">Selecciona un estado</option>
                {(ESTADOS_CARGA as readonly string[]).map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Municipio *</label>
              <select value={respuestasExtra["gen_municipio"] ?? ""} onChange={(e) => setRespuestasExtra((p) => ({ ...p, gen_municipio: e.target.value }))}
                style={{ ...fieldStyle, opacity: !zona ? 0.5 : 1 }} className="rounded-md" disabled={!zona}>
                <option value="">Selecciona un municipio</option>
                {municipiosDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Área *</label>
              <select value={area} onChange={(e) => setRespuestasExtra((p) => ({ ...p, gen_area: e.target.value }))} style={fieldStyle} className="rounded-md">
                <option value="">Selecciona un área</option>
                {(AREAS_CARGA as readonly string[]).map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Responsable *</label>
              {responsableActivo ? (
                <div className="flex items-center px-3 rounded-md" style={{ ...fieldStyle, opacity: 0.85, cursor: "default" }}>
                  {responsableActivo}
                </div>
              ) : (
                <div className="rounded-md px-3 py-2.5" style={{ background: "var(--status-escena-bg)", color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
                  Esta unidad no tiene un responsable activo. Debe tomarse primero desde &quot;Mi Turno&quot;.
                </div>
              )}
            </div>

            {rRadio("gen_tipo_licencia", "Tipo de licencia", ["CON VIGENCIA", "SIN VIGENCIA"])}
            {rFoto("gen_foto_licencia", "Foto de licencia", true, true)}

            {error && <p style={errorStyle}>{error}</p>}

            <button type="button" onClick={() => {
              const err = validarGenerales();
              if (err) { setError(err); return; }
              setError(null);
              setIdx(0);
              setFase("guia");
            }} className="w-full rounded-xl h-12 font-semibold" style={btnPrimaryStyle}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── GUÍA ── */}
      {fase === "guia" && guiaItem && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); if (idx > 0) setIdx(idx - 1); else setFase("generales"); }}
              className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0" style={navBtnStyle}>
              <ChevronLeft size={14} />
              {idx === 0 ? "Generales" : "Anterior"}
            </button>
            <BarraProgreso actual={idx + 1} total={total} />
          </div>

          <div className="rounded-2xl p-5 flex flex-col gap-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <div>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                Punto de inspección — Paso 2 de 7
              </span>
              <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)", marginTop: 4, lineHeight: 1.2 }}>
                {guiaItem.label}
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => seleccionarPunto(guiaItem.key, "ok")} className="rounded-xl w-full font-bold transition-all"
                style={{ height: 68, background: estados[guiaItem.key] === "ok" ? "#16a34a" : "var(--field-bg)", color: estados[guiaItem.key] === "ok" ? "#fff" : "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xl)", border: estados[guiaItem.key] === "ok" ? "none" : "1px solid var(--field-border)", cursor: "pointer", boxShadow: estados[guiaItem.key] === "ok" ? "0 2px 10px rgba(22,163,74,0.3)" : "none" }}>
                {estados[guiaItem.key] === "ok" ? "✓ " : ""}OK — Todo en orden
              </button>
              <button type="button" onClick={() => seleccionarPunto(guiaItem.key, "revisar")} className="rounded-xl w-full font-bold transition-all"
                style={{ height: 68, background: estados[guiaItem.key] === "revisar" ? "#d97706" : "var(--field-bg)", color: estados[guiaItem.key] === "revisar" ? "#fff" : "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xl)", border: estados[guiaItem.key] === "revisar" ? "none" : "1px solid var(--field-border)", cursor: "pointer", boxShadow: estados[guiaItem.key] === "revisar" ? "0 2px 10px rgba(217,119,6,0.3)" : "none" }}>
                {estados[guiaItem.key] === "revisar" ? "✓ " : ""}⚠ Revisar
              </button>
            </div>

            {estados[guiaItem.key] === "revisar" && (
              <div className="flex flex-col gap-3 pt-1 border-t" style={{ borderColor: "var(--field-border)" }}>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)", fontWeight: 600 }}>
                  Foto del problema (opcional)
                </p>
                {tieneFotoPunto(guiaItem.key) ? (
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.3)" }}>
                    <CheckCircle2 size={15} color="#16a34a" className="shrink-0" />
                    <span className="flex-1 truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#16a34a" }}>Foto lista</span>
                    <button type="button" onClick={() => {
                      delete archivoVigentePuntoRef.current[guiaItem.key];
                      setArchivosPorPunto((p) => { const c = { ...p }; delete c[guiaItem.key]; return c; });
                      setUrlsSubidas((p) => { const c = { ...p }; delete c[`foto_${guiaItem.key}`]; return c; });
                    }} style={{ color: "#16a34a", opacity: 0.6, cursor: "pointer" }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button type="button" disabled={procesandoFotoPunto} onClick={() => abrirFotoPunto(guiaItem.key)} className="flex items-center justify-center gap-2 rounded-xl w-full disabled:opacity-50"
                    style={{ height: 48, background: "var(--field-bg)", border: "1px dashed var(--field-border)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", cursor: procesandoFotoPunto ? "not-allowed" : "pointer" }}>
                    {procesandoFotoPunto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    {procesandoFotoPunto ? "Procesando…" : "Tomar foto del problema"}
                  </button>
                )}
                <button type="button" onClick={avanzar} disabled={procesandoFotoPunto} className="w-full rounded-xl h-11 font-semibold transition-colors disabled:opacity-60" style={btnPrimaryStyle}>
                  Continuar →
                </button>
              </div>
            )}

            {!estados[guiaItem.key] && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textAlign: "center" }}>
                Selecciona una opción para continuar automáticamente
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── NIVELES EXTRA ── */}
      {fase === "niveles_extra" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); setIdx(total - 1); setFase("guia"); }} className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0" style={navBtnStyle}>
              <ChevronLeft size={14} /> Anterior
            </button>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Paso 3 de 7 — Niveles</span>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>Niveles del vehículo</h3>
            {rToggle("niv_luz_check", "¿Luz de check encendida?")}
            {rFoto("niv_evidencia_luz_check", "Evidencia fotográfica (luz de check)")}
            {rRadio("niv_nivel_combustible", "Nivel de combustible", ["MÍNIMO", "MEDIO", "MÁXIMO"])}
            {rFoto("niv_evidencia_combustible", "Evidencia fotográfica (combustible)")}
            {error && <p style={errorStyle}>{error}</p>}
            <button type="button" onClick={() => {
              const err = validarNivelesExtra();
              if (err) { setError(err); return; }
              setError(null);
              setFase("exterior");
            }} className="w-full rounded-xl h-12 font-semibold" style={btnPrimaryStyle}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── EXTERIOR ── */}
      {fase === "exterior" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); setFase("niveles_extra"); }} className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0" style={navBtnStyle}>
              <ChevronLeft size={14} /> Anterior
            </button>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Paso 4 de 7 — Exterior</span>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>Exterior del vehículo</h3>
            {rToggle("ext_tiene_golpes", "¿El vehículo tiene golpes?")}
            {respuestasExtra["ext_tiene_golpes"] === "SÍ" && (
              <div className="flex flex-col gap-3 rounded-xl p-3" style={{ background: "var(--field-bg)" }}>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
                  Adjunta la evidencia de los golpes — agrega las fotos que necesites.
                </p>
                {rFoto("ext_evidencia_golpes_1", "Foto de evidencia de golpes 1")}
                {rFoto("ext_evidencia_golpes_2", "Foto de evidencia de golpes 2 (opcional)", false)}
                {rFoto("ext_evidencia_golpes_3", "Foto de evidencia de golpes 3 (opcional)", false)}
              </div>
            )}
            {rFoto("ext_evidencia_frente", "Foto frente del vehículo")}
            {rRadio("ext_parabrisas_espejos", "Estado del parabrisas y espejos", ["BUEN ESTADO", "ESTRELLADO", "ROTO", "N/A"])}
            {rFoto("ext_evidencia_parabrisas_espejos", "Foto parabrisas y espejos")}
            {rFoto("ext_evidencia_lado_derecho", "Foto lado derecho")}
            {rFoto("ext_evidencia_parte_trasera", "Foto parte trasera")}
            {rFoto("ext_evidencia_lado_izquierdo", "Foto lado izquierdo")}
            {esGrua && rFoto("ext_brazo_grua", "Foto brazo de grúa")}
            {error && <p style={errorStyle}>{error}</p>}
            <button type="button" onClick={() => {
              const err = validarExterior();
              if (err) { setError(err); return; }
              setError(null);
              setFase("interior");
            }} className="w-full rounded-xl h-12 font-semibold" style={btnPrimaryStyle}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── INTERIOR ── */}
      {fase === "interior" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); setFase("exterior"); }} className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0" style={navBtnStyle}>
              <ChevronLeft size={14} /> Anterior
            </button>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Paso 5 de 7 — Interior</span>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>Documentos en cabina</h3>
            {rFoto("int_evidencia_tarjeta_circulacion", "Foto tarjeta de circulación")}
            {rFoto("int_evidencia_tarjeta_combustible", "Foto tarjeta de combustible")}
            {error && <p style={errorStyle}>{error}</p>}
            <button type="button" onClick={() => {
              const err = validarInterior();
              if (err) { setError(err); return; }
              setError(null);
              setFase("lecturas");
            }} className="w-full rounded-xl h-12 font-semibold" style={btnPrimaryStyle}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── LECTURAS ── */}
      {fase === "lecturas" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); setFase("interior"); }} className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0" style={navBtnStyle}>
              <ChevronLeft size={14} /> Anterior
            </button>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Paso 6 de 7 — Lecturas</span>
          </div>
          <div className="rounded-2xl p-5 flex flex-col gap-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <div>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                Lecturas finales
              </span>
              <h2 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)", marginTop: 4 }}>
                Odómetro y evidencia
              </h2>
            </div>

            <div>
              <label style={labelStyle}>Lectura del odómetro (km) *</label>
              <input type="number" min={0} value={odometro} onChange={(e) => setOdometro(e.target.value)} placeholder="Kilómetros" className="rounded-md"
                style={{ ...fieldStyle, fontFamily: "var(--font-mono)", fontSize: "var(--text-xl)", height: 56 }} />
            </div>

            {esGrua && (
              <div>
                <label style={labelStyle}>Horómetro (horas)</label>
                <input type="number" min={0} value={horometro} onChange={(e) => setHorometro(e.target.value)} placeholder="Horas" className="rounded-md"
                  style={{ ...fieldStyle, fontFamily: "var(--font-mono)", fontSize: "var(--text-xl)", height: 56 }} />
              </div>
            )}

            <div>
              <label style={labelStyle}>Foto del odómetro *</label>
              {tieneOdometro ? (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.3)" }}>
                  <CheckCircle2 size={15} color="#16a34a" className="shrink-0" />
                  <span className="flex-1 truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#16a34a" }}>Foto lista</span>
                  <button type="button" onClick={() => { archivoVigenteOdometroRef.current = null; setFotoArchivo(null); setUrlsSubidas((p) => { const c = { ...p }; delete c["evidenciaUrl"]; return c; }); }} style={{ color: "#16a34a", opacity: 0.6, cursor: "pointer" }}><X size={14} /></button>
                </div>
              ) : (
                <button type="button" disabled={bloqueoGlobalFoto && !procesandoFoto} onClick={() => fotoInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl w-full disabled:opacity-50"
                  style={{ height: 52, background: "var(--field-bg)", border: "1px dashed var(--field-border)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", cursor: bloqueoGlobalFoto && !procesandoFoto ? "not-allowed" : "pointer" }}>
                  {procesandoFoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                  {procesandoFoto ? "Procesando…" : "Tomar foto del odómetro"}
                </button>
              )}
            </div>

            {esGrua && (
              <div>
                <label style={labelStyle}>Foto del horómetro *</label>
                {tieneHorometro ? (
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.3)" }}>
                    <CheckCircle2 size={15} color="#16a34a" className="shrink-0" />
                    <span className="flex-1 truncate" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "#16a34a" }}>Foto lista</span>
                    <button type="button" onClick={() => { archivoVigenteHorometroRef.current = null; setFotoHorometroArchivo(null); setUrlsSubidas((p) => { const c = { ...p }; delete c["foto_horometro"]; return c; }); }} style={{ color: "#16a34a", opacity: 0.6, cursor: "pointer" }}><X size={14} /></button>
                  </div>
                ) : (
                  <button type="button" disabled={bloqueoGlobalFoto && !procesandoFotoHorometro} onClick={() => fotoHorometroInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl w-full disabled:opacity-50"
                    style={{ height: 52, background: "var(--field-bg)", border: "1px dashed var(--field-border)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", cursor: bloqueoGlobalFoto && !procesandoFotoHorometro ? "not-allowed" : "pointer" }}>
                    {procesandoFotoHorometro ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    {procesandoFotoHorometro ? "Procesando…" : "Tomar foto del horómetro"}
                  </button>
                )}
              </div>
            )}

            {error && <p style={errorStyle}>{error}</p>}

            <button type="button" onClick={() => {
              const err = validarLecturas();
              if (err) { setError(err); return; }
              setError(null);
              setFase("seguridad");
            }} disabled={procesandoFoto || procesandoFotoHorometro} className="w-full rounded-xl h-12 font-semibold transition-colors disabled:opacity-60" style={btnPrimaryStyle}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── SEGURIDAD ── */}
      {fase === "seguridad" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); setFase("lecturas"); }} className="flex items-center gap-1 rounded-md px-2 h-8 flex-shrink-0" style={navBtnStyle}>
              <ChevronLeft size={14} /> Anterior
            </button>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Paso 7 de 7 — Seguridad y firma</span>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>Equipamiento y seguridad</h3>

            {rToggle("seg_llanta_refaccion", "¿Cuenta con llanta de refacción?")}
            {rFoto("seg_evidencia_llanta_refaccion", "Foto llanta de refacción")}
            {rToggle("seg_gato", "¿Cuenta con gato?")}
            {rFoto("seg_evidencia_gato", "Foto del gato")}
            {rToggle("seg_cables_corriente", "¿Cuenta con cables de corriente?")}
            {rFoto("seg_evidencia_cables_corriente", "Foto de cables de corriente")}

            <div>
              <label style={labelStyle}>Observaciones</label>
              <textarea
                value={respuestasExtra["seg_observaciones"] ?? ""}
                onChange={(e) => setRespuestasExtra((p) => ({ ...p, seg_observaciones: e.target.value }))}
                rows={3}
                placeholder="Anota cualquier observación o irregularidad…"
                style={{ ...fieldStyle, height: "auto", padding: "10px 12px", resize: "none" }}
                className="rounded-md"
              />
            </div>

            <FirmaPad name="sig_diario" label="Firma del responsable" required onFirma={setFirmaBase64} />

            {error && <p style={errorStyle}>{error}</p>}

            <button type="button" onClick={enviar} disabled={pending} className="w-full rounded-xl h-12 font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              style={pending ? { background: "var(--chip)", color: "var(--sidebar-text)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" } : btnPrimaryStyle}>
              {pending && <Loader2 size={16} className="animate-spin" />}
              {pending
                ? progresoSubida
                  ? `Subiendo evidencias… ${progresoSubida.actual}/${progresoSubida.total}`
                  : "Guardando…"
                : "Finalizar checklist"}
            </button>
            {pending && progresoSubida && (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)", textAlign: "center" }}>
                No cierres ni recargues la página — esto puede tardar un poco si la señal es débil.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
