"use client";

import { useEffect, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

function CacheBusterLogic() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      if (searchParams?.has("cb")) {
        // Clean up the URL from the cache buster query parameter
        const params = new URLSearchParams(searchParams.toString());
        params.delete("cb");
        const newSearch = params.toString();
        const newUrl = pathname + (newSearch ? `?${newSearch}` : "");
        window.history.replaceState({}, "", newUrl);
        return;
      }

      const now = Date.now();
      const lastRefreshStr = sessionStorage.getItem("last_refresh_time");
      const refreshCountStr = sessionStorage.getItem("refresh_count");

      const lastRefresh = lastRefreshStr ? parseInt(lastRefreshStr, 10) : 0;
      const refreshCount = refreshCountStr ? parseInt(refreshCountStr, 10) : 0;

      // 3 seconds window between page loads to detect "successive refreshes"
      if (now - lastRefresh < 3000) {
        const newCount = refreshCount + 1;
        sessionStorage.setItem("refresh_count", newCount.toString());
        sessionStorage.setItem("last_refresh_time", now.toString());

        // 2 successive refreshes = Count reaches 2
        if (newCount >= 2) {
          sessionStorage.setItem("refresh_count", "0");
          sessionStorage.setItem("last_refresh_time", "0");
          
          // Purge Next.js App Router Client Cache
          router.refresh();
          
          // Force a hard bypass of the browser HTTP cache
          window.location.href = pathname + "?cb=" + now;
        }
      } else {
        // Reset counter if time between refreshes is > 3s
        sessionStorage.setItem("refresh_count", "0");
        sessionStorage.setItem("last_refresh_time", now.toString());
      }
    } catch (e) {
      // Ignore if sessionStorage is inaccessible (e.g. strict privacy modes)
    }
  }, [pathname, router, searchParams]);

  return null;
}

export function CacheBuster() {
  return (
    <Suspense fallback={null}>
      <CacheBusterLogic />
    </Suspense>
  );
}
