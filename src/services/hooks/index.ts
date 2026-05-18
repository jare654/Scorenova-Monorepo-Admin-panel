import { useQuery } from "@tanstack/react-query";

import { fetchGrades } from "../api/questions";

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => [],
    staleTime: 5 * 60 * 1000,
  });
}

export function useGrades() {
  return useQuery({
    queryKey: ["grades"],
    queryFn: ({ signal }) => fetchGrades(signal),
    staleTime: 5 * 60 * 1000,
  });
}
