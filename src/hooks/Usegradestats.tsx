import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/context/AuthContext";
import { apiClient } from "@/services/api/client";

export interface GradeStat {
  grade: string;
  questions: number;
}

interface UseGradeStatsReturn {
  questionsByGrade: GradeStat[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches question counts grouped by stream (Natural Science / Social Science).
 *
 * The curriculum is now stream-based, not grade-based. This hook fetches
 * streams and the question count per stream via the analytics overview,
 * falling back to per-stream subject counts if the overview isn't available.
 */
export function useGradeStats(): UseGradeStatsReturn {
  const { token } = useAuth();

  const {
    data: questionsByGrade = [],
    isLoading: loading,
    error,
  } = useQuery<GradeStat[], Error>({
    queryKey: ["stream-stats"],
    queryFn: async ({ signal }) => {
      // Fetch streams and questions in parallel
      const [streamsJson, questionsJson] = await Promise.all([
        apiClient.get<any>("/streams", signal),
        apiClient.get<any>("/questions/statistics", signal).catch(() => null),
      ]);

      const streams: { id: string; name: string }[] = Array.isArray(streamsJson)
        ? streamsJson
        : (streamsJson?.data ?? []);

      // If we have aggregate stats, group by stream via subject lookup
      if (questionsJson?.bySubject) {
        // Fetch subjects to map subjectId → streamId
        const subjectsJson = await apiClient.get<any>("/subjects", signal);
        const subjects: { id: string; streamId: string | null }[] =
          Array.isArray(subjectsJson)
            ? subjectsJson
            : (subjectsJson?.data ?? []);

        const subjectToStream = new Map<string, string>();
        for (const s of subjects) {
          if (s.streamId) subjectToStream.set(s.id, s.streamId);
        }

        const streamCounts = new Map<string, number>();
        for (const row of questionsJson.bySubject) {
          const streamId = subjectToStream.get(row.subjectId);
          if (streamId) {
            streamCounts.set(
              streamId,
              (streamCounts.get(streamId) ?? 0) + Number(row.count),
            );
          }
        }

        return streams.map((s) => ({
          grade: s.name,
          questions: streamCounts.get(s.id) ?? 0,
        }));
      }

      // Fallback: return streams with 0 counts
      return streams.map((s) => ({ grade: s.name, questions: 0 }));
    },
    enabled: !!token,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    questionsByGrade,
    loading,
    error: error ? error.message : null,
  };
}
