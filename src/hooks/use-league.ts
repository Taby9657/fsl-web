"use client";

import { useQuery } from "@tanstack/react-query";
import { statsApi, teamsApi } from "@/lib/api";

/** Seznam divizí (dedup + seřazeno) z veřejného endpointu /teams/divisions */
export function useDivisions() {
  return useQuery({
    queryKey: ["divisions"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const res = await teamsApi.divisions();
      return [...new Set(res.data.map((d) => d.division).filter(Boolean))].sort();
    },
  });
}

/** Konference odvozené ze stejného endpointu */
export function useConferencesFromDivisions() {
  return useQuery({
    queryKey: ["divisions", "raw"],
    staleTime: 10 * 60_000,
    queryFn: async () => (await teamsApi.divisions()).data,
  });
}

/** Sezóny, nejnovější první */
export function useSeasons() {
  return useQuery({
    queryKey: ["seasons"],
    staleTime: 30 * 60_000,
    queryFn: async () => (await statsApi.seasons()).data,
  });
}
