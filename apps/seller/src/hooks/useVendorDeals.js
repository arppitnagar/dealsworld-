import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/client";

// Ensure this is a NAMED export
export const useVendorDeals = (vendorId) => {
  return useQuery({
    queryKey: ["vendor-deals", vendorId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/deals/vendor/${vendorId}`);
      return data;
    },
  });
};
