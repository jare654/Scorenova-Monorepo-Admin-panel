import { apiClient } from "./client";

export interface Grade {
  id: string;
  name: string;
  description?: string | null;
}

export interface Subject {
  id: string;
  name: string;
  description?: string | null;
  gradeId?: string | null;
  gradeName?: string | null;
}

export interface Topic {
  id: string;
  name: string;
  description?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  explanation?: string | null;
  gradeId?: string | null;
  gradeName?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  topicId?: string | null;
  topicName?: string | null;
  accuracy?: number | null;
}

export interface QuestionStatistics {
  totalAttempts: number;
  correctAnswers: number;
  averageTimeSeconds: number;
  successRate: number;
}

export interface QuestionListResponse {
  data: Question[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuestionFilters {
  page?: number;
  limit?: number;
  gradeId?: string;
  subjectId?: string;
  topicId?: string;
  difficulty?: string;
  search?: string;
}

export interface QuestionInput {
  subjectId: string;
  topicId?: string | null;
  text: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  explanation?: string;
}

export interface CreateNamedEntityInput {
  name: string;
  description?: string;
}

export interface CreateSubjectInput extends CreateNamedEntityInput {
  gradeId: string;
}

export interface CreateTopicInput extends CreateNamedEntityInput {
  subjectId: string;
}

export interface ExplainQuestionInput {
  question: string;
  correctAnswer: string;
  subject: string;
  topic: string;
}

export interface ExplainQuestionResponse {
  stepByStep?: string;
  clear?: string;
  simplified?: string;
}

export interface CsvImportResult {
  success?: boolean;
  created?: number;
  updated?: number;
  skipped?: number;
  missingDependencies?: {
    grades?: string[];
    subjects?: Array<{ subject: string; grade: string }>;
    topics?: Array<{ topic: string; subject: string }>;
  };
  errors?: Array<Record<string, unknown>>;
  warnings?: Array<Record<string, unknown>>;
  message?: string;
}

const LIST_CACHE_TTL_MS = 60 * 1000;
const inflightRequests = new Map<string, Promise<unknown>>();
const responseCache = new Map<string, { expiresAt: number; data: unknown }>();

function getCacheKey(name: string, param?: string): string {
  return param ? `${name}:${param}` : name;
}

async function withCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  const existing = inflightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fetcher()
    .then((data) => {
      responseCache.set(key, { expiresAt: Date.now() + LIST_CACHE_TTL_MS, data });
      inflightRequests.delete(key);
      return data;
    })
    .catch((error) => {
      inflightRequests.delete(key);
      throw error;
    });

  inflightRequests.set(key, promise);
  return promise;
}

export async function fetchGrades(signal?: AbortSignal): Promise<Grade[]> {
  return withCache(getCacheKey("grades"), async () => {
    const payload = await apiClient.get<unknown>("/grades", signal, {
      retries: 0,
    });
    return normalizeCollection<Grade>(payload);
  });
}

export async function fetchSubjects(
  gradeId?: string,
  signal?: AbortSignal,
): Promise<Subject[]> {
  const query = gradeId ? `?gradeId=${encodeURIComponent(gradeId)}` : "";
  const cacheKey = getCacheKey("subjects", gradeId ?? "all");
  return withCache(cacheKey, async () => {
    const payload = await apiClient.get<unknown>(`/subjects${query}`, signal, {
      retries: 0,
    });
    return normalizeCollection<Subject>(payload);
  });
}

export async function fetchTopics(
  subjectId?: string,
  signal?: AbortSignal,
): Promise<Topic[]> {
  const query = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : "";
  const cacheKey = getCacheKey("topics", subjectId ?? "all");
  return withCache(cacheKey, async () => {
    const payload = await apiClient.get<unknown>(`/topics${query}`, signal, {
      retries: 0,
    });
    return normalizeCollection<Topic>(payload);
  });
}

export async function fetchQuestions(
  filters: QuestionFilters = {},
  signal?: AbortSignal,
): Promise<QuestionListResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.gradeId) params.set("gradeId", filters.gradeId);
  if (filters.subjectId) params.set("subjectId", filters.subjectId);
  if (filters.topicId) params.set("topicId", filters.topicId);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.search) params.set("search", filters.search);

  const query = params.toString();
  const payload = await apiClient.get<unknown>(
    `/questions${query ? `?${query}` : ""}`,
    signal,
  );

  return normalizePagedQuestions(payload, filters);
}

export async function fetchQuestionById(id: string, signal?: AbortSignal): Promise<Question> {
  const payload = await apiClient.get<unknown>(`/questions/${id}/edit`, signal);
  return normalizeSingle<Question>(payload);
}

