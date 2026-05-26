import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PracticeSubject {
  id: string;
  name: string;
  description: string | null;
  streamId: string | null;
  topicCount: number;
}

export interface PracticeTopic {
  id: string;
  name: string;
  description: string | null;
  subjectId: string;
  questionCount: number;
}

export interface PracticeQuestion {
  id: string;
  questionText: string;
  choices: string[];
  correctIndex: number;
  difficulty: string;
  topicId: string;
  subjectId: string;
}

export interface PracticeQuestionsResponse {
  data: PracticeQuestion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.data)) return p.data as T[];
  }
  return [];
}

function normalize<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function fetchPracticeSubjects(signal?: AbortSignal): Promise<PracticeSubject[]> {
  const payload = await apiClient.get<unknown>("/practice/subjects", signal);
  return normalizeArray<PracticeSubject>(payload);
}

export async function fetchPracticeTopics(
  subjectId: string,
  signal?: AbortSignal,
): Promise<PracticeTopic[]> {
  const payload = await apiClient.get<unknown>(
    `/practice/subjects/${subjectId}/topics`,
    signal,
  );
  return normalizeArray<PracticeTopic>(payload);
}

export async function fetchPracticeQuestions(
  topicId: string,
  page = 1,
  limit = 10,
  signal?: AbortSignal,
): Promise<PracticeQuestionsResponse> {
  const payload = await apiClient.get<unknown>(
    `/practice/topics/${topicId}/questions?page=${page}&limit=${limit}`,
    signal,
  );
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.data)) return payload as PracticeQuestionsResponse;
  }
  const arr = normalizeArray<PracticeQuestion>(payload);
  return { data: arr, total: arr.length, page, limit, totalPages: 1 };
}
