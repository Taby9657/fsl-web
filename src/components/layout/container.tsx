import clsx from "clsx";
import type { ReactNode } from "react";

export function Container({
  children,
  className,
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}) {
  return (
    <div
      className={clsx(
        "mx-auto w-full px-4 sm:px-6",
        size === "narrow" ? "max-w-3xl" : size === "wide" ? "max-w-[90rem]" : "max-w-7xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Page({
  children,
  className,
  size,
}: {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}) {
  return (
    <Container size={size} className={clsx("py-8 sm:py-10", className)}>
      {children}
    </Container>
  );
}
