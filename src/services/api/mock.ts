import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MockSubject {
  id: string;
  name: string;
  description: string | null;
  streamId: string | null;
}

export interface MockExamSummary {
  id: string;
  subjectId: string;
  label: string;
  questionCount: number;
  status: "pending" | "completed" | "failed";
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface MockExamQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
}

export interface MockExamDetail extends MockExamSummary {
  questions: MockExamQuestion[];
}

export interface StartedExam {
  sessionId: string;
  examId: string;
  label: string;
  subjectId: string;
  subjectName: string;
  questions: { index: number; question: string; choices: string[] }[];
  totalQuestions: number;
  durationMinutes: number;
}

export interface SubmitAnswer {
  questionIndex: number;
  selectedAnswer: string;
  timeSpentMs: number;
}

export interface SubmitResult {
  success: boolean;
  sessionId: string;
  examId: string;
  label: string;
  score: { correct: number; total: number; scorePercent: number; passed: boolean };
  breakdown: {
    questionIndex: number;
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
    timeSpentMs: number;
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function normalizeArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.data)) return p.data as T[];
  }
  return [];
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export async function generateMockExam(
  subjectId: string,
  questionCount: number,
  signal?: AbortSignal,
): Promise<MockExamDetail> {
  const payload = await apiClient.post<unknown>(
    "/mocks/generate",
    { subjectId, questionCount },
    signal,
  );
  return normalize<MockExamDetail>(payload);
}

/** Poll until exam status is completed or failed (max 5 minutes) */
export async function pollMockExamUntilDone(
  examId: string,
  onProgress?: (exam: MockExamSummary) => void,
): Promise<MockExamDetail> {
  const POLL_INTERVAL = 8000; // 8 seconds — avoids hammering the server
  const MAX_POLLS = 40;       // ~5 minutes max

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    const exam = await fetchAdminMockExam(examId);
    onProgress?.(exam);
    if (exam.status === "completed") return exam;
    if (exam.status === "failed") {
      throw new Error(exam.errorMessage ?? "Generation failed");
    }
  }
  throw new Error("Generation timed out. Please check the exam list.");
}

export async function fetchAdminMockExams(
  subjectId?: string,
  signal?: AbortSignal,
): Promise<MockExamSummary[]> {
  const q = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : "";
  const payload = await apiClient.get<unknown>(`/mocks/admin/list${q}`, signal);
  return normalizeArray<MockExamSummary>(payload);
}

export async function fetchAdminMockExam(
  id: string,
  signal?: AbortSignal,
): Promise<MockExamDetail> {
  const payload = await apiClient.get<unknown>(`/mocks/admin/${id}`, signal);
  return normalize<MockExamDetail>(payload);
}

export async function deleteMockExam(
  id: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiClient.delete<unknown>(`/mocks/admin/${id}`, signal);
}

// ─── Shared API ───────────────────────────────────────────────────────────────

export async function fetchMockSubjects(signal?: AbortSignal): Promise<MockSubject[]> {
  const payload = await apiClient.get<unknown>("/mocks/subjects", signal);
  return normalizeArray<MockSubject>(payload);
}

// ─── Student API ──────────────────────────────────────────────────────────────

export async function fetchExamsForSubject(
  subjectId: string,
  signal?: AbortSignal,
): Promise<MockExamSummary[]> {
  const payload = await apiClient.get<unknown>(
    `/mocks/subject/${subjectId}`,
    signal,
  );
  return normalizeArray<MockExamSummary>(payload);
}

export async function startMockExam(
  examId: string,
  signal?: AbortSignal,
): Promise<StartedExam> {
  const payload = await apiClient.get<unknown>(`/mocks/${examId}/start`, signal);
  return normalize<StartedExam>(payload);
}

export async function submitMockExam(
  sessionId: string,
  examId: string,
  answers: SubmitAnswer[],
  signal?: AbortSignal,
): Promise<SubmitResult> {
  const payload = await apiClient.post<unknown>(
    `/mocks/${sessionId}/submit`,
    { examId, answers },
    signal,
  );
  return normalize<SubmitResult>(payload);
}
