import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/client";

const SEARCH_RESULT_LIMIT = 50;
// Without this, every keystroke fires its own network request straight
// through to the backend and on to Typesense - typing "pizza" would send 5
// separate searches instead of 1. Waiting for a short pause in typing
// before actually searching cuts that down to (usually) one request.
const SEARCH_DEBOUNCE_MS = 350;

// Server-side search via Typesense (apps/backend/src/routes/search.js) -
// replaces client-side buildSearchHaystack filtering, which had to walk
// every field of every fetched deal and only ever searched whatever page
// happened to be loaded. Only enabled while actually searching; SearchScreen
// falls back to the normal browse feed (useDeals()) otherwise.
export function useDealSearch(query, { enabled = true } = {}) {
  const trimmed = String(query || "").trim();
  const [debounced, setDebounced] = useState(trimmed);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [trimmed]);

  return useQuery({
    queryKey: ["deals-search", debounced],
    queryFn: async () => {
      const { data } = await apiClient.get("/deals/search", {
        params: { q: debounced, limit: SEARCH_RESULT_LIMIT },
      });
      return data;
    },
    enabled: enabled && debounced.length > 0,
    staleTime: 2_000,
    gcTime: 60_000,
    placeholderData: (previous) => previous,
  });
}
