import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { isVersionBelow } from "@dealsworld/shared";
import apiClient from "../api/client";

const APP_KEY = "buyer";
const CURRENT_VERSION = Constants.expoConfig?.version || null;

// Polled independently of auth - an out-of-date install must be blocked
// before login, not after.
export function useVersionGate() {
  const { data, isLoading } = useQuery({
    queryKey: ["version-gate", APP_KEY],
    queryFn: async () => {
      const { data: gate } = await apiClient.get("/app-config/version-gate");
      return gate?.[APP_KEY] || null;
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    retry: 1,
  });

  const blocked = Boolean(data && isVersionBelow(CURRENT_VERSION, data.minVersion));

  return {
    loading: isLoading,
    blocked,
    updateUrl: data?.updateUrl || "",
    message: data?.message || "",
  };
}
