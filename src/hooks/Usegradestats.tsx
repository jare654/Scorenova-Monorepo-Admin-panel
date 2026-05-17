import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/context/AuthContext";
import { API_URL, getGrades } from "@/lib/api";

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
  const [questionsByGrade, setQuestionsByGrade] = useState<GradeStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchGradeStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const grades = await getGrades(token);

        const stats = await Promise.all(
          grades.map(async (g) => {
            try {
              const res = await fetch(`${API_URL}/grades/${g.id}/statistics`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) return { grade: `Grade ${g.name}`, questions: 0 };
              const json = await res.json();
              return {
                grade: `Grade ${json.gradeName}`,
                questions: json.totalQuestions ?? 0,
              };
            } catch {
              return { grade: `Grade ${g.name}`, questions: 0 };
            }
          }),
        );

        setQuestionsByGrade(stats);
      } catch (err) {
        // useGradeStats failed
        setError("Failed to load grade statistics.");
      } finally {
        setLoading(false);
      }
    };

    fetchGradeStats();
  }, [token]);

  return { questionsByGrade, loading, error };
}
