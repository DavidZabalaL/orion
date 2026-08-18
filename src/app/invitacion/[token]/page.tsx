import { prisma } from "@/lib/prisma";
import { OrionIcon } from "@/components/brand/orion-icon";
import { AceptarInvitacionForm } from "@/components/usuarios/aceptar-invitacion-form";

export default async function InvitacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const usuario = await prisma.usuario.findUnique({
    where: { invitacionToken: token },
    select: { nombre: true, metodoAcceso: true, estatus: true, invitacionExpiraEn: true },
  });

  const valido =
    !!usuario &&
    usuario.metodoAcceso === "CORREO_PASSWORD" &&
    usuario.estatus !== "DESACTIVADO" &&
    !!usuario.invitacionExpiraEn &&
    usuario.invitacionExpiraEn.getTime() > Date.now();

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "#f4f6f9" }}>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-3">
            <OrionIcon size={36} />
            <span style={{ fontFamily: "var(--font)", fontSize: 26, fontWeight: 800, color: "#0f1b2d" }}>Orión</span>
          </div>
        </div>

        <div className="rounded-xl p-8" style={{ background: "#fff", boxShadow: "0px 8px 32px rgba(15,40,120,0.10)" }}>
          {valido ? (
            <>
              <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "#0f1b2d" }}>
                Hola{usuario?.nombre ? `, ${usuario.nombre}` : ""}
              </h1>
              <p className="mt-1 mb-6" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "#64748b" }}>
                Crea tu contraseña para entrar a Orión.
              </p>
              <AceptarInvitacionForm token={token} />
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "#0f1b2d" }}>
                Enlace inválido
              </h1>
              <p className="mt-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "#64748b" }}>
                Este enlace de invitación ya se usó o expiró. Pide a un administrador que te envíe uno nuevo desde Administración.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
