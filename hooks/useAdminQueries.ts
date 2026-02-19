import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

// Use Next.js API routes for admin API
const API_BASE = "/api/admin";

// Helper to get token with sessionStorage fallback (handles race conditions after login)
function getTokenWithFallback(contextToken: string): string {
  if (contextToken) return contextToken.trim();
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("admin_password") || "";
    return stored.trim();
  }
  return "";
}

// Helper to clear invalid session (only called explicitly by UI, not automatically)
// Removed automatic clearing to prevent logout-on-login issues

async function adminFetch(
  path: string,
  token: string,
  options: RequestInit = {},
) {
  // Log for debugging auth issues
  console.log(
    `[adminFetch] ${path} - token present: ${!!token}, length: ${token?.length || 0}`,
  );

  // Next.js API routes use Bearer token with admin password
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(
        `[adminFetch] 401 Unauthorized for ${path} - token was: ${token ? "present" : "missing"}, length: ${token?.length || 0}, response: ${errorText}`,
      );

      // Don't automatically clear session - let React Query handle the error
      // The query will be disabled if auth state changes, preventing infinite loops
      // UI can handle showing login prompt if needed

      throw new Error("Unauthorized - please log in again");
    }
    const error = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

// Query: Dashboard stats
export function useStats() {
  const { token: contextToken, isHydrated, isAuthenticated } = useAuth();
  const token = getTokenWithFallback(contextToken);

  return useQuery({
    queryKey: ["stats"],
    queryFn: () => adminFetch("/calls/stats", token),
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: !!token && isHydrated && isAuthenticated, // Wait for auth to be ready
    retry: (failureCount, error) => {
      // Don't retry on 401 errors - they indicate auth failure
      if (error instanceof Error && error.message.includes("Unauthorized")) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Query: Calls list with pagination and filters
export function useCalls(page = 1, limit = 50, search = "", status = "") {
  const { token: contextToken, isHydrated, isAuthenticated } = useAuth();
  const token = getTokenWithFallback(contextToken);

  return useQuery({
    queryKey: ["calls", page, limit, search, status],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      return adminFetch(`/calls?${params}`, token);
    },
    enabled: !!token && isHydrated && isAuthenticated, // Wait for auth to be ready
    placeholderData: (previousData) => previousData, // Keep old data while fetching
    retry: (failureCount, error) => {
      // Don't retry on 401 errors - they indicate auth failure
      if (error instanceof Error && error.message.includes("Unauthorized")) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Query: Single call detail
export function useCall(callId: string) {
  const { token: contextToken, isHydrated, isAuthenticated } = useAuth();
  const token = getTokenWithFallback(contextToken);

  return useQuery({
    queryKey: ["call", callId],
    queryFn: () => adminFetch(`/calls/${callId}`, token),
    enabled: !!callId && !!token && isHydrated && isAuthenticated,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("Unauthorized")) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Query: Webhook logs
export function useLogs(page = 1, limit = 50) {
  const { token: contextToken, isHydrated, isAuthenticated } = useAuth();
  const token = getTokenWithFallback(contextToken);
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: ["logs", page, limit],
    queryFn: () =>
      adminFetch(`/webhook-logs?offset=${offset}&limit=${limit}`, token),
    enabled: !!token && isHydrated && isAuthenticated, // Wait for auth to be ready
    retry: (failureCount, error) => {
      // Don't retry on 401 errors - they indicate auth failure
      if (error instanceof Error && error.message.includes("Unauthorized")) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Query: Blocked numbers
export function useBlockedNumbers() {
  const { token: contextToken, isHydrated, isAuthenticated } = useAuth();
  const token = getTokenWithFallback(contextToken);

  return useQuery({
    queryKey: ["blockedNumbers"],
    queryFn: () => adminFetch("/blocked-numbers", token),
    enabled: !!token && isHydrated && isAuthenticated,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("Unauthorized")) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Query: Telavox API keys
export function useTelavoxKeys() {
  const { token: contextToken } = useAuth();
  const token = getTokenWithFallback(contextToken);

  return useQuery({
    queryKey: ["telavoxKeys"],
    queryFn: () => adminFetch("/telavox-keys", token),
    enabled: !!token,
  });
}

// Query: Recent completed calls (for dashboard)
export function useRecentCalls(limit = 10) {
  const { token: contextToken, isHydrated, isAuthenticated } = useAuth();
  const token = getTokenWithFallback(contextToken);

  return useQuery({
    queryKey: ["recentCalls", limit],
    queryFn: () => adminFetch(`/calls?status=completed&limit=${limit}`, token),
    enabled: !!token && isHydrated && isAuthenticated, // Wait for auth to be ready
    retry: (failureCount, error) => {
      // Don't retry on 401 errors - they indicate auth failure
      if (error instanceof Error && error.message.includes("Unauthorized")) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Mutation: Reprocess call
export function useReprocessCall() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: ({
      callId,
      manualRecordingId,
    }: {
      callId: string;
      manualRecordingId?: string;
    }) =>
      adminFetch(`/calls/${callId}/reprocess`, token, {
        method: "POST",
        body: manualRecordingId
          ? JSON.stringify({ manualRecordingId })
          : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["recentCalls"] });
    },
  });
}

// Mutation: Bulk reprocess skipped
export function useBulkReprocessSkipped() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: () =>
      adminFetch("/calls/bulk-reprocess", token, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// Mutation: Bulk reprocess failed
export function useBulkReprocessFailed() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: () =>
      adminFetch("/calls/bulk-reprocess-failed", token, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// Mutation: Bulk regenerate summaries
export function useBulkRegenerateSummaries() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: () =>
      adminFetch("/calls/bulk-regenerate-summaries", token, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["recentCalls"] });
    },
  });
}

// Mutation: Sync to HubSpot
export function useHubSpotSync() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (callId: string) =>
      adminFetch(`/calls/${callId}/hubspot-sync`, token, { method: "POST" }),
    onSuccess: (_, callId) => {
      queryClient.invalidateQueries({ queryKey: ["call", callId] });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}

// Mutation: Add blocked number
export function useAddBlockedNumber() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (data: { phoneNumber: string; reason?: string }) =>
      adminFetch("/blocked-numbers", token, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockedNumbers"] });
    },
  });
}

// Mutation: Remove blocked number
export function useRemoveBlockedNumber() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/blocked-numbers/${id}`, token, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockedNumbers"] });
    },
  });
}

// Mutation: Add Telavox key
export function useAddTelavoxKey() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (data: {
      agentEmail: string;
      apiKey: string;
      displayName?: string;
      hubspotUserId?: string;
    }) =>
      adminFetch("/telavox-keys", token, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telavoxKeys"] });
    },
  });
}

// Mutation: Update Telavox key
export function useUpdateTelavoxKey() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: ({
      id,
      apiKey,
      displayName,
      hubspotUserId,
    }: {
      id: string;
      apiKey?: string;
      displayName?: string;
      hubspotUserId?: string;
    }) =>
      adminFetch(`/telavox-keys/${id}`, token, {
        method: "PUT",
        body: JSON.stringify({ apiKey, displayName, hubspotUserId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telavoxKeys"] });
    },
  });
}

// Mutation: Remove Telavox key
export function useRemoveTelavoxKey() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/telavox-keys/${id}`, token, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telavoxKeys"] });
    },
  });
}
