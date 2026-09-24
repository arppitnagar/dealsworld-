import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@dealsworld/shared";
import apiClient from "../api/client";

// Ensure this is a NAMED export
export const useSellerDeals = (sellerId) => {
  const { language } = useI18n();
  return useQuery({
    queryKey: ["seller-deals", sellerId, language],
    queryFn: async () => {
      const { data } = await apiClient.get(`/deals/seller/${sellerId}`, {
        params: { lang: language },
      });
      return data;
    },
  });
};
