/**
 * BareMCP — Error Handling
 *
 * Provides consistent error handling across all tools.
 */

import { z } from "zod";

/**
 * API Error from BareCommerceCore
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
    public statusCode?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Configuration error (missing env vars, etc.)
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Store ID required but not provided
 */
export class StoreIdRequiredError extends Error {
  constructor() {
    super(
      "storeId is required. Either provide it as a parameter or use the connect tool with a default store."
    );
    this.name = "StoreIdRequiredError";
  }
}

/**
 * Not authenticated — must call connect first
 */
export class NotAuthenticatedError extends Error {
  constructor() {
    super(
      "Not connected to a store. Use the 'connect' tool first with your API key to authenticate."
    );
    this.name = "NotAuthenticatedError";
  }
}

/**
 * Permission denied — user's role doesn't have required permission
 */
export class PermissionDeniedError extends Error {
  constructor(
    public permission: string,
    public userRole: string,
    public hint?: string
  ) {
    super(
      `Permission denied: ${permission}. Your role (${userRole}) doesn't have this permission.`
    );
    this.name = "PermissionDeniedError";
  }
}

/**
 * MCP error response format
 */
export interface McpErrorResponse {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
}

/**
 * MCP success response format
 */
export interface McpSuccessResponse {
  content: Array<{ type: "text"; text: string }>;
}

/**
 * Format any error into MCP error response
 */
export function formatError(error: unknown): McpErrorResponse {
  if (error instanceof ApiError) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              code: error.code,
              message: error.message,
              details: error.details,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (error instanceof z.ZodError) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              code: "INVALID_INPUT",
              message: "Validation failed",
              details: error.errors.map((e) => ({
                path: e.path.join("."),
                message: e.message,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (error instanceof NotAuthenticatedError) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              code: "NOT_AUTHENTICATED",
              message: error.message,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (error instanceof PermissionDeniedError) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              code: "PERMISSION_DENIED",
              message: error.message,
              permission: error.permission,
              yourRole: error.userRole,
              hint: error.hint || "Contact a store admin for elevated permissions.",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (error instanceof StoreIdRequiredError) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              code: "STORE_ID_REQUIRED",
              message: error.message,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (error instanceof ConfigError) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              code: "CONFIG_ERROR",
              message: error.message,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Generic error - sanitize message to prevent information disclosure
  let safeMessage = "An unexpected error occurred";

  if (error instanceof Error) {
    // Allow through known safe error types
    const errorMessage = error.message;

    // Block potential sensitive patterns
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /authorization/i,
      /bearer/i,
      /credential/i,
      /connection.*refused/i,
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
      /database/i,
      /sql/i,
      /query/i,
      /internal.*error/i,
    ];

    const containsSensitive = sensitivePatterns.some(pattern =>
      pattern.test(errorMessage)
    );

    if (!containsSensitive && errorMessage.length < 500) {
      safeMessage = errorMessage;
    } else {
      // Log the actual error for debugging but return sanitized message
      console.error("[BareMCP] Sanitized error:", errorMessage);
    }
  }

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            code: "UNKNOWN_ERROR",
            message: safeMessage,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Format success response
 */
export function formatSuccess(data: unknown): McpSuccessResponse {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ success: true, data }, null, 2),
      },
    ],
  };
}

/**
 * Check if client is authenticated, throw if not
 */
export function requireAuth(client: { isAuthenticated(): boolean }): void {
  if (!client.isAuthenticated()) {
    throw new NotAuthenticatedError();
  }
}
