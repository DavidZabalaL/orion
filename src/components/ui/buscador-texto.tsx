"use client";

import { Search } from "lucide-react";

const contenedorStyle: React.CSSProperties = {
  background: "var(--field-bg)",
  border: "1px solid var(--field-border)",
  color: "var(--field-text)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-base)",
  height: "var(--h-md)",
};

export function BuscadorTexto({
  value,
  onChange,
  placeholder,
  className = "flex-1 min-w-[220px] max-w-sm",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-md px-3 ${className}`} style={contenedorStyle}>
      <Search size={15} color="var(--sidebar-text)" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent outline-none flex-1 min-w-0"
      />
    </div>
  );
}
