import type { Metadata } from "next";
import { DraftGate } from "./draft-intro";

export const metadata: Metadata = {
  title: "Draft",
  description:
    "Nemáš tým? Nabídni se v draftu Floorball Stars Ligy — vedoucí, kterým chybí hráči do soupisky, si tam volné hráče hledají sami.",
  // Samotný seznam hráčů je za přihlášením a indexovat se nemá; úvodní
  // vysvětlení naopak ano — je to jediná vstupní brána pro hráče bez týmu.
  robots: { index: true, follow: true },
};

export default function DraftPage() {
  return <DraftGate />;
}
