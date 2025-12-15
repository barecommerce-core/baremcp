/**
 * BareMCP — Resources
 *
 * MCP Resources provide read-only data that LLMs can access.
 * Resources are identified by URIs and return structured content.
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { HttpClient } from "../client/index.js";
import type { Store } from "../client/index.js";

// =============================================================================
// Resource Definitions
// =============================================================================

interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: () => Promise<string>;
}

/**
 * Create all resource definitions
 */
export function createResources(client: HttpClient): ResourceDefinition[] {
  const storeId = client.getDefaultStoreId();

  return [
    // =========================================================================
    // store://config
    // =========================================================================
    {
      uri: "store://config",
      name: "Store Configuration",
      description:
        "Current store settings including name, currency, timezone, and contact info",
      mimeType: "application/json",
      handler: async () => {
        if (!storeId) {
          return JSON.stringify({
            error: "No default store configured",
            hint: "Set BARECOMMERCE_DEFAULT_STORE_ID in your environment",
          });
        }

        try {
          const store = await client.get<{ item: Store }>(
            `/stores/${storeId}`
          );

          return JSON.stringify(
            {
              id: store.item.id,
              name: store.item.name,
              domain: store.item.domain,
              status: store.item.status,
              currency: store.item.currency,
              timezone: store.item.timezone,
              weightUnit: store.item.weightUnit,
              contact: {
                email: store.item.shopEmail,
                phone: store.item.shopPhone,
              },
              business: {
                address1: store.item.businessAddress1,
                address2: store.item.businessAddress2,
                city: store.item.businessCity,
                region: store.item.businessRegion,
                zip: store.item.businessZip,
                country: store.item.businessCountry,
              },
              orderNumberPrefix: store.item.orderNumberPrefix,
            },
            null,
            2
          );
        } catch (error) {
          return JSON.stringify({
            error: "Failed to fetch store config",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    },

    // =========================================================================
    // store://schema
    // =========================================================================
    {
      uri: "store://schema",
      name: "Store Schema",
      description:
        "Product attribute definitions and metafield schemas configured for this store",
      mimeType: "application/json",
      handler: async () => {
        if (!storeId) {
          return JSON.stringify({
            error: "No default store configured",
          });
        }

        try {
          const store = await client.get<{ item: Store }>(
            `/stores/${storeId}`
          );

          return JSON.stringify(
            {
              attributeSchema: store.item.attributeSchema || {},
              metafieldSchema: store.item.metafieldSchema || {},
              description: {
                attributeSchema:
                  "Defines product variant attributes (e.g., size, color). Keys are attribute names, values contain label info.",
                metafieldSchema:
                  "Defines custom metafields for products. Keys are field names, values contain type info.",
              },
            },
            null,
            2
          );
        } catch (error) {
          return JSON.stringify({
            error: "Failed to fetch store schema",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    },

    // =========================================================================
    // store://categories
    // =========================================================================
    {
      uri: "store://categories",
      name: "Category Tree",
      description: "Hierarchical list of all product categories in the store",
      mimeType: "application/json",
      handler: async () => {
        if (!storeId) {
          return JSON.stringify({
            error: "No default store configured",
          });
        }

        try {
          const response = await client.get<{
            items: Array<{
              id: string;
              name: string;
              slug: string;
              parentId: string | null;
              status: string;
              productCount: number;
            }>;
            pagination: { total: number };
          }>(`/stores/${storeId}/categories`, {
            limit: 200,
            sortBy: "sortOrder",
            sortOrder: "asc",
          });

          // Build tree structure
          const categories = response.items;
          const rootCategories = categories.filter((c) => !c.parentId);
          const childMap = new Map<string, typeof categories>();

          categories.forEach((c) => {
            if (c.parentId) {
              const children = childMap.get(c.parentId) || [];
              children.push(c);
              childMap.set(c.parentId, children);
            }
          });

          const buildTree = (
            cat: (typeof categories)[0]
          ): Record<string, unknown> => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            status: cat.status,
            productCount: cat.productCount,
            children: (childMap.get(cat.id) || []).map(buildTree),
          });

          return JSON.stringify(
            {
              total: response.pagination.total,
              tree: rootCategories.map(buildTree),
            },
            null,
            2
          );
        } catch (error) {
          return JSON.stringify({
            error: "Failed to fetch categories",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    },
  ];
}

/**
 * Register resources with the MCP server
 */
export function registerResources(server: Server, client: HttpClient): void {
  const resources = createResources(client);

  // Create a map for quick handler lookup
  const resourceHandlers = new Map(resources.map((r) => [r.uri, r.handler]));

  // Register resources/list handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: resources.map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    })),
  }));

  // Register resources/read handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    const handler = resourceHandlers.get(uri);
    if (!handler) {
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              error: "Resource not found",
              uri,
            }),
          },
        ],
      };
    }

    const content = await handler();
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: content,
        },
      ],
    };
  });

  console.error(`[BareMCP] Registered ${resources.length} resources`);
}
