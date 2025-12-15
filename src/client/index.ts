/**
 * BareMCP — Client Module
 *
 * Exports HTTP client and error handling utilities.
 */

export { createHttpClient, storeApiPath } from "./http.js";
export type { HttpClient, HttpClientConfig } from "./http.js";

export {
  ApiError,
  ConfigError,
  StoreIdRequiredError,
  NotAuthenticatedError,
  PermissionDeniedError,
  formatError,
  formatSuccess,
  requireAuth,
} from "./errors.js";
export type { McpErrorResponse, McpSuccessResponse } from "./errors.js";

export * from "./types.js";
