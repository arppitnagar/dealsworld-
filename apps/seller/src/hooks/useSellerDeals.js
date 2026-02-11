import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/client";

// Ensure this is a NAMED export
export const useSellerDeals = (sellerId) => {
  return useQuery({
    queryKey: ["seller-deals", sellerId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/deals/seller/${sellerId}`);
      return data;
    },
  });
};
