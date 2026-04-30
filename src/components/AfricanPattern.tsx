import type { SVGProps } from "react";

export function AfricanPattern({
  className,
  color = "#244A33",
  ...rest
}: SVGProps<SVGSVGElement> & { color?: string }) {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      {...rest}
    >
      <defs>
        <pattern
          id="afro-diamond"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 20 L20 0 L40 20 L20 40 Z"
            fill="none"
            stroke={color}
            strokeWidth="1.2"
            opacity="0.7"
          />
          <circle cx="20" cy="20" r="2" fill={color} opacity="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#afro-diamond)" />
    </svg>
  );
}

export function AfricanDivider({ className = "" }: { className?: string }) {
  return <div className={`afro-divider ${className}`} aria-hidden="true" />;
}
