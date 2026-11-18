// Reglas de detección de posibles problemas/fraude en checklists de Carga de
// Combustible, acordadas con el usuario: (1) litros cargados muy por encima de
// lo que el avance del medidor explica, (2) precio por litro fuera de rango
// respecto al promedio reciente, (3) medidor que no sube pero registra carga.
export type DatosCargaCombustible = {
  porcentajeAntes: string | null | undefined;
  porcentajeDespues: string | null | undefined;
  litrosCargados: string | null | undefined;
  cantidadPagada: string | null | undefined;
  capacidadTanqueLitros: number | null | undefined;
  precioPromedioLitro: number | null | undefined;
};

const TOLERANCIA_LITROS = 1.2; // litros cargados > 20% de lo esperado por el medidor
const TOLERANCIA_PRECIO = 0.25; // ±25% respecto al precio promedio reciente

/** $/L posible en México (gasolina/diésel ~$22–28). Fuera de esto casi siempre es un punto decimal mal tecleado. */
export const PRECIO_LITRO_MIN = 15;
export const PRECIO_LITRO_MAX = 40;

/**
 * Valida litros e importe de un checklist de carga antes de guardarlo. Los
 * operadores teclean "30976" por 30.976 L o "1.30955" por $1,309.55; eso
 * rompía la conciliación y disparaba alertas falsas de precio.
 */
export function validarMontosCarga(litrosTxt: string, importeTxt: string): string | null {
  const litros = Number(litrosTxt);
  const importe = Number(importeTxt);
  if (!litrosTxt.trim() || !(litros > 0)) return "Los litros cargados son obligatorios.";
  if (!importeTxt.trim() || !(importe > 0)) return "La cantidad pagada es obligatoria.";
  const precio = importe / litros;
  if (precio < PRECIO_LITRO_MIN || precio > PRECIO_LITRO_MAX)
    return `Litros e importe dan $${precio.toFixed(2)} por litro. Revisa el punto decimal: copia los litros (ej. 30.976) y el importe (ej. 1309.55) tal como vienen en el ticket.`;
  return null;
}

export function detectarAlertasCargaCombustible(datos: DatosCargaCombustible): string[] {
  const alertas: string[] = [];

  const antes = Number(datos.porcentajeAntes);
  const despues = Number(datos.porcentajeDespues);
  const litros = Number(datos.litrosCargados);
  const importe = Number(datos.cantidadPagada);
  const capacidad = datos.capacidadTanqueLitros ? Number(datos.capacidadTanqueLitros) : null;

  const hayPorcentajes = datos.porcentajeAntes != null && datos.porcentajeAntes !== "" && datos.porcentajeDespues != null && datos.porcentajeDespues !== "" && !Number.isNaN(antes) && !Number.isNaN(despues);
  const hayLitros = datos.litrosCargados != null && datos.litrosCargados !== "" && !Number.isNaN(litros) && litros > 0;
  const hayImporte = datos.cantidadPagada != null && datos.cantidadPagada !== "" && !Number.isNaN(importe) && importe > 0;

  if (hayPorcentajes && capacidad && hayLitros) {
    const litrosEsperados = (capacidad * Math.max(despues - antes, 0)) / 100;
    if (litrosEsperados > 0 && litros > litrosEsperados * TOLERANCIA_LITROS) {
      alertas.push(
        `Litros cargados (${litros.toFixed(1)} L) muy por encima de lo esperado según el medidor (${litrosEsperados.toFixed(1)} L aprox.)`
      );
    }
  }

  if (hayLitros && hayImporte && datos.precioPromedioLitro) {
    const precioLitro = importe / litros;
    const promedio = datos.precioPromedioLitro;
    if (precioLitro < promedio * (1 - TOLERANCIA_PRECIO)) {
      alertas.push(`Precio por litro ($${precioLitro.toFixed(2)}) muy por debajo del promedio reciente ($${promedio.toFixed(2)})`);
    } else if (precioLitro > promedio * (1 + TOLERANCIA_PRECIO)) {
      alertas.push(`Precio por litro ($${precioLitro.toFixed(2)}) muy por arriba del promedio reciente ($${promedio.toFixed(2)})`);
    }
  }

  if (hayPorcentajes && despues <= antes && (hayLitros || hayImporte)) {
    alertas.push("El medidor no muestra aumento (% después ≤ % antes) pero se registró una carga");
  }

  return alertas;
}
