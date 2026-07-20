import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Printer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table } from "@/components/ui/table";
import { fmtMoney, fmtFecha, diasPara } from "@/lib/formato";
import { ESTATUS_SEGURO_LABEL, ESTATUS_SEGURO_STYLE, TIPO_COBERTURA_LABEL } from "@/lib/estatus";
import { RenovarSeguroForm } from "@/components/seguros/renovar-seguro-form";

export const dynamic = "force-dynamic";

export default async function FichaPolizaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const seguro = await prisma.seguro.findUnique({
    where: { id },
    include: { coberturas: true, unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true, placas: true } } },
  });

  if (!seguro) notFound();

  const dias = diasPara(seguro.fechaVencimiento);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/seguros" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
            <ChevronLeft size={15} /> Volver a seguros
          </Link>
          <h1 className="mt-2 flex items-center gap-3 flex-wrap" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            {seguro.aseguradora} — {seguro.numeroPoliza}
            <Badge label={ESTATUS_SEGURO_LABEL[seguro.estatus]} color={ESTATUS_SEGURO_STYLE[seguro.estatus]?.color} bg={ESTATUS_SEGURO_STYLE[seguro.estatus]?.bg} />
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            <Link href={`/unidades/${seguro.unidad.numeroEconomico}`} style={{ color: "var(--color-primary)" }}>{seguro.unidad.numeroEconomico}</Link>
            {" "}— {seguro.unidad.marca} {seguro.unidad.unidadModelo} · {seguro.unidad.placas}
          </p>
        </div>
        <Link href={`/seguros/${seguro.id}/tarjeta`} className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          <Printer size={16} /> Tarjeta de seguro (PDF)
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl p-5 md:grid-cols-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Vigencia</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--field-text)" }} className="mt-1">{fmtFecha(seguro.fechaInicio)} — {fmtFecha(seguro.fechaVencimiento)}</div>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Costo</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-md)", color: "var(--field-text)" }} className="mt-1">{fmtMoney(seguro.costo)}</div>
        </div>
        <div className="col-span-2">
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>Vencimiento</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: dias !== null && dias <= 30 ? "var(--color-status-escena)" : "var(--field-text)" }} className="mt-1">
            {dias !== null && dias >= 0 ? `Vence en ${dias} días` : dias !== null ? `Vencida hace ${-dias} días` : "—"}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Coberturas
        </h3>
        <Table headers={["Tipo", "Suma asegurada", "Deducible", "Condiciones"]} minWidth={640}>
          {seguro.coberturas.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{TIPO_COBERTURA_LABEL[c.tipoCobertura]}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{Number(c.sumaAsegurada) > 0 ? fmtMoney(c.sumaAsegurada) : "Amparada"}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{Number(c.deducible) > 0 ? fmtMoney(c.deducible) : "—"}</td>
              <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{c.condicionesEspeciales ?? "—"}</td>
            </tr>
          ))}
        </Table>
      </div>

      <RenovarSeguroForm id={seguro.id} />
    </div>
  );
}
