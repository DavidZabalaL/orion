const RADIO = 30;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

export function GaugeCircular({ porcentaje, color, valor, etiqueta }: { porcentaje: number; color: string; valor: string; etiqueta: string }) {
  const p = Math.max(0, Math.min(100, porcentaje));
  const offset = CIRCUNFERENCIA * (1 - p / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={72} height={72} viewBox="0 0 72 72">
        <circle cx={36} cy={36} r={RADIO} fill="none" stroke="var(--field-border)" strokeWidth={6} />
        <circle
          cx={36}
          cy={36}
          r={RADIO}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={CIRCUNFERENCIA}
          strokeDashoffset={offset}
          transform="rotate(-90 36 36)"
        />
        <text x={36} y={40} textAnchor="middle" fontSize="15" fontWeight={700} fill="var(--sidebar-text-active)" fontFamily="var(--font-mono)">
          {p}%
        </text>
      </svg>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{valor}</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>{etiqueta}</div>
    </div>
  );
}
