"use client";

import { classNames } from "@/lib/utils";
import type { MenuCategory } from "@/lib/types";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/data/menu";

export type CategoryFilter = "all" | MenuCategory;

export function CategoryTabs({
  active,
  onChange,
}: {
  active: CategoryFilter;
  onChange: (next: CategoryFilter) => void;
}) {
  const items: { id: CategoryFilter; label: string }[] = [
    { id: "all", label: "Tous" },
    ...CATEGORY_ORDER.map((c) => ({
      id: c as CategoryFilter,
      label: CATEGORY_LABELS[c],
    })),
  ];

  return (
    <div className="-mx-5 overflow-x-auto sm:mx-0">
      <div className="flex min-w-max items-center gap-2 px-5 sm:flex-wrap sm:px-0">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={classNames(
              "chip focus-ring",
              active === it.id && "chip-active",
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