export async function fetchQuestionStatistics(
  id: string,
  signal?: AbortSignal,
): Promise<QuestionStatistics | null> {
  try {
    const payload = await apiClient.get<unknown>(`/questions/${id}/statistics`, signal);
    const normalized = normalizeSingle<QuestionStatistics>(payload);
    return {
      totalAttempts: Number(normalized.totalAttempts ?? 0),
      correctAnswers: Number(normalized.correctAnswers ?? 0),
      averageTimeSeconds: Number(normalized.averageTimeSeconds ?? 0),
      successRate: Number(normalized.successRate ?? 0),
    };
  } catch {
    return null;
  }
}

export async function createGrade(input: CreateNamedEntityInput): Promise<Grade> {
  const payload = await apiClient.post<unknown>("/grades", input);
  return normalizeSingle<Grade>(payload);
}

export async function createSubject(input: CreateSubjectInput): Promise<Subject> {
  const payload = await apiClient.post<unknown>("/subjects", input);
  return normalizeSingle<Subject>(payload);
}

export async function createTopic(input: CreateTopicInput): Promise<Topic> {
  const payload = await apiClient.post<unknown>("/topics", input);
  return normalizeSingle<Topic>(payload);
}

export async function createQuestion(input: QuestionInput): Promise<Question> {
  const payload = await apiClient.post<unknown>("/questions", input);
  return normalizeSingle<Question>(payload);
}

export async function updateQuestion(
  id: string,
  input: QuestionInput,
): Promise<Question> {
  const payload = await apiClient.put<unknown>(`/questions/${id}`, input);
  return normalizeSingle<Question>(payload);
}

export async function deleteQuestion(id: string): Promise<void> {
  await apiClient.delete<unknown>(`/questions/${id}`);
}

export async function deleteQuestionsBulk(ids: string[]): Promise<{ deleted: number } | void> {
  if (!ids.length) return;
  return apiClient.post<{ deleted: number }>("/questions/bulk-delete", { ids });
}

export async function importQuestionsCsv(file: File): Promise<CsvImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const payload = await apiClient.post<unknown>("/questions/upload-csv", formData);
  return normalizeSingle<CsvImportResult>(payload);
}

export async function explainQuestion(
  input: ExplainQuestionInput,
): Promise<ExplainQuestionResponse> {
  const payload = await apiClient.post<unknown>("/ai/explain", input);
  const normalized = normalizeSingle<ExplainQuestionResponse>(payload);
  return {
    stepByStep: normalized.stepByStep ?? normalized.clear ?? normalized.simplified ?? "",
    clear: normalized.clear ?? normalized.stepByStep ?? normalized.simplified ?? "",
    simplified: normalized.simplified ?? normalized.stepByStep ?? normalized.clear ?? "",
  };
}

export async function fetchAllSubjectsForGrades(grades: Grade[]): Promise<Subject[]> {
  const collected: Subject[] = [];

  for (const grade of grades) {
    const subjects = await fetchSubjects(grade.id);
    collected.push(...subjects);
  }

  return collected;
}

function normalizeSingle<T>(payload: unknown): T {
  if (isRecord(payload)) {
    if (isRecord(payload.data)) return payload.data as T;
    if (Array.isArray(payload.data)) return payload.data as T;
  }

  return payload as T;
}

function normalizeCollection<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (isRecord(payload)) {
    if (Array.isArray(payload.data)) return payload.data as T[];
    if (Array.isArray(payload.items)) return payload.items as T[];
    if (Array.isArray(payload.results)) return payload.results as T[];
  }
  return [];
}

function normalizePagedQuestions(
  payload: unknown,
  filters: QuestionFilters,
): QuestionListResponse {
  if (Array.isArray(payload)) {
    return {
      data: payload as Question[],
      total: payload.length,
      page: filters.page ?? 1,
      limit: filters.limit ?? payload.length,
      totalPages: 1,
    };
  }

  if (isRecord(payload)) {
    const data = normalizeCollection<Question>(payload.data ?? payload.items ?? payload.results);
    const total = Number(payload.total ?? data.length);
    const limit = Number(payload.limit ?? filters.limit ?? data.length);
    const page = Number(payload.page ?? filters.page ?? 1);
    const totalPages = Number(
      payload.totalPages ?? Math.max(1, Math.ceil(total / Math.max(limit, 1))),
    );

    return { data, total, page, limit, totalPages };
  }

  return {
    data: [],
    total: 0,
    page: filters.page ?? 1,
    limit: filters.limit ?? 0,
    totalPages: 1,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
