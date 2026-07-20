import { Search, Bell, Menu } from "lucide-react";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header
      className="flex items-center justify-between gap-4 border-b px-4 md:px-6 shrink-0"
      style={{
        height: "var(--header-height)",
        background: "var(--header-bg)",
        borderColor: "var(--header-border)",
      }}
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onMenuClick}
          className="md:hidden flex items-center justify-center rounded-md shrink-0"
          style={{ height: "var(--h-md)", width: "var(--h-md)", color: "var(--sidebar-text-active)" }}
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        <div
          className="flex items-center gap-2 rounded-md px-3 flex-1 max-w-md"
          style={{ background: "var(--field-bg)", border: "1px solid var(--field-border)", height: "var(--h-md)" }}
        >
          <Search size={16} color="var(--sidebar-text)" />
          <input
            placeholder="Buscar por número económico, placa u operador…"
            className="bg-transparent outline-none flex-1 min-w-0"
            style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          className="relative flex items-center justify-center rounded-md"
          style={{ height: "var(--h-md)", width: "var(--h-md)", color: "var(--sidebar-text)" }}
          aria-label="Notificaciones"
        >
          <Bell size={18} />
          <span
            className="absolute -top-0.5 -right-0.5 rounded-full"
            style={{ width: 8, height: 8, background: "var(--priority-alta)" }}
          />
        </button>

        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: "var(--brand-navy)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
          >
            JR
          </div>
          <div className="hidden sm:block leading-tight">
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
              Jorge Ramírez
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", color: "var(--sidebar-text)" }}>
              Control Vehicular
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
