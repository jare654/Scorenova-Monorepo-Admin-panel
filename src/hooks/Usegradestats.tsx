import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/context/AuthContext";

const API_URL = "https://learnova-backen.onrender.com/api/v1";

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
        const gradesRes = await fetch(`${API_URL}/grades`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!gradesRes.ok) throw new Error(`HTTP ${gradesRes.status}`);

        const gradesJson = await gradesRes.json();
        const grades: { id: string; name: string }[] = Array.isArray(gradesJson)
          ? gradesJson
          : (gradesJson.data ?? []);

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
        console.error("useGradeStats failed:", err);
        setError("Failed to load grade statistics.");
      } finally {
        setLoading(false);
      }
    };

    fetchGradeStats();
  }, [token]);

  return { questionsByGrade, loading, error };
}
