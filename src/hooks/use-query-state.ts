"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Stav uložený v URL – filtry jsou pak sdílitelné odkazem. */
export function useQueryState(key: string, fallback?: string) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const value = params.get(key) ?? fallback;

  const setValue = useCallback(
    (next: string | undefined) => {
      const sp = new URLSearchParams(params.toString());
      if (next === undefined || next === "" || next === fallback) sp.delete(key);
      else sp.set(key, next);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, router, pathname, key, fallback],
  );

  return [value, setValue] as const;
}
