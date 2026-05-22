import { useQuery } from "@tanstack/react-query";
import { fetchGrades, fetchStreams } from "../api/questions";

export function useStreams() {
  return useQuery({
    queryKey: ["streams"],
    queryFn: ({ signal }) => fetchStreams(signal),
    staleTime: 10 * 60 * 1000, // streams rarely change
  });
}

export function useGrades() {
  return useQuery({
    queryKey: ["grades"],
    queryFn: ({ signal }) => fetchGrades(signal),
    staleTime: 5 * 60 * 1000,
  });
}

// Kept for backward compat — returns empty array (transactions not implemented)
export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => [],
    staleTime: 5 * 60 * 1000,
  });
}
