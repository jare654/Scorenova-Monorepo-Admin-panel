import { apiClient } from "./client";

export type FlagStatus = "pending" | "reviewed" | "resolved" | "dismissed";

export interface QuestionFlag {
  id: string;
  questionId: string;
  accountId: string;
  reason: string;
  status: FlagStatus;
  createdAt: string;
  updatedAt: string;
  questionText?: string;
}

export interface FlagListResponse {
  data: QuestionFlag[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FetchFlagsParams {
  status?: FlagStatus | "all";
  page?: number;
  limit?: number;
}

export async function fetchFlags(
  params?: FetchFlagsParams,
  signal?: AbortSignal,
): Promise<FlagListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status && params.status !== "all") query.set("status", params.status);

  const qs = query.toString();
  return apiClient.get<FlagListResponse>(
    `/questions/flags${qs ? `?${qs}` : ""}`,
    signal,
  );
}

export async function updateFlagStatus(
  flagId: string,
  status: FlagStatus,
): Promise<{ success: boolean; flag: QuestionFlag }> {
  return apiClient.patch<{ success: boolean; flag: QuestionFlag }>(
    `/questions/flags/${flagId}/status`,
    { status },
  );
}
