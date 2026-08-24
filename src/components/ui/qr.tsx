"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * QR kód generovaný přímo v prohlížeči (knihovna qrcode).
 * Nezávisí na žádné externí službě — funguje i bez internetu po načtení stránky.
 */
export function QrCode({
  value,
  size = 220,
  alt = "QR kód",
  className,
}: {
  value: string;
  size?: number;
  alt?: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#c9a140ff", light: "#0d0120ff" },
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <div className="h-full w-full animate-fsl-skeleton rounded-lg bg-c2" />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
