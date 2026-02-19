import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface AdminApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: Record<string, string>;
}

export const useAdminApi = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const adminRequest = useCallback(
    async (endpoint: string, options: AdminApiOptions = {}) => {
      if (!token) {
        throw new Error("Unauthorized - Please log in");
      }

      setLoading(true);

      try {
        const response = await fetch(`/api/admin${endpoint}`, {
          method: options.method || "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Token expired or invalid
            throw new Error("Unauthorized - Please log in");
          }
          // For 404 errors, return a structured error response instead of throwing
          if (response.status === 404) {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Not found" }));
            return {
              error: errorData.error || "Not found",
              details: errorData.details,
              status: 404,
            };
          }
          const errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
            throw new Error(
              errorJson.error ||
                errorJson.message ||
                `HTTP error! status: ${response.status}`,
            );
          } catch (parseError) {
            if (parseError instanceof SyntaxError) {
              throw new Error(
                `HTTP error! status: ${response.status}: ${errorText}`,
              );
            }
            throw parseError;
          }
        }

        // Handle empty responses
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      } catch (error) {
        console.error("Admin API request failed:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  return { adminRequest, loading };
};

// --- Hooks for Settings Page ---

export function useWebhookUrl() {
  const { adminRequest } = useAdminApi();
  const { token } = useAuth();

  return useQuery({
    queryKey: ["webhookUrl"],
    queryFn: () => adminRequest("/webhook-url"), // You might need to implement this endpoint too
    enabled: !!token,
  });
}

export function useTelavoxDebug() {
  const { adminRequest } = useAdminApi();

  return useQuery({
    queryKey: ["telavoxDebug"],
    queryFn: () => adminRequest("/debug/telavox"),
    enabled: false, // Only run when manually triggered
  });
}

export function useSetting(key: string) {
  const { adminRequest } = useAdminApi();
  const { token } = useAuth();

  return useQuery({
    queryKey: ["setting", key],
    queryFn: async () => {
      const data = await adminRequest(`/settings/${key}`);
      return data || { value: null };
    },
    enabled: !!token,
  });
}

export function useUpdateSetting() {
  const { adminRequest } = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      adminRequest(`/settings`, {
        method: "POST",
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["setting", variables.key] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useTelavoxKeys() {
  const { adminRequest } = useAdminApi();
  const { token } = useAuth();

  return useQuery({
    queryKey: ["telavoxKeys"],
    queryFn: async () => {
      const data = await adminRequest("/api-keys");
      return { keys: data || [] }; // Match expected structure
    },
    enabled: !!token,
  });
}

export function useAddTelavoxKey() {
  const { adminRequest } = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      adminRequest("/api-keys", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telavoxKeys"] });
    },
  });
}

export function useUpdateTelavoxKey() {
  const { adminRequest } = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      adminRequest(`/api-keys/${data.id}`, { method: "PUT", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telavoxKeys"] });
    },
  });
}

export function useRemoveTelavoxKey() {
  const { adminRequest } = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      adminRequest(`/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telavoxKeys"] });
    },
  });
}

export function useSlackMappings() {
  const { adminRequest } = useAdminApi();
  const { token } = useAuth();

  return useQuery({
    queryKey: ["slackMappings"],
    queryFn: async () => {
      const data = await adminRequest("/slack-mappings");
      return { mappings: data || [] };
    },
    enabled: !!token,
  });
}

export function useAddSlackMapping() {
  const { adminRequest } = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      adminRequest("/slack-mappings", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slackMappings"] });
    },
  });
}

export function useUpdateSlackMapping() {
  const { adminRequest } = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      adminRequest(`/slack-mappings/${data.id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slackMappings"] });
    },
  });
}

export function useRemoveSlackMapping() {
  const { adminRequest } = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      adminRequest(`/slack-mappings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slackMappings"] });
    },
  });
}

export function useTestAgentKey() {
  const { adminRequest } = useAdminApi();

  return useMutation({
    mutationFn: (email: string) =>
      adminRequest("/debug/telavox", {
        // Reuse debug endpoint but maybe with specific context?
        // Or create a new one?
        // The debug endpoint I created fetches using ORG credentials.
        // Testing an agent key requires testing THAT key.
        // I probably need a test-key endpoint.
        // For now, I'll map it to debug endpoint as a placeholder or fail.
        // Actually, I can pass a query param to debug endpoint?
        // Or just create /api/admin/api-keys/test
        method: "POST",
        body: { email },
      }),
  });
}

export function useCompletedCalls(limit = 10) {
  const { adminRequest } = useAdminApi();
  const { token } = useAuth();

  return useQuery({
    queryKey: ["completedCalls", limit],
    queryFn: async () => {
      const data = await adminRequest(`/calls?status=completed&limit=${limit}`);
      return { calls: data || [] };
    },
    enabled: !!token,
  });
}

export function useGenerateSummary() {
  const { adminRequest } = useAdminApi();

  return useMutation({
    mutationFn: (data: any) =>
      adminRequest("/calls/generate-summary", { method: "POST", body: data }),
  });
}

export function useBulkRegenerateSummaries() {
  const { adminRequest } = useAdminApi();

  return useMutation({
    mutationFn: () =>
      adminRequest("/calls/bulk-regenerate", { method: "POST" }),
  });
}

export function useBlockedNumbers() {
  const { adminRequest } = useAdminApi();
  const { token } = useAuth();

  return useQuery({
    queryKey: ["blockedNumbers"],
    queryFn: async () => {
      const data = await adminRequest("/blocked-numbers");
      return { blockedNumbers: data || [] };
    },
    enabled: !!token,
  });
}

export function useAddBlockedNumber() {
  const { adminRequest } = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      adminRequest("/blocked-numbers", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockedNumbers"] });
    },
  });
}

export function useRemoveBlockedNumber() {
  const { adminRequest } = useAdminApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      adminRequest(`/blocked-numbers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockedNumbers"] });
    },
  });
}
