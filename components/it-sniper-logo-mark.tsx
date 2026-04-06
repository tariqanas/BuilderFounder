export function ItSniperLogoMark({ className }: { className?: string }) {
  return (
    <svg width={28} height={28} viewBox="0 0 64 64" fill="none" role="img" aria-label="IT-Sniper logo" className={className}>
      <defs>
        <linearGradient id="radar-global" x1="10" y1="8" x2="56" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="0.45" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="27" stroke="url(#radar-global)" strokeWidth="2.5" opacity="0.95" />
      <circle cx="32" cy="32" r="18" stroke="url(#radar-global)" strokeWidth="2.5" opacity="0.68" />
      <circle cx="32" cy="32" r="9" stroke="url(#radar-global)" strokeWidth="2.5" opacity="0.48" />
      <path d="M32 5v11M59 32H48M32 59V48M5 32h11" stroke="url(#radar-global)" strokeLinecap="round" strokeWidth="2.5" opacity="0.82" />
      <path d="M32 32L50.5 14.5" stroke="url(#radar-global)" strokeLinecap="round" strokeWidth="3.2" />
      <circle cx="50.5" cy="14.5" r="4" fill="#60A5FA" />
      <circle cx="50.5" cy="14.5" r="8" stroke="#60A5FA" strokeOpacity="0.45" strokeWidth="1.6" />
    </svg>
  );
}
