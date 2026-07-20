export function OrionIcon({ size = 40 }: { size?: number }) {
  const r = size * 0.28;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx={r} fill="url(#orion-gradient)" />
      <line x1="11" y1="26" x2="29" y2="14" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="26" r="2.6" fill="white" />
      <circle cx="20" cy="20" r="3.1" fill="white" />
      <circle cx="29" cy="14" r="2.6" fill="white" />
      <defs>
        <linearGradient id="orion-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4d7cfe" />
          <stop offset="1" stopColor="#0f4c86" />
        </linearGradient>
      </defs>
    </svg>
  );
}
