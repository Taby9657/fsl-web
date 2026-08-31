"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { setQueryCacheCleaner, useAuthStore } from "@/store/auth";
import { ToastViewport } from "@/components/ui/toast";

function AuthBootstrap() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  useEffect(() => {
    void loadFromStorage();
  }, [loadFromStorage]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  useEffect(() => {
    setQueryCacheCleaner(() => client.clear());
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      <AuthBootstrap />
      {children}
      <ToastViewport />
    </QueryClientProvider>
  );
}
