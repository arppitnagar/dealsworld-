import { useMemo } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import apiClient from "../api/client";
import { POLLING_ENABLED } from "@dealsworld/shared";

const DEALS_PAGE_SIZE = 20;
// Matches the old single-fetch endpoint's effective ceiling (it always
// requested limit=200) - used for the sort/search fallback below, so that
// mode isn't missing deals the old single-fetch behavior would have shown.
const FULL_SET_LIMIT = 200;

const NETWORK_RETRY_DELAYS_MS = [500];
const MUTATION_TIMEOUT_MS = 8_000;

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

// Hook to fetch active deals. GET /deals returns { deals, nextCursor }
// (cursor-based pagination).
//
// Sort/search/field-filter (useDealSearchControls, applied client-side in
// Home/DealsScreen) only give correct results over the FULL active-deals
// set, not just whatever pages have been scrolled into so far - pass
// fullSet: true while any of those are active to fetch everything in one
// shot (same ceiling the old single-fetch endpoint used) instead of
// paginating. Both queries always exist (React Query's rules of hooks
// don't allow conditionally calling one); only one is enabled at a time.
export const useDeals = ({ fullSet = false, city } = {}) => {
  const pagedQuery = useInfiniteQuery({
    queryKey: ["deals", "paged", city || null],
    queryFn: async ({ pageParam }) => {
      const { data } = await apiClient.get("/deals", {
        params: {
          limit: DEALS_PAGE_SIZE,
          cursor: pageParam || undefined,
          city: city || undefined,
        },
      });
      return data;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? null,
    enabled: !fullSet,
    // Keep buyer dashboard close to real-time for admin approvals.
    staleTime: 2_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchInterval: POLLING_ENABLED && !fullSet ? 4_000 : false,
    refetchIntervalInBackground: false,
    placeholderData: (previous) => previous,
  });

  const fullQuery = useQuery({
    queryKey: ["deals", "full", city || null],
    queryFn: async () => {
      const { data } = await apiClient.get("/deals", {
        params: { limit: FULL_SET_LIMIT, city: city || undefined },
      });
      return data.deals;
    },
    enabled: fullSet,
    staleTime: 2_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchInterval: POLLING_ENABLED && fullSet ? 4_000 : false,
    refetchIntervalInBackground: false,
    placeholderData: (previous) => previous,
  });

  const pagedDeals = useMemo(
    () => pagedQuery.data?.pages.flatMap((page) => page.deals) ?? [],
    [pagedQuery.data],
  );

  if (fullSet) {
    return {
      data: fullQuery.data ?? [],
      isLoading: fullQuery.isLoading,
      isFetching: fullQuery.isFetching,
      refetch: fullQuery.refetch,
      fetchNextPage: () => {},
      hasNextPage: false,
      isFetchingNextPage: false,
    };
  }

  return {
    data: pagedDeals,
    isLoading: pagedQuery.isLoading,
    isFetching: pagedQuery.isFetching,
    refetch: pagedQuery.refetch,
    fetchNextPage: pagedQuery.fetchNextPage,
    hasNextPage: Boolean(pagedQuery.hasNextPage),
    isFetchingNextPage: pagedQuery.isFetchingNextPage,
  };
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
    refetchInterval: POLLING_ENABLED ? 8_000 : false,
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
    onSettled: () => {
      // Refresh the deals list (and this buyer's joined list) whether the
      // join succeeded or failed, so a retry/rejoin right after never reads
      // stale capacity/price for this deal.
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["joined-deals"] });
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["joined-deals"] });
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
