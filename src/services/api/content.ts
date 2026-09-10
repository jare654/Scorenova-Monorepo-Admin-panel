/**
 * content.ts — CRUD for Subjects, Topics, and admin exam-session listing.
 * Used by MockExamsPage and PracticePage.
 */
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Stream {
  id: string;
  name: string;
  description?: string | null;
}

export interface Subject {
  id: string;
  name: string;
  description: string | null;
  streamId: string | null;
  isFree?: boolean;
  accessType?: "free" | "paid" | string;
}

export interface Topic {
  id: string;
  name: string;
  description: string | null;
  subjectId: string;
}

export interface ExamSession {
  sessionId: string;
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

export interface ExamSessionsResponse {
  data: ExamSession[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function arr<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.data)) return p.data as T[];
  }
  return [];
}

function one<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

// ─── Streams ──────────────────────────────────────────────────────────────────

export async function fetchStreams(signal?: AbortSignal): Promise<Stream[]> {
  const payload = await apiClient.get<unknown>("/streams", signal);
  return arr<Stream>(payload);
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

export async function fetchSubjects(
  streamId?: string,
  signal?: AbortSignal,
): Promise<Subject[]> {
  const q = streamId ? `?streamId=${encodeURIComponent(streamId)}` : "";
  const payload = await apiClient.get<unknown>(`/subjects${q}`, signal);
  return arr<Subject>(payload);
}

export async function createSubject(
  data: { name: string; description?: string; streamId: string },
): Promise<Subject> {
  const payload = await apiClient.post<unknown>("/subjects", data);
  return one<Subject>(payload);
}

export async function updateSubject(
  id: string,
  data: { name?: string; description?: string; streamId?: string },
): Promise<Subject> {
  const payload = await apiClient.patch<unknown>(`/subjects/${id}`, data);
  return one<Subject>(payload);
}

export async function deleteSubject(id: string): Promise<void> {
  await apiClient.delete<unknown>(`/subjects/${id}`);
}

export async function updateSubjectAccess(
  id: string,
  data: { isFree?: boolean; accessType?: "free" | "paid" },
): Promise<Subject> {
  const payload = await apiClient.patch<unknown>(`/subjects/${id}/access`, data);
  return one<Subject>(payload);
}

// ─── Topics ───────────────────────────────────────────────────────────────────

export async function fetchTopics(
  subjectId: string,
  signal?: AbortSignal,
): Promise<Topic[]> {
  const payload = await apiClient.get<unknown>(
    `/topics?subjectId=${encodeURIComponent(subjectId)}`,
    signal,
  );
  return arr<Topic>(payload);
}

export async function createTopic(
  data: { name: string; description?: string; subjectId: string },
): Promise<Topic> {
  const payload = await apiClient.post<unknown>("/topics", data);
  return one<Topic>(payload);
}

export async function updateTopic(
  id: string,
  data: { name?: string; description?: string },
): Promise<Topic> {
  const payload = await apiClient.patch<unknown>(`/topics/${id}`, data);
  return one<Topic>(payload);
}

export async function deleteTopic(id: string): Promise<void> {
  await apiClient.delete<unknown>(`/topics/${id}`);
}

// ─── Exam Sessions (admin) ────────────────────────────────────────────────────

export async function fetchExamSessions(
  params: { page?: number; limit?: number; subjectId?: string } = {},
  signal?: AbortSignal,
): Promise<ExamSessionsResponse> {
  const p = new URLSearchParams();
  if (params.page)      p.set("page",      String(params.page));
  if (params.limit)     p.set("limit",     String(params.limit));
  if (params.subjectId) p.set("subjectId", params.subjectId);
  const q = p.toString();
  const payload = await apiClient.get<unknown>(
    `/progress/exam-sessions${q ? `?${q}` : ""}`,
    signal,
  );
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload as ExamSessionsResponse;
  }
  const data = arr<ExamSession>(payload);
  return { data, total: data.length, page: 1, limit: data.length, totalPages: 1 };
}
