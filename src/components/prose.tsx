import type { ReactNode } from "react";

/** Jednoduchá typografie pro textové stránky (bez závislosti na @tailwindcss/typography). */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div
      className="
        max-w-none text-[15px] leading-7 text-mu
        [&_h2]:mb-3 [&_h2]:mt-9 [&_h2]:text-[17px] [&_h2]:font-bold [&_h2]:text-wh
        [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-wh
        [&_p]:mb-4
        [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5
        [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5
        [&_li]:marker:text-go
        [&_a]:text-go [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-wh
        [&_strong]:font-semibold [&_strong]:text-wh
      "
    >
      {children}
    </div>
  );
}
