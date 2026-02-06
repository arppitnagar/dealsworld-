import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/client";

// Hook to fetch all active deals
export const useDeals = () => {
  return useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data } = await apiClient.get("/deals", {
        params: { limit: 200 },
      }); // Ensure you have this GET route in server.js
      return data;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    placeholderData: (previous) => previous,
  });
};

// Hook to join a group deal
export const useJoinDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const dealId =
        typeof payload === "string" ? payload : payload?.dealId || payload?.id;
      if (!dealId) {
        throw new Error("dealId is required");
      }
      const joinTimeSeconds = computeJoinTimeSeconds(payload?.createdAt);
      const body =
        joinTimeSeconds !== null ? { joinTimeSeconds } : undefined;
      const { data } = await apiClient.post(`/deals/${dealId}/join`, body);
      return data;
    },
    onSuccess: () => {
      // Refresh the deals list automatically after joining
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
};

// Hook to record a view (server-side)
export const useRecordDealView = () => {
  return useMutation({
    mutationFn: async (dealId) => {
      if (!dealId) throw new Error("dealId is required");
      const { data } = await apiClient.post(`/deals/${dealId}/view`);
      return data;
    },
  });
};

// Hook to record a leave event (drop-off tracking)
export const useLeaveDeal = () => {
  return useMutation({
    mutationFn: async (dealId) => {
      if (!dealId) throw new Error("dealId is required");
      const { data } = await apiClient.post(`/deals/${dealId}/leave`);
      return data;
    },
  });
};

function computeJoinTimeSeconds(createdAt) {
  const createdMs = getTimeMs(createdAt);
  if (!createdMs) return null;
  const diffSeconds = Math.round((Date.now() - createdMs) / 1000);
  return Math.max(0, diffSeconds);
}

function getTimeMs(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "object") {
    const seconds = value.seconds ?? value._seconds;
    if (typeof seconds === "number") return seconds * 1000;
  }
  return null;
}
