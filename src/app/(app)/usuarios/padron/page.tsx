import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { requerirPermisoModulo } from "@/lib/permisos";
import { PadronForm } from "@/components/usuarios/padron-form";
import { CopiarEnlaceRegistro } from "@/components/usuarios/copiar-enlace-registro";
import { fmtFechaHora } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function PadronPersonalPage() {
  await requerirPermisoModulo("K", "editar");

  const [total, ultimo, sincronizaciones, ausencias] = await Promise.all([
    prisma.personalActivo.count(),
    prisma.personalActivo.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.sincronizacionPadron.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.ausenciaPadron.findMany({ orderBy: { primeraAusencia: "asc" } }),
  ]);
  const usuariosAusentes = await prisma.usuario.findMany({
    where: { id: { in: ausencias.map((a) => a.usuarioId) } },
    select: { id: true, correo: true, operador: { select: { nombre: true } } },
  });
  const usuarioPorId = new Map(usuariosAusentes.map((u) => [u.id, u]));
  const ultimaSync = sincronizaciones[0];
  const invalidasUltima = (ultimaSync?.invalidas as { fila: number; nombre: string; curp: string; motivo: string }[] | undefined) ?? [];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
      <div>
        <Link href="/usuarios" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a Usuarios
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Padrón de personal activo
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Contra este padrón se valida el CURP y nombre de quien se autoregistra como Operador en{" "}
          <code style={{ fontFamily: "var(--font-mono)" }}>/registro-operador</code>. Se actualiza solo desde el archivo de Recursos
          Humanos (Power Automate); la carga manual de abajo queda como respaldo — cualquiera de las dos reemplaza el padrón por completo.
        </p>
      </div>

      <CopiarEnlaceRegistro />

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Personas en el padrón" value={total} icon={Users} accent="var(--color-primary)" />
        <StatCard
          label="Última actualización"
          value={ultimo ? ultimo.updatedAt.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
          icon={Users}
          accent="var(--color-status-revision)"
        />
      </div>

      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <h3 style={{ fontFamily: "var(--font)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Sincronización automática (Power Automate)
        </h3>
        {!ultimaSync ? (
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Aún no se ha recibido ninguna sincronización.</p>
        ) : (
          <>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: ultimaSync.aplicada ? "var(--field-text)" : "var(--color-status-escena)" }}>
              Última: <strong>{fmtFechaHora(ultimaSync.createdAt)}</strong> — {ultimaSync.aplicada ? "aplicada" : "FRENADA, no se cambió nada"}
              {ultimaSync.motivoFreno ? `. ${ultimaSync.motivoFreno}` : ""}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--field-border)", color: "var(--sidebar-text)", textAlign: "left" }}>
                    {["Fecha", "Estado", "Válidas", "Inválidas", "Altas", "Bajas", "Revocados", "Reactivados"].map((h) => (
                      <th key={h} className="py-2 pr-3" style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sincronizaciones.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--field-border)", color: "var(--field-text)" }}>
                      <td className="py-2 pr-3 whitespace-nowrap">{fmtFechaHora(s.createdAt)}</td>
                      <td className="py-2 pr-3" style={{ color: s.aplicada ? "var(--color-status-cerrado)" : "var(--color-status-escena)", fontWeight: 600 }}>{s.aplicada ? (s.motivoFreno ? "Aplicada*" : "Aplicada") : "Frenada"}</td>
                      <td className="py-2 pr-3">{s.validas}</td>
                      <td className="py-2 pr-3">{(s.invalidas as unknown[]).length}</td>
                      <td className="py-2 pr-3">{s.altasPadron}</td>
                      <td className="py-2 pr-3">{s.bajasPadron}</td>
                      <td className="py-2 pr-3">{(s.revocados as unknown[]).length}</td>
                      <td className="py-2 pr-3">{(s.reactivados as unknown[]).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {ausencias.length > 0 && (
          <div>
            <p className="mb-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
              Operadores con cuenta que ya no aparecen en el padrón ({ausencias.length})
            </p>
            <ul className="flex flex-col gap-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
              {ausencias.map((a) => {
                const u = usuarioPorId.get(a.usuarioId);
                return (
                  <li key={a.curp}>
                    {u?.operador?.nombre ?? a.curp} <span style={{ color: "var(--sidebar-text)" }}>({u?.correo ?? "—"})</span> —{" "}
                    {a.revocadoEn ? (
                      <strong style={{ color: "var(--color-status-escena)" }}>acceso revocado el {fmtFechaHora(a.revocadoEn)}</strong>
                    ) : (
                      <span>en observación desde {fmtFechaHora(a.primeraAusencia)} ({a.lecturas} lectura{a.lecturas === 1 ? "" : "s"})</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
              Se revoca en la 2a lectura seguida sin la persona (y al menos 20 h después de la primera). Si vuelve a aparecer, su acceso se reactiva solo.
            </p>
          </div>
        )}

        {invalidasUltima.length > 0 && (
          <details>
            <summary style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-status-revision)", cursor: "pointer" }}>
              {invalidasUltima.length} fila(s) del archivo con datos inválidos — no entraron al padrón; pide a RH que las corrija
            </summary>
            <ul className="mt-2 flex flex-col gap-1" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
              {invalidasUltima.map((f) => (
                <li key={`${f.fila}-${f.curp}`}>
                  Fila {f.fila}: {f.nombre || "(sin nombre)"} — <span style={{ fontFamily: "var(--font-mono)" }}>{f.curp || "(vacío)"}</span> · {f.motivo}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <PadronForm />

      <div className="rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <h3 className="mb-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Formato esperado
        </h3>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          Un archivo .xlsx o .csv con las columnas <strong>NOMBRE COMPLETO</strong> y <strong>CURP</strong> (obligatorias), y opcionalmente
          EMPRESA, LUGAR DE TRABAJO, RFC, NSS y TELÉFONO.
        </p>
      </div>
    </div>
  );
}
