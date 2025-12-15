/**
 * BareMCP — HTTP Client
 *
 * HTTP client for communicating with BareCommerceCore API.
 * Handles authentication, request formatting, and error handling.
 *
 * Supports runtime authentication for multi-tenant hosted deployments.
 */

import { ApiError, PermissionDeniedError } from "./errors.js";

// =============================================================================
// Configuration
// =============================================================================

/** Default request timeout in milliseconds (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Default maximum retry attempts */
const DEFAULT_MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
const BASE_RETRY_DELAY_MS = 1000;

/** Status codes that should trigger a retry */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function getRetryDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s, ...
  const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }
  // ApiError with retryable status code
  if (error instanceof ApiError && error.statusCode !== undefined && RETRYABLE_STATUS_CODES.has(error.statusCode)) {
    return true;
  }
  return false;
}

export interface HttpClientConfig {
  baseUrl: string;
  apiKey?: string; // Optional — can be set later via connect
  defaultStoreId?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Maximum retry attempts for transient failures (default: 3) */
  maxRetries?: number;
}

// =============================================================================
// HTTP Client Interface
// =============================================================================

export interface HttpClient {
  /**
   * GET request
   */
  get<T>(path: string, params?: Record<string, unknown>): Promise<T>;

  /**
   * POST request with JSON body
   */
  post<T>(path: string, body?: unknown): Promise<T>;

  /**
   * PATCH request with JSON body
   */
  patch<T>(path: string, body?: unknown): Promise<T>;

  /**
   * DELETE request
   */
  delete<T>(path: string): Promise<T>;

  /**
   * POST request with FormData (for file uploads)
   */
  upload<T>(path: string, formData: FormData): Promise<T>;

  /**
   * Get the default store ID
   */
  getDefaultStoreId(): string | undefined;

  /**
   * Set the default store ID
   */
  setDefaultStoreId(storeId: string): void;

  /**
   * Get the base URL
   */
  getBaseUrl(): string;

  /**
   * Check if the client is authenticated (has API key)
   */
  isAuthenticated(): boolean;

  /**
   * Set API key for authentication (used by connect tool)
   */
  setApiKey(apiKey: string): void;

  /**
   * Clear authentication (disconnect)
   */
  clearAuth(): void;

  /**
   * Set the base URL (used by connect tool for custom instances)
   */
  setBaseUrl(url: string): void;
}

// =============================================================================
// Error Response Type
// =============================================================================

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
  // New permission error format from API
  code?: string;
  message?: string;
  details?: {
    required?: string;
    userRole?: string;
    hint?: string;
  };
}

// =============================================================================
// HTTP Client Implementation
// =============================================================================

