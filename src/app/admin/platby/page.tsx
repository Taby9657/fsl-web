import type { Metadata } from "next";
import { AdminPaymentsClient } from "./payments-client";

export const metadata: Metadata = { title: "Platby" };

export default function AdminPlatbyPage() {
  return <AdminPaymentsClient />;
}
