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
  const POLL_INTERVAL = 12_000; // 12 seconds — conservative to avoid 429
  const MAX_POLLS = 30;         // ~6 minutes max

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

// ─── Admin Results API ────────────────────────────────────────────────────────

export interface MockResult {
  id: string;
  sessionId: string;
  examId: string;
  examLabel: string;
  studentName: string;
  studentPhone: string;
  subjectId: string;
  subjectName: string;
  totalQ: number;
  correct: number;
  scorePercent: number;
  passed: boolean;
  takenAt: string;
}

export interface MockResultsResponse {
  data: MockResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchMockResults(
  params: { page?: number; limit?: number; subjectId?: string } = {},
  signal?: AbortSignal,
): Promise<MockResultsResponse> {
  const p = new URLSearchParams();
  if (params.page)      p.set("page",      String(params.page));
  if (params.limit)     p.set("limit",     String(params.limit));
  if (params.subjectId) p.set("subjectId", params.subjectId);
  const q = p.toString();
  const payload = await apiClient.get<unknown>(
    `/mocks/admin/results${q ? `?${q}` : ""}`,
    signal,
  );
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload as MockResultsResponse;
  }
  const data = normalizeArray<MockResult>(payload);
  return { data, total: data.length, page: 1, limit: data.length, totalPages: 1 };
}
