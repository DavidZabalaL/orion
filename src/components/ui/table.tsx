export const panelStyle: React.CSSProperties = { background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" };
export const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--sidebar-text)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};
export const tdStyle: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" };

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-10 text-center" style={{ ...panelStyle, fontFamily: "var(--font-ui)", color: "var(--sidebar-text)" }}>
      {children}
    </div>
  );
}

export function Table({ headers, children, minWidth = 640 }: { headers: string[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-xl" style={panelStyle}>
      <table className="w-full border-collapse" style={{ minWidth }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={labelStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--field-text)" }} className="mt-1">{value}</div>
    </div>
  );
}
