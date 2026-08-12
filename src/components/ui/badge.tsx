export function Badge({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 whitespace-nowrap"
      style={{
        color,
        background: bg,
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}
