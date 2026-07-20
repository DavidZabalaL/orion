import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  descripcion,
}: {
  icon: LucideIcon;
  title: string;
  descripcion: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-xl"
        style={{ background: "var(--panel-bg)" }}
      >
        <Icon size={26} color="var(--color-primary)" />
      </div>
      <div>
        <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          {title}
        </h1>
        <p className="mt-2 max-w-md" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          {descripcion}
        </p>
      </div>
      <span
        className="mt-2 rounded-full px-3 py-1"
        style={{ background: "var(--status-revision-bg)", color: "var(--color-status-revision)", fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600 }}
      >
        Próximamente en este sprint de desarrollo
      </span>
    </div>
  );
}
