import { useEffect, useRef, useState } from "react";

// Re-renders a notification list into `language`, no matter what language
// was active when each one was sent. A notification's title/body (from
// pushNotification() in apps/backend/src/lib.js) are only what was rendered
// at send time; messageKey + messageVars are the raw ingredients needed to
// render it again in a different language, via POST /notifications/render.
//
// Notifications sent before messageKey existed have no raw data to re-render
// from and keep showing their original (frozen) text.
//
// `apiClient` is the calling app's own axios instance (apps/*/src/api/client.js)
// - injected rather than imported here since buyer and seller each have their
// own baseURL/auth wiring.
export default function useLocalizedNotifications(notifications, language, apiClient) {
  const [rendered, setRendered] = useState({});
  const cacheRef = useRef(rendered);
  cacheRef.current = rendered;

  useEffect(() => {
    const pending = notifications.filter(
      (item) => item?.id && item?.messageKey && !cacheRef.current[`${item.id}|${language}`],
    );
    if (!pending.length || !apiClient) return undefined;

    let cancelled = false;
    apiClient
      .post("/notifications/render", {
        lang: language,
        items: pending.map((item) => ({
          id: item.id,
          messageKey: item.messageKey,
          vars: item.messageVars || {},
          dealId: item.dealId || null,
        })),
      })
      .then((response) => {
        if (cancelled) return;
        const items = response?.data?.items || {};
        if (!Object.keys(items).length) return;
        setRendered((prev) => {
          const next = { ...prev };
          Object.entries(items).forEach(([id, value]) => {
            next[`${id}|${language}`] = value;
          });
          return next;
        });
      })
      .catch(() => {
        // Offline or backend hiccup - the list just keeps its current text.
      });

    return () => {
      cancelled = true;
    };
  }, [notifications, language, apiClient]);

  return notifications.map((item) => {
    const hit = item?.id ? rendered[`${item.id}|${language}`] : null;
    return hit ? { ...item, title: hit.title, body: hit.body } : item;
  });
}
