import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtMoney, fmtFecha } from "@/lib/formato";
import { TIPO_COBERTURA_LABEL } from "@/lib/estatus";
import { TarjetaPrintButton } from "@/components/seguros/tarjeta-print-button";

export const dynamic = "force-dynamic";

export default async function TarjetaSeguroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const seguro = await prisma.seguro.findUnique({
    where: { id },
    include: { coberturas: true, unidad: true },
  });

  if (!seguro) notFound();

  return (
    <div className="flex flex-col items-center gap-6 p-4 md:p-10">
      <div className="w-full max-w-lg print:hidden">
        <TarjetaPrintButton />
      </div>

      <div
        className="w-full max-w-lg rounded-xl p-6"
        style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-panel)", border: "1px solid var(--header-border)" }}
      >
        <div className="flex items-center justify-between border-b pb-4 mb-4" style={{ borderColor: "var(--field-border)" }}>
          <div>
            <div style={{ fontFamily: "var(--font)", fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--sidebar-text-active)" }}>Tarjeta de Seguro</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Grupo Kabat — Control Vehicular</div>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--color-primary)" }}>
            {seguro.unidad.numeroEconomico}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <Info label="Aseguradora" value={seguro.aseguradora} />
          <Info label="N° de póliza" value={seguro.numeroPoliza} mono />
          <Info label="Vehículo" value={`${seguro.unidad.marca} ${seguro.unidad.unidadModelo} (${seguro.unidad.anio})`} />
          <Info label="Placas" value={seguro.unidad.placas} mono />
          <Info label="Vigencia" value={`${fmtFecha(seguro.fechaInicio)} — ${fmtFecha(seguro.fechaVencimiento)}`} />
          <Info label="Costo" value={fmtMoney(seguro.costo)} mono />
        </div>

        <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }} className="mb-2">
          Coberturas
        </div>
        <table className="w-full border-collapse">
          <tbody>
            {seguro.coberturas.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid var(--field-border)" }}>
                <td className="py-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{TIPO_COBERTURA_LABEL[c.tipoCobertura]}</td>
                <td className="py-2 text-right" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>
                  {Number(c.sumaAsegurada) > 0 ? fmtMoney(c.sumaAsegurada) : "Amparada"}
                </td>
                <td className="py-2 text-right" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                  {Number(c.deducible) > 0 ? `Ded. ${fmtMoney(c.deducible)}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--field-text)" }} className="mt-0.5">{value}</div>
    </div>
  );
}
