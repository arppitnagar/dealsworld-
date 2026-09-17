import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/client";

export const useDispatchDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId) => {
      if (!dealId) throw new Error("dealId is required");
      const { data } = await apiClient.post(`/deals/${dealId}/dispatch`);
      return data;
    },
    onSuccess: (_data, dealId) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-status", dealId] });
    },
  });
};

export const useCompleteDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId) => {
      if (!dealId) throw new Error("dealId is required");
      const { data } = await apiClient.post(`/deals/${dealId}/complete`);
      return data;
    },
    onSuccess: (_data, dealId) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-status", dealId] });
    },
  });
};

export const useExpireDealEarly = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId) => {
      if (!dealId) throw new Error("dealId is required");
      const { data } = await apiClient.post(`/deals/${dealId}/expire-early`);
      return data;
    },
    onSuccess: (_data, dealId) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-status", dealId] });
    },
  });
};

// The deal doc itself arrives via DealDetails.js's live onSnapshot listener,
// so this only needs to cover the per-buyer list — not dispatchStatus.
export const useDeliveryStatusList = (dealId, { enabled = true } = {}) => {
  return useQuery({
    queryKey: ["delivery-status", dealId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/deals/${dealId}/delivery-status`);
      return data;
    },
    enabled: Boolean(dealId) && enabled,
    refetchInterval: 10_000,
  });
};

export const useMarkBuyerDelivered = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealId, buyerId }) => {
      if (!dealId || !buyerId) throw new Error("dealId and buyerId are required");
      const { data } = await apiClient.post(`/deals/${dealId}/delivery/${buyerId}/mark-delivered`);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-status", variables.dealId] });
    },
  });
};
