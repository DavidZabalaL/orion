import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { NotificacionesForm } from "@/components/usuarios/notificaciones-form";

export const dynamic = "force-dynamic";

export default async function NotificacionesPage() {
  let config = await prisma.configuracionNotificaciones.findFirst();
  if (!config) {
    config = await prisma.configuracionNotificaciones.create({
      data: { destinatariosCorreo: [] },
    });
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      <div>
        <Link href="/usuarios" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a usuarios
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Configuración de Notificaciones
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Umbrales y destinatarios de las alertas automáticas de la plataforma.
        </p>
      </div>

      <NotificacionesForm
        config={{
          id: config.id,
          alertaGpsSinSenalHoras: config.alertaGpsSinSenalHoras,
          alertaGpsSinSenalActiva: config.alertaGpsSinSenalActiva,
          alertaMantenimientoDiasPrevios: config.alertaMantenimientoDiasPrevios,
          alertaMantenimientoActiva: config.alertaMantenimientoActiva,
          alertaRendimientoUmbralPct: config.alertaRendimientoUmbralPct,
          alertaRendimientoActiva: config.alertaRendimientoActiva,
          alertaSeguroDiasPrevios: config.alertaSeguroDiasPrevios,
          alertaSeguroActiva: config.alertaSeguroActiva,
          alertaSenalPerdidaMinutos: config.alertaSenalPerdidaMinutos,
          alertaSenalPerdidaActiva: config.alertaSenalPerdidaActiva,
          alertaChecklistFaltanteActiva: config.alertaChecklistFaltanteActiva,
          alertaChecklistHoraLimite: config.alertaChecklistHoraLimite,
          alertaDocumentoOperadorDiasPrevios: config.alertaDocumentoOperadorDiasPrevios,
          alertaDocumentoOperadorActiva: config.alertaDocumentoOperadorActiva,
          destinatariosCorreo: config.destinatariosCorreo as string[],
        }}
      />
    </div>
  );
}
