import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtFecha } from "@/lib/formato";

type Combustible = {
  id: string;
  fecha: string;
  litros: string;
  costo: string;
  kmActual: number;
  estacion: string | null;
  rendimientoCalculado: string | null;
  alertaSobrellenado: boolean;
};

const td: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" };

export function CombustibleRow({ registro: r }: { registro: Combustible }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
      <td className="px-4 py-3" style={td}>{fmtFecha(r.fecha)}</td>
      <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{Number(r.litros).toFixed(1)} L</td>
      <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{fmtMoney(r.costo)}</td>
      <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{r.kmActual}</td>
      <td className="px-4 py-3" style={td}>{r.estacion ?? "—"}</td>
      <td className="px-4 py-3" style={{ ...td, fontFamily: "var(--font-mono)" }}>{r.rendimientoCalculado ? `${Number(r.rendimientoCalculado).toFixed(1)} km/L` : "—"}</td>
      <td className="px-4 py-3">
        {r.alertaSobrellenado && <Badge label="Excede capacidad" color="var(--color-status-escena)" bg="var(--status-escena-bg)" />}
      </td>
    </tr>
  );
}
