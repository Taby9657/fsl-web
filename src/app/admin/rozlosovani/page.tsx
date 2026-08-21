import type { Metadata } from "next";
import { FixturesClient } from "./fixtures-client";

export const metadata: Metadata = { title: "Rozlosování" };

export default function AdminRozlosovaniPage() {
  return <FixturesClient />;
}
