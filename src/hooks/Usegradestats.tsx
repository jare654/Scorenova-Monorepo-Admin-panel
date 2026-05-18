import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/context/AuthContext";
import { apiClient } from "@/services/api/client";
import { BackendGrade } from "@/types";

export interface GradeStat {
  grade: string;
  questions: number;
}

interface UseGradeStatsReturn {
  questionsByGrade: GradeStat[];
  loading: boolean;
  error: string | null;
}

export function useGradeStats(): UseGradeStatsReturn {
  const { token } = useAuth();

  const { data: questionsByGrade = [], isLoading: loading, error } = useQuery<GradeStat[], Error>({
    queryKey: ["grade-stats"],
    queryFn: async ({ signal }) => {
      const gradesJson = await apiClient.get<any>("/grades", signal);
      const grades: BackendGrade[] = Array.isArray(gradesJson)
        ? gradesJson
        : (gradesJson.data ?? []);

      try {
        // Step A: Attempt a single bulk analytics query (1 request)
        const bulkStats = await apiClient.get<any>("/grades/all/statistics", signal);
        const bulkArr = Array.isArray(bulkStats) ? bulkStats : (bulkStats.data ?? []);
        if (bulkArr.length > 0) {
          return bulkArr.map((item: any) => ({
            grade: item.gradeName,
            questions: item.totalQuestions ?? 0,
          }));
        }
      } catch (e) {
        // Fallback if bulk statistics is not yet deployed on server
      }

      // Step B: Backward compatibility fallback (sequential to prevent 429)
      const stats: GradeStat[] = [];
      for (const g of grades) {
        try {
          const json = await apiClient.get<any>(`/grades/${g.id}/statistics`, signal);
          stats.push({
            grade: `Grade ${json.gradeName}`,
            questions: json.totalQuestions ?? 0,
          });
          // Wait 50ms between requests to respect rate limits
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch {
          stats.push({ grade: `Grade ${g.name}`, questions: 0 });
        }
      }
      return stats;
    },
    enabled: !!token,
    staleTime: Infinity, // Cache statistics permanently for the session
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

