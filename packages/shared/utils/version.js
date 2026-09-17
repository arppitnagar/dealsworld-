function parseVersionParts(version) {
  return String(version || "0")
    .split(".")
    .map((part) => {
      const numeric = parseInt(part, 10);
      return Number.isFinite(numeric) ? numeric : 0;
    });
}

// Compares dotted numeric versions ("1.2.10" > "1.2.9"). Returns -1, 0, or 1.
export function compareVersions(a, b) {
  const partsA = parseVersionParts(a);
  const partsB = parseVersionParts(b);
  const length = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export function isVersionBelow(currentVersion, minVersion) {
  if (!minVersion) return false;
  if (!currentVersion) return false;
  return compareVersions(currentVersion, minVersion) < 0;
}
