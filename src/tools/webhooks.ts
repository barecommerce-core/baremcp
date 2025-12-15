/**
 * BareMCP — Webhook Tools
 *
 * Tools for managing webhooks:
 * - list_webhooks
 * - create_webhook
 * - update_webhook
 * - delete_webhook
 */

import { z } from "zod";
import type { HttpClient } from "../client/index.js";
import {
  formatError,
  formatSuccess,
  StoreIdRequiredError,
  storeApiPath,
} from "../client/index.js";
import type { Webhook, ListResponse, SingleResponse } from "../client/index.js";
import type { ToolDefinition } from "./types.js";

// =============================================================================
// Validation Schemas
// =============================================================================

const webhookEventSchema = z.enum([
  "product.created",
  "product.updated",
  "product.deleted",
  "order.created",
  "order.updated",
  "order.paid",
  "order.fulfilled",
  "order.cancelled",
  "order.refunded",
  "customer.created",
  "customer.updated",
  "customer.deleted",
  "category.created",
  "category.updated",
  "category.deleted",
  "page.created",
  "page.updated",
  "page.deleted",
  "media.created",
  "media.deleted",
]);

/**
 * Validate webhook URL is safe (HTTPS only, no internal addresses)
 */
const safeWebhookUrl = z.string().url().max(2048).refine(
  (url) => {
    try {
      const parsed = new URL(url);

      // Must be HTTPS
      if (parsed.protocol !== "https:") {
        return false;
      }

      // Block localhost and common local addresses
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        hostname === "0.0.0.0" ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal")
      ) {
        return false;
      }

      // Block private IP ranges (basic check)
      // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
      const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
      if (ipv4Match) {
        const parts = ipv4Match.slice(1).map(Number);
        const a = parts[0];
        const b = parts[1];
        if (
          a === 10 ||
          a === 127 ||
          (a === 172 && b !== undefined && b >= 16 && b <= 31) ||
          (a === 192 && b === 168) ||
          (a === 169 && b === 254) // Link-local
        ) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  },
  {
    message: "Webhook URL must be HTTPS and cannot point to localhost or private networks",
  }
);

const listWebhooksSchema = z.object({
  storeId: z.string().uuid().optional(),
  event: webhookEventSchema.optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

const createWebhookSchema = z.object({
  storeId: z.string().uuid().optional(),
  url: safeWebhookUrl,
  events: z.array(webhookEventSchema).min(1).max(20),
  secret: z.string().min(16).max(255).optional(),
  isActive: z.boolean().default(true),
  description: z.string().max(500).optional(),
});

const updateWebhookSchema = z.object({
  storeId: z.string().uuid().optional(),
  webhookId: z.string().uuid(),
  url: safeWebhookUrl.optional(),
  events: z.array(webhookEventSchema).min(1).max(20).optional(),
  secret: z.string().min(16).max(255).optional(),
  isActive: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

const deleteWebhookSchema = z.object({
  storeId: z.string().uuid().optional(),
  webhookId: z.string().uuid(),
});

// =============================================================================
// Helper Functions
// =============================================================================

function resolveStoreId(
  providedStoreId: string | undefined,
  client: HttpClient
): string {
  const storeId = providedStoreId || client.getDefaultStoreId();
  if (!storeId) {
    throw new StoreIdRequiredError();
  }
  return storeId;
}

/**
 * Format webhook for summary view
 */
function formatWebhookSummary(webhook: Webhook) {
  return {
    id: webhook.id,
    url: webhook.url,
    events: webhook.events,
    isActive: webhook.isActive,
    description: webhook.description,
    lastTriggeredAt: webhook.lastTriggeredAt,
    createdAt: webhook.createdAt,
  };
}

/**
 * Format full webhook for response
 */
function formatWebhookFull(webhook: Webhook) {
  return {
    id: webhook.id,
    storeId: webhook.storeId,
    url: webhook.url,
    events: webhook.events,
    isActive: webhook.isActive,
    description: webhook.description,
    secret: webhook.secret ? "********" : null, // Mask secret
    lastTriggeredAt: webhook.lastTriggeredAt,
    failureCount: webhook.failureCount,
    createdAt: webhook.createdAt,
    updatedAt: webhook.updatedAt,
  };
}

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * Create all webhook management tools
 */
export function createWebhookTools(client: HttpClient): ToolDefinition[] {
  return [
    // =========================================================================
    // list_webhooks
    // =========================================================================
    {
      name: "list_webhooks",
      description:
        "List webhooks configured for your store. Filter by event type or active status.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          event: {
            type: "string",
            enum: [
              "product.created", "product.updated", "product.deleted",
              "order.created", "order.updated", "order.paid", "order.fulfilled", "order.cancelled", "order.refunded",
              "customer.created", "customer.updated", "customer.deleted",
              "category.created", "category.updated", "category.deleted",
              "page.created", "page.updated", "page.deleted",
              "media.created", "media.deleted",
            ],
            description: "Filter by event type",
          },
          isActive: {
            type: "boolean",
            description: "Filter by active status",
          },
          limit: {
            type: "integer",
            default: 50,
            minimum: 1,
            maximum: 100,
            description: "Number of webhooks to return",
          },
          offset: {
            type: "integer",
            default: 0,
            minimum: 0,
            description: "Number of webhooks to skip",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = listWebhooksSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const params: Record<string, unknown> = {
            limit: input.limit,
            offset: input.offset,
          };

          if (input.event) params.event = input.event;
          if (input.isActive !== undefined) params.isActive = input.isActive;

          const response = await client.get<ListResponse<Webhook>>(
            storeApiPath(storeId, "webhooks"),
            params
          );

          return formatSuccess({
            items: response.items.map(formatWebhookSummary),
            total: response.pagination.total,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // create_webhook
    // =========================================================================
    {
      name: "create_webhook",
      description:
        "Create a new webhook to receive event notifications. Webhooks will POST JSON payloads to your URL when events occur.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          url: {
            type: "string",
            description: "HTTPS URL to receive webhook payloads (required)",
          },
          events: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "product.created", "product.updated", "product.deleted",
                "order.created", "order.updated", "order.paid", "order.fulfilled", "order.cancelled", "order.refunded",
                "customer.created", "customer.updated", "customer.deleted",
                "category.created", "category.updated", "category.deleted",
                "page.created", "page.updated", "page.deleted",
                "media.created", "media.deleted",
              ],
            },
            description: "Array of events to subscribe to (required, 1-20 events)",
          },
          secret: {
            type: "string",
            description: "Shared secret for HMAC signature verification (min 16 chars, recommended)",
          },
          isActive: {
            type: "boolean",
            default: true,
            description: "Whether the webhook is active",
          },
          description: {
            type: "string",
            description: "Description for this webhook",
          },
        },
        required: ["url", "events"],
      },
      handler: async (args) => {
        try {
          const input = createWebhookSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const { storeId: _, ...webhookData } = input;

          const response = await client.post<SingleResponse<Webhook>>(
            storeApiPath(storeId, "webhooks"),
            webhookData
          );

          return formatSuccess({
            message: "Webhook created successfully",
            webhook: formatWebhookFull(response.item),
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // update_webhook
    // =========================================================================
    {
      name: "update_webhook",
      description:
        "Update an existing webhook's URL, events, active status, or secret.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          webhookId: {
            type: "string",
            description: "Webhook UUID (required)",
          },
          url: {
            type: "string",
            description: "HTTPS URL to receive webhook payloads",
          },
          events: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "product.created", "product.updated", "product.deleted",
                "order.created", "order.updated", "order.paid", "order.fulfilled", "order.cancelled", "order.refunded",
                "customer.created", "customer.updated", "customer.deleted",
                "category.created", "category.updated", "category.deleted",
                "page.created", "page.updated", "page.deleted",
                "media.created", "media.deleted",
              ],
            },
            description: "Array of events to subscribe to",
          },
          secret: {
            type: "string",
            description: "New shared secret for HMAC signature verification",
          },
          isActive: {
            type: "boolean",
            description: "Whether the webhook is active",
          },
          description: {
            type: "string",
            description: "Description for this webhook",
          },
        },
        required: ["webhookId"],
      },
      handler: async (args) => {
        try {
          const input = updateWebhookSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const { storeId: _, webhookId, ...updateData } = input;

          // Remove undefined values
          const payload = Object.fromEntries(
            Object.entries(updateData).filter(([, v]) => v !== undefined)
          );

          if (Object.keys(payload).length === 0) {
            return formatError(
              new Error("No fields to update. Provide at least one field.")
            );
          }

          const response = await client.patch<SingleResponse<Webhook>>(
            storeApiPath(storeId, `webhooks/${webhookId}`),
            payload
          );

          return formatSuccess({
            message: "Webhook updated successfully",
            webhook: formatWebhookFull(response.item),
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // delete_webhook
    // =========================================================================
    {
      name: "delete_webhook",
      description: "Delete a webhook. The endpoint will no longer receive event notifications.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          webhookId: {
            type: "string",
            description: "Webhook UUID to delete",
          },
        },
        required: ["webhookId"],
      },
      handler: async (args) => {
        try {
          const input = deleteWebhookSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          await client.delete(
            storeApiPath(storeId, `webhooks/${input.webhookId}`)
          );

          return formatSuccess({
            deleted: true,
            webhookId: input.webhookId,
            message: "Webhook deleted successfully",
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },
  ];
}
