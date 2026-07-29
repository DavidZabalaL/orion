"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Upload, CheckCircle2, TriangleAlert } from "lucide-react";
import {
  previsualizarCargaPresupuesto,
  confirmarCargaPresupuesto,
  type PrevisualizacionPresupuesto,
  type ResultadoImportacionPresupuesto,
} from "@/app/(app)/proyectos/[id]/presupuesto/importar/actions";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";
import { FileInput } from "@/components/ui/file-input";

const fieldStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
  borderRadius: "var(--radius-md)",
  padding: "0 12px",
};

const panelStyle: React.CSSProperties = { background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" };

type Paso = "subir" | "revisar" | "resultado";

export function ImportadorPresupuesto({ proyectoIdActual, volverHref }: { proyectoIdActual: string; volverHref: string }) {
  const [paso, setPaso] = useState<Paso>("subir");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [previsualizacion, setPrevisualizacion] = useState<PrevisualizacionPresupuesto | null>(null);
  const [proyectoPorAlias, setProyectoPorAlias] = useState<Record<string, string>>({});
  const [categoriaPorTexto, setCategoriaPorTexto] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<ResultadoImportacionPresupuesto | null>(null);

  const totalFilasValidas = useMemo(() => {
    if (!previsualizacion) return 0;
    return previsualizacion.filas.filter(
      (f) => proyectoPorAlias[f.proyectoExcel] && categoriaPorTexto[f.partidaExcel]
    ).length;
  }, [previsualizacion, proyectoPorAlias, categoriaPorTexto]);

  function handleSubir(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await previsualizarCargaPresupuesto(formData);
        setPrevisualizacion(res);
        setProyectoPorAlias(
          Object.fromEntries(
            res.proyectosDetectados.map((p) => [p.alias, p.proyectoIdSugerido ?? (p.alias ? "" : proyectoIdActual)])
          )
        );
        setCategoriaPorTexto(
          Object.fromEntries(res.partidasDetectadas.map((p) => [p.texto, p.categoriaSugerida ?? ""]))
        );
        setPaso("revisar");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
      }
    });
  }

  function handleConfirmar() {
    if (!previsualizacion) return;
    startTransition(async () => {
      try {
        const res = await confirmarCargaPresupuesto(
          previsualizacion.filas,
          proyectoPorAlias,
          categoriaPorTexto,
          previsualizacion.archivoNombre
        );
        setResultado(res);
        setPaso("resultado");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo confirmar la importación.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {paso === "subir" && (
        <form action={handleSubir} className="rounded-xl p-8 flex flex-col items-center gap-4" style={panelStyle}>
          <Upload size={32} color="var(--color-primary)" />
          <div className="text-center">
            <div style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
              Sube el archivo &quot;PP y Gastos&quot; (.xlsx)
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              Solo se toma la columna PTTO de cada mes; el REAL se calcula en Orión.
            </p>
          </div>
          <div>
            <label className="block mb-1.5 text-center" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>
              Año del presupuesto
            </label>
            <input name="anio" type="number" required defaultValue={new Date().getFullYear()} style={fieldStyle} />
          </div>
          <FileInput name="archivo" accept=".xlsx,.xls" required helpText="Ningún archivo seleccionado" />
          {error && (
            <div className="flex items-center gap-2" style={{ color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
              <TriangleAlert size={15} /> {error}
            </div>
          )}
          <button type="submit" disabled={pending} className="rounded-md px-5 h-10 font-semibold disabled:opacity-60" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            {pending ? "Leyendo…" : "Analizar archivo"}
          </button>
        </form>
      )}

      {paso === "revisar" && previsualizacion && (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl p-5" style={panelStyle}>
            <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
              Proyectos detectados en el archivo
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {previsualizacion.proyectosDetectados.map((g) => (
                <div key={g.alias} className="flex items-center gap-3">
                  <div className="flex-1" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{g.alias}</div>
                  <select
                    value={proyectoPorAlias[g.alias] ?? ""}
                    onChange={(e) => setProyectoPorAlias((m) => ({ ...m, [g.alias]: e.target.value }))}
                    style={{ ...fieldStyle, flex: 1 }}
                  >
                    <option value="">— Sin asignar (no se importa) —</option>
                    {previsualizacion.proyectosDisponibles.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-5" style={panelStyle}>
            <h3 className="mb-4" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
              Partidas detectadas en el archivo
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {previsualizacion.partidasDetectadas.map((g) => (
                <div key={g.texto} className="flex items-center gap-3">
                  <div className="flex-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{g.texto}</div>
                  <select
                    value={categoriaPorTexto[g.texto] ?? ""}
                    onChange={(e) => setCategoriaPorTexto((m) => ({ ...m, [g.texto]: e.target.value }))}
                    style={{ ...fieldStyle, flex: 1 }}
                  >
                    <option value="">— Sin asignar (no se importa) —</option>
                    {Object.entries(CATEGORIA_GASTO_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-5" style={panelStyle}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--field-text)" }}>
              Se importarán <strong>{totalFilasValidas}</strong> de <strong>{previsualizacion.filas.length}</strong> filas detectadas para el año <strong>{previsualizacion.anio}</strong>.
              Las filas con proyecto o partida sin asignar arriba no se importan. Si ya existe un valor para un proyecto+partida+mes, se sobrescribe y queda registrado en el historial de versiones.
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2" style={{ color: "var(--color-status-escena)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
              <TriangleAlert size={15} /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleConfirmar}
              disabled={pending || totalFilasValidas === 0}
              className="rounded-md px-5 h-10 font-semibold disabled:opacity-40"
              style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}
            >
              {pending ? "Importando…" : "Confirmar importación"}
            </button>
            <button onClick={() => setPaso("subir")} className="rounded-md px-5 h-10" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--sidebar-text)" }}>
              Elegir otro archivo
            </button>
          </div>
        </div>
      )}

      {paso === "resultado" && resultado && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <ResumenCard label="Nuevas" value={resultado.creadas} color="var(--color-status-cerrado)" bg="var(--status-cerrado-bg)" />
            <ResumenCard label="Actualizadas" value={resultado.actualizadas} color="var(--color-status-revision)" bg="var(--status-revision-bg)" />
            <ResumenCard label="Sin cambio" value={resultado.sinCambio} color="var(--sidebar-text)" bg="var(--chip)" />
            <ResumenCard label="Omitidas" value={resultado.omitidas.reduce((acc, o) => acc + o.cantidad, 0)} color="var(--color-status-escena)" bg="var(--status-escena-bg)" />
          </div>

          {resultado.omitidas.length > 0 && (
            <div className="rounded-xl p-5" style={panelStyle}>
              <h4 className="mb-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-status-escena)" }}>Filas omitidas</h4>
              <ul className="flex flex-col gap-1">
                {resultado.omitidas.map((o, i) => (
                  <li key={i} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{o.motivo}: {o.cantidad}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2" style={{ color: "var(--color-status-cerrado)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
            <CheckCircle2 size={16} /> Importación completada. Revisa <Link href={volverHref} style={{ color: "var(--color-primary)" }}>Presupuesto por partida</Link>.
          </div>
        </div>
      )}
    </div>
  );
}

function ResumenCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: bg }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color }}>{label}</div>
    </div>
  );
}
