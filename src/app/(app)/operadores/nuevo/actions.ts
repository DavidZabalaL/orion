"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { crearDocumento } from "@/lib/subir-archivo";

export async function crearOperador(formData: FormData) {
  await exigirPermisoModulo("L", "editar");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const curp = String(formData.get("curp") ?? "").trim().toUpperCase();
  const rfc = String(formData.get("rfc") ?? "").trim().toUpperCase() || null;
  const nss = String(formData.get("nss") ?? "").trim() || null;
  const tipoSangre = String(formData.get("tipoSangre") ?? "") || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const contactoEmergencia = String(formData.get("contactoEmergencia") ?? "").trim() || null;
  const proyectoId = String(formData.get("proyectoId") ?? "") || null;

  const tipoLicencia = String(formData.get("tipoLicencia") ?? "") || null;
  const numeroLicencia = String(formData.get("numeroLicencia") ?? "").trim() || null;
  const estadoEmisor = String(formData.get("estadoEmisor") ?? "").trim() || null;
  const fechaVencimientoLicencia = String(formData.get("fechaVencimientoLicencia") ?? "") || null;
  const archivoLicenciaFile = formData.get("archivoLicencia");

  if (!nombre || !curp) {
    throw new Error("Nombre y CURP son obligatorios.");
  }

  const permitidos = await proyectosPermitidosParaModulo("L");
  if (permitidos !== null && proyectoId && !permitidos.includes(proyectoId)) {
    throw new Error("No tienes permiso para asignar ese proyecto.");
  }

  const placeholderDoc = await prisma.documento.create({
    data: { entidadRelacionada: "Operador", entidadId: "pendiente", url: "/mock/placeholder.jpg", tipo: "foto" },
  });

  const operador = await prisma.operador.create({
    data: {
      nombre,
      curp,
      rfc,
      nss,
      tipoSangre: (tipoSangre as never) || undefined,
      telefono,
      contactoEmergencia,
      fotoId: placeholderDoc.id,
      proyectoId,
      estatus: "ACTIVO",
      estatusDocumental: "INCOMPLETO",
    },
  });

  if (tipoLicencia && numeroLicencia) {
    const archivoLicencia =
      archivoLicenciaFile instanceof File && archivoLicenciaFile.size > 0
        ? await crearDocumento(archivoLicenciaFile, { carpeta: "licencias", entidadRelacionada: "DocumentoOperador", entidadId: operador.id, tipo: "licencia" })
        : await prisma.documento.create({
            data: { entidadRelacionada: "DocumentoOperador", entidadId: operador.id, url: "/mock/licencia.pdf", tipo: "licencia" },
          });
    await prisma.documentoOperador.create({
      data: {
        operadorId: operador.id,
        tipoDocumento: "LICENCIA",
        numero: numeroLicencia,
        tipoLicencia: tipoLicencia as never,
        estadoEmisor,
        fechaEmision: new Date(),
        fechaVencimiento: fechaVencimientoLicencia ? new Date(fechaVencimientoLicencia) : null,
        archivoId: archivoLicencia.id,
        verificado: false,
      },
    });
  }

  const session = await auth();
  if (session?.user?.id) {
    await prisma.bitacoraCambio.create({
      data: {
        entidad: "Operador",
        entidadId: operador.id,
        usuarioId: session.user.id,
        accion: "CREAR",
        valoresNuevos: { nombre, curp },
      },
    });
  }

  redirect(`/operadores/${operador.id}`);
}
