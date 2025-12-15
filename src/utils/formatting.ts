/**
 * BareMCP — Formatting Utilities
 *
 * Helpers for formatting data in responses.
 */

// =============================================================================
// Date Formatting
// =============================================================================

/**
 * Format ISO date string to human-readable format
 */
export function formatDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/**
 * Format ISO date string to include time
 */
export function formatDateTime(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  try {
    const date = new Date(isoDate);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoDate;
  }
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    return formatDate(isoDate);
  } catch {
    return isoDate;
  }
}

// =============================================================================
// Currency Formatting
// =============================================================================

/**
 * Format price with currency symbol
 */
export function formatPrice(
  amount: string | number | null | undefined,
  currency: string = "USD"
): string {
  if (amount === null || amount === undefined) return "N/A";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "N/A";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
}

/**
 * Format number with thousands separators
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0";
  return new Intl.NumberFormat("en-US").format(num);
}

// =============================================================================
// Text Formatting
// =============================================================================

/**
 * Truncate text to max length with ellipsis
 */
export function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string | null | undefined): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert status to display text
 */
export function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => capitalize(word))
    .join(" ");
}

// =============================================================================
// List Formatting
// =============================================================================

/**
 * Format array as comma-separated list
 */
export function formatList(items: string[] | null | undefined): string {
  if (!items || items.length === 0) return "None";
  return items.join(", ");
}

/**
 * Format count with label
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  const label = count === 1 ? singular : (plural || singular + "s");
  return `${formatNumber(count)} ${label}`;
}

// =============================================================================
// Object Formatting
// =============================================================================

/**
 * Remove undefined/null values from object
 */
export function cleanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null)
  ) as Partial<T>;
}

/**
 * Pick specific keys from object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  return keys.reduce((acc, key) => {
    if (key in obj) {
      acc[key] = obj[key];
    }
    return acc;
  }, {} as Pick<T, K>);
}

/**
 * Omit specific keys from object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}
