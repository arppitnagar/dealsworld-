import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/client";

// Hook to fetch all active deals
export const useDeals = () => {
  return useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data } = await apiClient.get("/deals"); // Ensure you have this GET route in server.js
      return data;
    },
  });
};

// Hook to join a group deal
export const useJoinDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId) => {
      const { data } = await apiClient.post(`/deals/${dealId}/join`);
      return data;
    },
    onSuccess: () => {
      // Refresh the deals list automatically after joining
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
};