export function createHttpClient(config: HttpClientConfig): HttpClient {
  let apiKey = config.apiKey;
  let defaultStoreId = config.defaultStoreId;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;

  // Ensure base URL doesn't have trailing slash (mutable for runtime config)
  let normalizedBaseUrl = config.baseUrl.replace(/\/+$/, "");

  /**
   * Build headers for JSON requests
   */
  function getJsonHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }
    return headers;
  }

  /**
   * Build headers for upload requests (no Content-Type, let browser set it)
   */
  function getUploadHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }
    return headers;
  }

  /**
   * Parse error response from API
   * Handles both new flat format and legacy nested { error: {...} } format
   */
  async function parseErrorResponse(response: Response): Promise<Error> {
    try {
      const body = (await response.json()) as ApiErrorResponse;

      // Check for new permission error format (403 with FORBIDDEN code at top level)
      // Format: { code: "FORBIDDEN", message: "...", details: { required, userRole, hint } }
      if (response.status === 403 && body.code === "FORBIDDEN" && body.details?.required) {
        return new PermissionDeniedError(
          body.details.required,
          body.details.userRole || "unknown",
          body.details.hint
        );
      }

      // Handle nested error format: { error: { code, message, details } }
      if (body.error) {
        // Check if it's a permission error in nested format
        if (response.status === 403 && body.error.code === "FORBIDDEN") {
          const details = body.error.details as { required?: string; userRole?: string; hint?: string } | undefined;
          if (details?.required) {
            return new PermissionDeniedError(
              details.required,
              details.userRole || "unknown",
              details.hint
            );
          }
          // Fallback: try to extract permission info from message
          const match = body.error.message?.match(/Missing permission[:\s]+(\S+)/i);
          if (match && match[1]) {
            return new PermissionDeniedError(
              match[1],
              "unknown",
              body.error.message
            );
          }
        }

        return new ApiError(
          body.error.code || "UNKNOWN",
          body.error.message || response.statusText,
          body.error.details,
          response.status
        );
      }

      // Handle flat error format (code/message at top level, no permission details)
      if (body.code && body.message) {
        return new ApiError(
          body.code,
          body.message,
          body.details as Record<string, unknown> | undefined,
          response.status
        );
      }

      return new ApiError("UNKNOWN", response.statusText, undefined, response.status);
    } catch {
      return new ApiError("UNKNOWN", response.statusText, undefined, response.status);
    }
  }

  /**
   * Make a single request attempt to the API
   */
  async function singleRequest<T>(
    method: string,
    url: URL,
    options?: {
      body?: unknown;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers: options?.headers || getJsonHeaders(),
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError(
          "TIMEOUT",
          `Request timed out after ${timeoutMs}ms`,
          undefined,
          0
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle errors
    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true } as T;
    }

    // Parse JSON response
    return (await response.json()) as T;
  }

  /**
   * Make a request to the API with retry logic
   */
  async function request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, unknown>;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    // Build URL with query params
    const url = new URL(path, normalizedBaseUrl);

    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (Array.isArray(value)) {
            // Handle arrays (e.g., categoryIds)
            url.searchParams.append(key, value.join(","));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await singleRequest<T>(method, url, {
          body: options?.body,
          headers: options?.headers,
        });
      } catch (error) {
        lastError = error;

        // Don't retry if this is the last attempt or error isn't retryable
        if (attempt === maxRetries || !isRetryableError(error)) {
          throw error;
        }

        // Wait before retrying with exponential backoff
        const delay = getRetryDelay(attempt);
        console.error(
          `[BareMCP] Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`
        );
        await sleep(delay);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError;
  }

  return {
    get: <T>(path: string, params?: Record<string, unknown>) =>
      request<T>("GET", path, { params }),

    post: <T>(path: string, body?: unknown) =>
      request<T>("POST", path, { body }),

    patch: <T>(path: string, body?: unknown) =>
      request<T>("PATCH", path, { body }),

    delete: <T>(path: string) =>
      request<T>("DELETE", path),

    upload: async <T>(path: string, formData: FormData): Promise<T> => {
      const url = new URL(path, normalizedBaseUrl);

      // Create abort controller for timeout (use longer timeout for uploads)
      const uploadTimeoutMs = timeoutMs * 4; // 2 minutes for uploads
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), uploadTimeoutMs);

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: "POST",
          headers: getUploadHeaders(),
          body: formData,
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw new ApiError(
            "TIMEOUT",
            `Upload timed out after ${uploadTimeoutMs}ms`,
            undefined,
            0
          );
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw await parseErrorResponse(response);
      }

      return (await response.json()) as T;
    },

    getDefaultStoreId: () => defaultStoreId,

    setDefaultStoreId: (storeId: string) => {
      defaultStoreId = storeId;
    },

    getBaseUrl: () => normalizedBaseUrl,

    isAuthenticated: () => !!apiKey,

    setApiKey: (key: string) => {
      apiKey = key;
    },

    clearAuth: () => {
      apiKey = undefined;
      defaultStoreId = undefined;
    },

    setBaseUrl: (url: string) => {
      normalizedBaseUrl = url.replace(/\/+$/, "");
    },
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build store-scoped API path
 * 
 * Note: The new Hono API uses /stores/{storeId}/... paths (no /api prefix)
 */
export function storeApiPath(storeId: string, resource: string): string {
  return `/stores/${storeId}/${resource}`;
}
