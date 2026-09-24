import { englishT } from "../i18n/translator";

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value === "object") {
    const seconds = value.seconds ?? value._seconds;
    const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;
    if (typeof seconds === "number") {
      const ms = seconds * 1000 + Math.floor(nanoseconds / 1e6);
      const parsed = new Date(ms);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    const parsed = new Date(ms);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) {
        const ms = numeric < 1e12 ? numeric * 1000 : numeric;
        const parsed = new Date(ms);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
    }

    const normalized = trimmed.replace(
      /UTC([+-])(\d{1,2})(?::?(\d{2}))?/i,
      (_, sign, hours, minutes) =>
        `GMT${sign}${String(hours).padStart(2, "0")}:${String(
          minutes || "00",
        ).padStart(2, "0")}`,
    );
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// `language` is an app language code ("hi", ...); month names follow it.
export function formatDate(date, language = "en") {
  if (!date) return "";
  return date.toLocaleDateString(`${language}-IN`, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatExpiryLabel(date, nowMs = Date.now(), t = englishT, language = "en") {
  if (!date) return null;
  const ts = date.getTime();
  const dateLabel = formatDate(date, language);
  return ts <= nowMs
    ? t("dates.expiredOn", { date: dateLabel })
    : t("dates.expiresOn", { date: dateLabel });
}

export function formatCountdown(ms, t = englishT) {
  if (ms <= 0) return t("status.expired");
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return t("dates.endsIn", {
      time: `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`,
    });
  }
  return t("dates.endsIn", {
    time: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
  });
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}
