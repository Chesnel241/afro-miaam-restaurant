export function AfricanDivider({ className = "" }: { className?: string }) {
  return <div className={`afro-divider ${className}`} aria-hidden="true" />;
}

export function PatternBadge({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="32,4 60,32 32,60 4,32" />
        <polygon points="32,16 48,32 32,48 16,32" />
        <circle cx="32" cy="32" r="3" fill="currentColor" />
      </g>
    </svg>
  );
}
