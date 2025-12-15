/**
 * BareMCP — Page Tools
 *
 * Tools for managing CMS pages:
 * - list_pages
 * - get_page
 * - create_page
 * - update_page
 * - delete_page
 */

import { z } from "zod";
import type { HttpClient } from "../client/index.js";
import {
  formatError,
  formatSuccess,
  StoreIdRequiredError,
  storeApiPath,
} from "../client/index.js";
import type { Page, ListResponse, SingleResponse } from "../client/index.js";
import type { ToolDefinition } from "./types.js";

// =============================================================================
// Validation Schemas
// =============================================================================

const pageStatusSchema = z.enum(["draft", "published", "archived"]);
const pageBodyFormatSchema = z.enum(["plain", "html", "markdown"]);

const listPagesSchema = z.object({
  storeId: z.string().uuid().optional(),
  status: pageStatusSchema.optional(),
  search: z.string().optional(),
  sortBy: z.enum(["title", "slug", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

const getPageSchema = z.object({
  storeId: z.string().uuid().optional(),
  pageId: z.string().uuid().optional(),
  slug: z.string().optional(),
});

const createPageSchema = z.object({
  storeId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(255),
  body: z.string().max(100000).optional().nullable(),
  bodyFormat: pageBodyFormatSchema.default("html"),
  status: pageStatusSchema.default("draft"),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  seoKeywords: z.string().max(500).optional().nullable(),
  seoImageId: z.string().uuid().optional().nullable(),
});

const updatePageSchema = z.object({
  storeId: z.string().uuid().optional(),
  pageId: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(255).optional(),
  body: z.string().max(100000).optional().nullable(),
  bodyFormat: pageBodyFormatSchema.optional(),
  status: pageStatusSchema.optional(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  seoKeywords: z.string().max(500).optional().nullable(),
  seoImageId: z.string().uuid().optional().nullable(),
});

const deletePageSchema = z.object({
  storeId: z.string().uuid().optional(),
  pageId: z.string().uuid(),
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
 * Format page for summary view
 */
function formatPageSummary(page: Page) {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    status: page.status,
    bodyFormat: page.bodyFormat,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

/**
 * Format full page for response
 */
function formatPageFull(page: Page) {
  return {
    id: page.id,
    storeId: page.storeId,
    title: page.title,
    slug: page.slug,
    body: page.body,
    bodyFormat: page.bodyFormat,
    status: page.status,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    seoKeywords: page.seoKeywords,
    seoImageId: page.seoImageId,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * Create all page management tools
 */
export function createPageTools(client: HttpClient): ToolDefinition[] {
  return [
    // =========================================================================
    // list_pages
    // =========================================================================
    {
      name: "list_pages",
      description:
        "List CMS pages in your store. Filter by status or search by title/slug.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          status: {
            type: "string",
            enum: ["draft", "published", "archived"],
            description: "Filter by page status",
          },
          search: {
            type: "string",
            description: "Search in title or slug",
          },
          sortBy: {
            type: "string",
            enum: ["title", "slug", "createdAt", "updatedAt"],
            default: "createdAt",
            description: "Sort field",
          },
          sortOrder: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
            description: "Sort direction",
          },
          limit: {
            type: "integer",
            default: 50,
            minimum: 1,
            maximum: 200,
            description: "Number of pages to return",
          },
          offset: {
            type: "integer",
            default: 0,
            minimum: 0,
            description: "Number of pages to skip",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = listPagesSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const params: Record<string, unknown> = {
            limit: input.limit,
            offset: input.offset,
            sortBy: input.sortBy,
            sortOrder: input.sortOrder,
          };

          if (input.status) params.status = input.status;
          if (input.search) params.search = input.search;

          const response = await client.get<ListResponse<Page>>(
            storeApiPath(storeId, "pages"),
            params
          );

          return formatSuccess({
            items: response.items.map(formatPageSummary),
            total: response.pagination.total,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // get_page
    // =========================================================================
    {
      name: "get_page",
      description:
        "Get detailed information about a specific page including its content and SEO settings.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          pageId: {
            type: "string",
            description: "Page UUID",
          },
          slug: {
            type: "string",
            description: "Page slug (alternative to pageId)",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = getPageSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          if (!input.pageId && !input.slug) {
            return formatError(
              new Error("Either pageId or slug must be provided")
            );
          }

          let page: Page;

          if (input.pageId) {
            const response = await client.get<SingleResponse<Page>>(
              storeApiPath(storeId, `pages/${input.pageId}`)
            );
            page = response.item;
          } else {
            // Find by slug
            const response = await client.get<ListResponse<Page>>(
              storeApiPath(storeId, "pages"),
              { slug: input.slug, limit: 1 }
            );
            if (response.items.length === 0) {
              return formatError(
                new Error(`Page with slug "${input.slug}" not found`)
              );
            }
            page = response.items[0]!;
          }

          return formatSuccess(formatPageFull(page));
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // create_page
    // =========================================================================
    {
      name: "create_page",
      description:
        "Create a new CMS page. Supports plain text, HTML, or Markdown content.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          title: {
            type: "string",
            description: "Page title (required)",
          },
          slug: {
            type: "string",
            description: "URL-friendly slug (required, lowercase letters, numbers, hyphens only)",
          },
          body: {
            type: "string",
            description: "Page content/body",
          },
          bodyFormat: {
            type: "string",
            enum: ["plain", "html", "markdown"],
            default: "html",
            description: "Content format",
          },
          status: {
            type: "string",
            enum: ["draft", "published", "archived"],
            default: "draft",
            description: "Page status",
          },
          seoTitle: {
            type: "string",
            description: "SEO title for search engines",
          },
          seoDescription: {
            type: "string",
            description: "SEO meta description",
          },
          seoKeywords: {
            type: "string",
            description: "SEO keywords (comma-separated)",
          },
          seoImageId: {
            type: "string",
            description: "SEO image media UUID",
          },
        },
        required: ["title", "slug"],
      },
      handler: async (args) => {
        try {
          const input = createPageSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const { storeId: _, ...pageData } = input;

          const response = await client.post<SingleResponse<Page>>(
            storeApiPath(storeId, "pages"),
            pageData
          );

          return formatSuccess({
            message: "Page created successfully",
            page: formatPageFull(response.item),
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // update_page
    // =========================================================================
    {
      name: "update_page",
      description:
        "Update an existing page's title, content, status, or SEO settings.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          pageId: {
            type: "string",
            description: "Page UUID (required)",
          },
          title: {
            type: "string",
            description: "Page title",
          },
          slug: {
            type: "string",
            description: "URL-friendly slug",
          },
          body: {
            type: "string",
            description: "Page content/body",
          },
          bodyFormat: {
            type: "string",
            enum: ["plain", "html", "markdown"],
            description: "Content format",
          },
          status: {
            type: "string",
            enum: ["draft", "published", "archived"],
            description: "Page status",
          },
          seoTitle: {
            type: "string",
            description: "SEO title",
          },
          seoDescription: {
            type: "string",
            description: "SEO meta description",
          },
          seoKeywords: {
            type: "string",
            description: "SEO keywords",
          },
          seoImageId: {
            type: "string",
            description: "SEO image media UUID",
          },
        },
        required: ["pageId"],
      },
      handler: async (args) => {
        try {
          const input = updatePageSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const { storeId: _, pageId, ...updateData } = input;

          // Remove undefined values
          const payload = Object.fromEntries(
            Object.entries(updateData).filter(([, v]) => v !== undefined)
          );

          if (Object.keys(payload).length === 0) {
            return formatError(
              new Error("No fields to update. Provide at least one field.")
            );
          }

          const response = await client.patch<SingleResponse<Page>>(
            storeApiPath(storeId, `pages/${pageId}`),
            payload
          );

          return formatSuccess({
            message: "Page updated successfully",
            page: formatPageFull(response.item),
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // delete_page
    // =========================================================================
    {
      name: "delete_page",
      description: "Delete a page. This is a soft delete; the page can be recovered.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          pageId: {
            type: "string",
            description: "Page UUID to delete",
          },
        },
        required: ["pageId"],
      },
      handler: async (args) => {
        try {
          const input = deletePageSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          await client.delete(storeApiPath(storeId, `pages/${input.pageId}`));

          return formatSuccess({
            deleted: true,
            pageId: input.pageId,
            message: "Page deleted successfully",
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },
  ];
}
