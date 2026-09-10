import { apiClient } from "./client";

export interface StudentFeedback {
  id: string;
  studentId: string;
  studentName?: string;
  studentPhone?: string;
  studentEmail?: string;
  category?: string;
  message: string;
  rating?: number;
  status?: "open" | "in_review" | "resolved";
  createdAt: string;
}

export interface FeedbackResponse {
  data: StudentFeedback[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchFeedbacks(
  params: { page?: number; limit?: number; search?: string } = {},
  signal?: AbortSignal,
): Promise<FeedbackResponse> {
  const p = new URLSearchParams();
  if (params.page) p.set("page", String(params.page));
  if (params.limit) p.set("limit", String(params.limit));
  if (params.search) p.set("search", params.search);

  const query = p.toString();
  const res = await apiClient.get<unknown>(`/feedbacks${query ? `?${query}` : ""}`, signal);

  if (res && typeof res === "object" && "data" in res && Array.isArray((res as any).data)) {
    return res as FeedbackResponse;
  }
  if (Array.isArray(res)) {
    return { data: res, total: res.length, page: 1, limit: res.length, totalPages: 1 };
  }
  return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
}
