import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/client";
import { isUnsuccessfulDeal } from "../utils/dealCategories";
import { POLLING_ENABLED } from "@dealsworld/shared";

// Shared by list screens (Home/Deals/Search) to turn a useMyDeliveries() map
// entry into the DealCard `deliveryBadge` prop.
export function getDeliveryBadge(dealId, deliveries, theme) {
  const entry = dealId ? deliveries?.[dealId] : null;
  if (!entry?.deliveryStatus) return null;
  if (entry.deliveryStatus === "delivered") {
    return { label: "Delivered", color: theme.colors.success };
  }
  if (entry.deliveryStatus === "in_transit") {
    return { label: "In Transit", color: theme.colors.primary };
  }
  if (entry.deliveryStatus === "ready_for_pickup") {
    return { label: "Ready for Pickup", color: theme.colors.primary };
  }
  return null;
}

// Same as getDeliveryBadge, but for "My Orders" (and anywhere a full deal
// object is on hand): a campaign that ended without reaching its minimum
// group size never ships, so it gets its own distinct badge instead of
// silently showing no badge at all (which reads as "still pending"). Also
// covers a deal that only moved to My Orders because the buyer paid - it
// won't have a deliveryStatus yet (that only starts once dispatched), so it
// falls back to a payment badge instead of showing nothing.
export function getOrderBadge(deal, deliveries, theme) {
  if (isUnsuccessfulDeal(deal)) {
    return { label: "Unsuccessful", color: theme.colors.error };
  }
  const deliveryBadge = getDeliveryBadge(deal?.id, deliveries, theme);
  if (deliveryBadge) return deliveryBadge;

  const paymentStatus = deal?.id ? deliveries?.[deal.id]?.paymentStatus : null;
  if (paymentStatus === "paid_blocked") {
    return { label: "Payment Held", color: theme.colors.primary };
  }
  if (paymentStatus === "released_to_seller") {
    return { label: "Payment Released", color: theme.colors.success };
  }
  if (paymentStatus === "refunded_to_buyer") {
    return { label: "Refunded", color: theme.colors.textMuted };
  }
  return null;
}

// A buyer's own delivery/OTP status for one deal. Only polls while there's
// something that could still change (in transit, awaiting confirmation) —
// once delivered or never dispatched, there's nothing left to refetch for.
export const useMyDelivery = (dealId) => {
  return useQuery({
    queryKey: ["my-delivery", dealId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/deals/${dealId}/my-delivery`);
      return data;
    },
    enabled: Boolean(dealId),
    refetchInterval: (query) =>
      POLLING_ENABLED && query.state.data?.deliveryStatus === "in_transit"
        ? 8_000
        : false,
  });
};

export const usePayForDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId) => {
      if (!dealId) throw new Error("dealId is required");
      const { data } = await apiClient.post(`/deals/${dealId}/pay`);
      return data;
    },
    onSuccess: (_data, dealId) => {
      queryClient.invalidateQueries({ queryKey: ["my-delivery", dealId] });
      // Moves the deal from Joined to My Orders on the list screens right
      // away, instead of waiting for the next background poll.
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
    },
  });
};

export const useConfirmDelivery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealId, otp }) => {
      if (!dealId) throw new Error("dealId is required");
      const { data } = await apiClient.post(`/deals/${dealId}/confirm-delivery`, { otp });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-delivery", variables.dealId] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
    },
  });
};

// Delivery-status map across every deal the buyer has joined, keyed by
// dealId — used for list-screen badges so cards don't each fire their own
// request.
export const useMyDeliveries = () => {
  return useQuery({
    queryKey: ["my-deliveries"],
    queryFn: async () => {
      const { data } = await apiClient.get("/deals/my-deliveries");
      return data;
    },
    staleTime: 5_000,
    refetchInterval: POLLING_ENABLED ? 8_000 : false,
    refetchIntervalInBackground: false,
  });
};
