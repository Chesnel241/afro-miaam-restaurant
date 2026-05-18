"use client";

export function ShimmerMenu() {
  // Render 6 beautiful skeleton cards to mimic food items grid
  const items = Array.from({ length: 6 });

  return (
    <div className="space-y-14 animate-fade-in">
      <div>
        <div className="mb-6 flex items-end justify-between gap-4">
          {/* Category Title Placeholder */}
          <div className="h-9 w-48 rounded-xl bg-primary/10 animate-pulse" />
          {/* Items Count Placeholder */}
          <div className="h-5 w-16 rounded-lg bg-primary/10 animate-pulse" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((_, idx) => (
            <div
              key={idx}
              className="flex flex-col rounded-2xl bg-white p-4 shadow-card border border-cream/20"
            >
              {/* Image Shimmer Placeholder */}
              <div className="relative aspect-[5/4] w-full overflow-hidden rounded-xl bg-creamSoft/60 animate-pulse flex items-center justify-center">
                <svg
                  className="h-10 w-10 text-primary/10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
              </div>

              <div className="flex flex-1 flex-col gap-3 px-1 pt-4 text-left">
                {/* Title Shimmer */}
                <div className="h-5 w-2/3 rounded-lg bg-primary/10 animate-pulse" />
                
                {/* Description Shimmer */}
                <div className="space-y-1.5">
                  <div className="h-3.5 w-full rounded bg-primary/5 animate-pulse" />
                  <div className="h-3.5 w-5/6 rounded bg-primary/5 animate-pulse" />
                </div>

                {/* Footer Actions Shimmer */}
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-cream/10">
                  <div className="h-7 w-20 rounded-lg bg-primary/10 animate-pulse" />
                  <div className="h-10 w-10 rounded-full bg-primary/10 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
