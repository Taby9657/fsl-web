import type { Metadata } from "next";
import { PozvankaClient } from "./pozvanka-client";

export const metadata: Metadata = {
  title: "Pozvánka do týmu",
  description: "Přijmi pozvánku do týmu ve Floorball Stars Lize.",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ code: string }> };

export default async function PozvankaPage({ params }: Props) {
  const { code } = await params;
  return <PozvankaClient code={decodeURIComponent(code).toUpperCase()} />;
}
