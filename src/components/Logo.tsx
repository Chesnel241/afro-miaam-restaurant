import Link from "next/link";

type Props = {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg" | "xl";
  withTagline?: boolean;
  className?: string;
};

const SIZE_HEIGHT: Record<NonNullable<Props["size"]>, number> = {
  sm: 36,
  md: 48,
  lg: 64,
  xl: 96,
};

export function Logo({
  variant = "light",
  size = "md",
  withTagline = false,
  className = "",
}: Props) {
  const fillBrand = variant === "light" ? "#F4EDE4" : "#1F3D2B";
  const fillTag = variant === "light" ? "#6BAA75" : "#1F3D2B";
  const height = SIZE_HEIGHT[size];
  const viewH = withTagline ? 360 : 290;

  return (
    <Link
      href="/"
      aria-label="Afro Miaam — accueil"
      className={`inline-flex items-center ${className}`}
    >
      <svg
        viewBox={`0 0 760 ${viewH}`}
        height={height}
        width={(height * 760) / viewH}
        role="img"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          fontFamily="var(--font-display), Poppins, system-ui, sans-serif"
          fontWeight={800}
        >
          <text x="60" y="130" fontSize="130" fill={fillBrand}>
            Afr
          </text>

          <g transform="translate(310,68)">
            <circle cx="42" cy="42" r="42" fill="none" stroke="#E85D2A" strokeWidth="18" />
            <path
              d="M70 8 C82 -2 96 -2 102 6 C96 14 82 18 70 12 Z"
              fill="#6BAA75"
            />
            <path
              d="M82 22 C92 12 104 12 110 18 C104 28 92 30 82 26 Z"
              fill="#6BAA75"
            />
            <line
              x1="68"
              y1="14"
              x2="60"
              y2="22"
              stroke="#3F6B45"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="86"
              y1="26"
              x2="78"
              y2="34"
              stroke="#3F6B45"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>

          <text x="160" y="270" fontSize="130" fill={fillBrand}>
            M
          </text>

          <g transform="translate(290,150)">
            <circle cx="14" cy="10" r="10" fill="#E85D2A" />
            <rect x="2" y="32" width="6" height="22" rx="2" fill="#E85D2A" />
            <rect x="11" y="32" width="6" height="22" rx="2" fill="#E85D2A" />
            <rect x="20" y="32" width="6" height="22" rx="2" fill="#E85D2A" />
            <rect x="6" y="50" width="16" height="62" rx="6" fill="#E85D2A" />
          </g>

          <text x="332" y="270" fontSize="130" fill={fillBrand}>
            aam
          </text>

          {withTagline && (
            <g transform="translate(0,320)">
              <circle cx="190" cy="6" r="6" fill="#E85D2A" />
              <text
                x="210"
                y="11"
                fontSize="20"
                fontWeight={600}
                letterSpacing="5"
                fill={fillTag}
              >
                RESTAURANT AFRO GASTRONOMIQUE
              </text>
              <circle cx="612" cy="6" r="6" fill="#E85D2A" />
            </g>
          )}
        </g>
      </svg>
    </Link>
  );
}
