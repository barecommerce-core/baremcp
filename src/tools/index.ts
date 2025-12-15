/**
 * BareMCP — Tools Registry
 *
 * Registers all MCP tools with the server.
 * Automatically adds authentication checks for tools that require it.
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { HttpClient } from "../client/index.js";
import { NotAuthenticatedError, formatError } from "../client/index.js";
import { createSessionTools } from "./session.js";
import { createStoreTools } from "./store.js";
import { createProductTools } from "./products.js";
import { createOrderTools } from "./orders.js";
import { createCustomerTools } from "./customers.js";
import { createAuditTools } from "./audit.js";
import { createCategoryTools } from "./categories.js";
import { createPageTools } from "./pages.js";
import { createMediaTools } from "./media.js";
import { createWebhookTools } from "./webhooks.js";
import type { ToolDefinition, ToolResponse } from "./types.js";

// Tools that don't require authentication
const PUBLIC_TOOLS = new Set([
  "connect",
  "disconnect",
  "status",
  "diagnostics",
]);

/**
 * Deprecated tools with their replacements
 * Format: { toolName: { replacement: "new_tool_name", removeIn: "2.0" } }
 */
const DEPRECATED_TOOLS: Record<string, { replacement: string; removeIn: string }> = {
  // Example: "old_tool": { replacement: "new_tool", removeIn: "2.0" }
};

/**
 * Emit deprecation warning for a tool
 */
function emitDeprecationWarning(toolName: string): void {
  const deprecation = DEPRECATED_TOOLS[toolName];
  if (deprecation) {
    console.error(
      `[BareMCP] [DEPRECATED] ${toolName} will be removed in v${deprecation.removeIn}. ` +
        `Use ${deprecation.replacement} instead.`
    );
  }
}

/**
 * Check if a tool is deprecated
 */
export function isToolDeprecated(toolName: string): boolean {
  return toolName in DEPRECATED_TOOLS;
}

/**
 * Get deprecation info for a tool
 */
export function getDeprecationInfo(
  toolName: string
): { replacement: string; removeIn: string } | null {
  return DEPRECATED_TOOLS[toolName] || null;
}

/**
 * Wrap a tool handler with authentication check
 */
function withAuth(
  client: HttpClient,
  toolName: string,
  handler: (args: Record<string, unknown>) => Promise<ToolResponse>
): (args: Record<string, unknown>) => Promise<ToolResponse> {
  // Public tools don't need auth
  if (PUBLIC_TOOLS.has(toolName)) {
    return handler;
  }

  // Wrap with auth check
  return async (args) => {
    if (!client.isAuthenticated()) {
      return formatError(new NotAuthenticatedError());
    }
    return handler(args);
  };
}

/**
 * Wrap a tool handler with deprecation warning
 */
function withDeprecationWarning(
  toolName: string,
  handler: (args: Record<string, unknown>) => Promise<ToolResponse>
): (args: Record<string, unknown>) => Promise<ToolResponse> {
  if (!isToolDeprecated(toolName)) {
    return handler;
  }

  return async (args) => {
    emitDeprecationWarning(toolName);
    return handler(args);
  };
}

/**
 * Get all tool definitions
 */
export function getAllTools(client: HttpClient): ToolDefinition[] {
  const allTools = [
    // Session tools (no auth required)
    ...createSessionTools(client),
    // Phase 1: Store & Products
    ...createStoreTools(client),
    ...createProductTools(client),
    // Phase 2: Orders, Customers, Audit
    ...createOrderTools(client),
    ...createCustomerTools(client),
    ...createAuditTools(client),
    // Phase 3: Categories, Pages, Media, Webhooks
    ...createCategoryTools(client),
    ...createPageTools(client),
    ...createMediaTools(client),
    ...createWebhookTools(client),
  ];

  // Wrap handlers with auth check and deprecation warning
  return allTools.map((tool) => ({
    ...tool,
    handler: withDeprecationWarning(
      tool.name,
      withAuth(client, tool.name, tool.handler)
    ),
  }));
}

/**
 * Register all tools with the MCP server
 */
export function registerTools(server: Server, client: HttpClient): void {
  const tools = getAllTools(client);

  // Create a map for quick handler lookup
  const toolHandlers = new Map(tools.map((t) => [t.name, t.handler]));

  // Register tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  // Register tools/call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const handler = toolHandlers.get(name);
    if (!handler) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              code: "TOOL_NOT_FOUND",
              message: `Unknown tool: ${name}`,
            }),
          },
        ],
      };
    }

    const result = await handler(args || {});
    return {
      ...result,
      content: result.content.map((c) => ({
        ...c,
        type: "text" as const,
      })),
    };
  });

  console.error(`[BareMCP] Registered ${tools.length} tools (${PUBLIC_TOOLS.size} public, ${tools.length - PUBLIC_TOOLS.size} require auth)`);
}

// Export types
export type { ToolDefinition } from "./types.js";
