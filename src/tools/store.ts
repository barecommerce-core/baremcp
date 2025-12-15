/**
 * BareMCP — Store Tools
 *
 * Tools for managing stores:
 * - list_stores
 * - get_store
 * - update_store
 */

import { z } from "zod";
import type { HttpClient } from "../client/index.js";
import {
  formatError,
  formatSuccess,
  StoreIdRequiredError,
  storeApiPath,
} from "../client/index.js";
import type { Store, ListResponse, SingleResponse } from "../client/index.js";
import type { ToolDefinition } from "./types.js";

// =============================================================================
// Validation Schemas
// =============================================================================

const getStoreSchema = z.object({
  storeId: z.string().uuid().optional(),
});

const updateStoreSchema = z.object({
  storeId: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  slug: z.string().max(255).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  currency: z.string().length(3).optional(),
  timezone: z.string().max(100).optional(),
  status: z.enum(["active", "suspended"]).optional(),
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

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * Create all store management tools
 */
export function createStoreTools(client: HttpClient): ToolDefinition[] {
  return [
    // =========================================================================
    // list_stores
    // =========================================================================
    {
      name: "list_stores",
      description:
        "List all stores accessible to the authenticated merchant. Use this to see available stores and get store IDs.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async () => {
        try {
          const response = await client.get<ListResponse<Store>>("/stores");

          return formatSuccess({
            items: response.items.map((store) => ({
              id: store.id,
              name: store.name,
              domain: store.domain,
              currency: store.currency,
              status: store.status,
              createdAt: store.createdAt,
              _count: store._count,
            })),
            total: response.pagination.total,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // get_store
    // =========================================================================
    {
      name: "get_store",
      description:
        "Get detailed information about a specific store including settings, configuration, and resource counts.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description:
              "Store UUID. If not provided, uses the default store.",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = getStoreSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const response = await client.get<SingleResponse<Store>>(
            `/stores/${storeId}`
          );

          const store = response.item;

          return formatSuccess({
            id: store.id,
            name: store.name,
            domain: store.domain,
            status: store.status,
            currency: store.currency,
            timezone: store.timezone,
            shopDescription: store.shopDescription,
            _count: store._count,
            createdAt: store.createdAt,
            updatedAt: store.updatedAt,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // update_store
    // =========================================================================
    {
      name: "update_store",
      description:
        "Update store settings such as name, currency, timezone, and description.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          name: {
            type: "string",
            description: "Store name",
          },
          slug: {
            type: "string",
            description: "Store slug (used as domain)",
          },
          description: {
            type: "string",
            description: "Store description",
          },
          currency: {
            type: "string",
            description: "Currency code (e.g., USD, EUR, GBP)",
          },
          timezone: {
            type: "string",
            description: "Timezone (e.g., America/New_York, Europe/London)",
          },
          status: {
            type: "string",
            enum: ["active", "suspended"],
            description: "Store status",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = updateStoreSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          // Build update payload (exclude storeId)
          const { storeId: _, ...updateData } = input;

          // Remove undefined values
          const payload = Object.fromEntries(
            Object.entries(updateData).filter(([, v]) => v !== undefined)
          );

          if (Object.keys(payload).length === 0) {
            return formatError(
              new Error("No fields to update. Provide at least one field.")
            );
          }

          const response = await client.patch<SingleResponse<Store>>(
            `/stores/${storeId}`,
            payload
          );

          return formatSuccess({
            message: "Store updated successfully",
            store: {
              id: response.item.id,
              name: response.item.name,
              updatedAt: response.item.updatedAt,
            },
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },
  ];
}
