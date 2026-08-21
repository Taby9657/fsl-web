import type { Metadata } from "next";
import { AdminRequestsClient } from "./requests-client";

export const metadata: Metadata = { title: "Žádosti" };

export default function AdminZadostiPage() {
  return <AdminRequestsClient />;
}
