export function parseLocalTime(input, now = new Date()) {
  if (!input || typeof input !== "string") {
    throw new Error("Expected a non-empty time string.");
  }

  const trimmed = input.trim();
  const today = formatDatePart(now);
  const normalized = trimmed.replace(/^today\b/i, today);
  const withSeparator = normalized.replace(" ", "T");

  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(withSeparator);
  const parsed = new Date(hasTimezone ? withSeparator : withSeparator);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Could not parse time: ${input}`);
  }

  return parsed;
}

export function formatDatePart(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
