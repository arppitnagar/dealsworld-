import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/client";

const NETWORK_RETRY_DELAYS_MS = [500, 1400];
const MUTATION_TIMEOUT_MS = 15_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableNetworkError = (error) => {
  if (!error) return false;
  if (error.response) return false;
  const code = String(error.code || "").toUpperCase();
  const message = String(error.message || "").toLowerCase();
  return (
    code === "ERR_NETWORK" ||
    code === "ECONNABORTED" ||
    message.includes("network error") ||
    message.includes("timeout")
  );
};

async function postWithNetworkRetry(url, body, config = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= NETWORK_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await apiClient.post(url, body, config);
    } catch (error) {
      lastError = error;
      const shouldRetry =
        attempt < NETWORK_RETRY_DELAYS_MS.length &&
        isRetryableNetworkError(error);
      if (!shouldRetry) {
        throw error;
      }
      await sleep(NETWORK_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
}

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
    // Keep buyer dashboard close to real-time for admin approvals.
    staleTime: 2_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchInterval: 4_000,
    refetchIntervalInBackground: false,
    placeholderData: (previous) => previous,
  });
};

// Every deal the buyer has joined, regardless of the deal's own status -
// unlike useDeals() (active-only), this is what keeps a deal reachable
// (its details screen, and the dispatch/OTP flow on it) after the seller
// ends the campaign or it expires.
export const useJoinedDeals = () => {
  return useQuery({
    queryKey: ["joined-deals"],
    queryFn: async () => {
      const { data } = await apiClient.get("/deals/joined");
      return data;
    },
    staleTime: 2_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
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
      const deliveryAddress = normalizeDeliveryAddress(payload?.deliveryAddress);
      const paymentId =
        payload?.paymentId !== undefined && payload?.paymentId !== null
          ? String(payload.paymentId)
          : null;

      const requestBody = {};
      if (joinTimeSeconds !== null) requestBody.joinTimeSeconds = joinTimeSeconds;
      if (deliveryAddress) requestBody.deliveryAddress = deliveryAddress;
      if (paymentId) requestBody.paymentId = paymentId;

      const body = Object.keys(requestBody).length > 0 ? requestBody : undefined;
      const { data } = await postWithNetworkRetry(
        `/deals/${dealId}/join`,
        body,
        { timeout: MUTATION_TIMEOUT_MS },
      );
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
      const { data } = await postWithNetworkRetry(
        `/deals/${dealId}/view`,
        undefined,
        { timeout: MUTATION_TIMEOUT_MS },
      );
      return data;
    },
  });
};

// Hook to record a leave event (drop-off tracking)
export const useLeaveDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId) => {
      if (!dealId) throw new Error("dealId is required");
      const { data } = await postWithNetworkRetry(
        `/deals/${dealId}/leave`,
        undefined,
        { timeout: MUTATION_TIMEOUT_MS },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
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

function normalizeDeliveryAddress(input) {
  if (!input || typeof input !== "object") return null;
  const normalized = {
    label: String(input.label || "Address").trim(),
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    line1: String(input.line1 || "").trim(),
    line2: String(input.line2 || "").trim(),
    city: String(input.city || "").trim(),
    state: String(input.state || "").trim(),
    pincode: String(input.pincode || "").trim(),
    country: String(input.country || "India").trim(),
  };
  if (!normalized.line1 || !normalized.city || !normalized.state || !normalized.pincode) {
    return null;
  }
  return normalized;
}
