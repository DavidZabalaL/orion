import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Table, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TIPO_DOCUMENTO_LABEL } from "@/lib/estatus-operador";
import { fmtFecha, diasPara } from "@/lib/formato";

export const dynamic = "force-dynamic";

function en(dias: number) {
  return new Date(Date.now() + dias * 86_400_000);
}

export default async function PendientesDocumentalesPage() {
  const en60Dias = en(60);

  const documentos = await prisma.documentoOperador.findMany({
    where: {
      fechaVencimiento: { lte: en60Dias },
      operador: { estatus: "ACTIVO" },
    },
    include: { operador: { select: { id: true, nombre: true, proyecto: { select: { nombre: true } } } } },
    orderBy: { fechaVencimiento: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/operadores" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a operadores
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Tablero de Pendientes Documentales
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Documentos por vencer en los próximos 60 días y documentos ya vencidos, agrupados por operador.
        </p>
      </div>

      {documentos.length === 0 ? (
        <EmptyState>No hay documentos por vencer en los próximos 60 días. 🎉</EmptyState>
      ) : (
        <Table headers={["Operador", "Proyecto", "Documento", "Vencimiento", "Estado"]} minWidth={760}>
          {documentos.map((d) => {
            const dias = diasPara(d.fechaVencimiento);
            const vencido = dias !== null && dias < 0;
            return (
              <tr key={d.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
                <td className="px-4 py-3">
                  <Link href={`/operadores/${d.operador.id}`} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                    {d.operador.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
                  {d.operador.proyecto?.nombre ?? "—"}
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
                  {TIPO_DOCUMENTO_LABEL[d.tipoDocumento] ?? d.tipoDocumento}
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>
                  {fmtFecha(d.fechaVencimiento)}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    label={vencido ? `Vencido hace ${-dias!} días` : `Vence en ${dias} días`}
                    color={vencido ? "var(--color-status-escena)" : "var(--color-status-revision)"}
                    bg={vencido ? "var(--status-escena-bg)" : "var(--status-revision-bg)"}
                  />
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
