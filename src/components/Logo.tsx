import Link from "next/link";

export function Logo({
  variant = "light",
  size = "md",
}: {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}) {
  const colorMain = variant === "light" ? "text-afro-cream" : "text-afro-green";
  const sizeClass =
    size === "lg"
      ? "text-3xl sm:text-4xl"
      : size === "sm"
      ? "text-lg"
      : "text-2xl";

  return (
    <Link
      href="/"
      aria-label="Afro Miaam — accueil"
      className={`heading-display inline-flex items-baseline gap-1 ${colorMain} ${sizeClass}`}
    >
      <span className="font-bold">Afro</span>
      <span className="font-bold">
        Mi<span className="text-afro-orange">aa</span>m
      </span>
    </Link>
  );
}
