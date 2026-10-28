// Además del skeleton, este archivo habilita el prefetch parcial de las rutas dinámicas:
// sin él, Next no prefetchea nada y cada clic del menú espera el render completo del servidor.
function Bloque({ className, fondo = "var(--color-surface-3)" }: { className: string; fondo?: string }) {
  return <div className={`rounded-md ${className}`} style={{ background: fondo }} />;
}

export default function Loading() {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-6 p-4 md:p-6 animate-pulse motion-reduce:animate-none">
      <div className="flex flex-col gap-2">
        <Bloque className="h-7 w-64 max-w-full" fondo="var(--panel-bg)" />
        <Bloque className="h-4 w-96 max-w-full" fondo="var(--panel-bg)" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <Bloque className="h-11 w-11 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Bloque className="h-3 w-24" />
              <Bloque className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl p-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <Bloque className="h-9 w-full max-w-sm" />
        {Array.from({ length: 8 }, (_, i) => (
          <Bloque key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
