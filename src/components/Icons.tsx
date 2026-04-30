import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

const base: Props = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function LeafIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 21c10 0 14-8 14-14C9 7 5 13 5 21z" />
      <path d="M5 21c0-6 4-10 10-10" />
    </svg>
  );
}

export function PotIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10h18" />
      <path d="M5 10v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-6" />
      <path d="M8 6c0-2 2-3 2-3" />
      <path d="M14 6c0-2 2-3 2-3" />
    </svg>
  );
}

export function HeartIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M20.8 4.6c-1.5-1.4-3.9-1.4-5.4 0L12 7l-3.4-2.4c-1.5-1.4-3.9-1.4-5.4 0-1.6 1.5-1.6 4 0 5.5l8.8 9 8.8-9c1.6-1.5 1.6-4 0-5.5z" />
    </svg>
  );
}

export function TruckIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <rect x="1" y="3" width="15" height="13" />
      <path d="M16 8h4l3 3v5h-7z" />
      <circle cx="5.5" cy="18.5" r="2" />
      <circle cx="18.5" cy="18.5" r="2" />
    </svg>
  );
}

export function CalendarIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function CartIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.5 12h11l2-8H6" />
    </svg>
  );
}

export function UserIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function CheckIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export function ArrowRightIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export function ClockIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function PinIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 22s8-7 8-13a8 8 0 1 0-16 0c0 6 8 13 8 13z" />
      <circle cx="12" cy="9" r="3" />
    </svg>
  );
}

export function PhoneIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7 12 12 0 0 0 .7 2.7 2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5 12 12 0 0 0 2.7.7 2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

export function InstagramIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function FacebookIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function TiktokIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M14 4v9.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 4c.5 2.5 2.5 4 5 4" />
    </svg>
  );
}

export function MailIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

export function ChevronRightIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function MinusIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function PlusIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function TrashIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
