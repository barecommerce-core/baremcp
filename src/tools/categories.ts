/**
 * BareMCP — Category Tools
 *
 * Tools for managing categories:
 * - list_categories
 * - get_category
 * - create_category
 * - update_category
 * - delete_category
 */

import { z } from "zod";
import type { HttpClient } from "../client/index.js";
import {
  formatError,
  formatSuccess,
  StoreIdRequiredError,
  storeApiPath,
} from "../client/index.js";
import type { Category, ListResponse, SingleResponse } from "../client/index.js";
import type { ToolDefinition } from "./types.js";

// =============================================================================
// Validation Schemas
// =============================================================================

const categoryStatusSchema = z.enum(["draft", "published", "archived"]);

const listCategoriesSchema = z.object({
  storeId: z.string().uuid().optional(),
  status: categoryStatusSchema.optional(),
  parentId: z.string().uuid().optional().nullable(),
  rootOnly: z.boolean().optional(),
  includeChildren: z.boolean().optional(),
  sortBy: z.enum(["name", "sortOrder", "createdAt", "updatedAt"]).default("sortOrder"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

const getCategorySchema = z.object({
  storeId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  slug: z.string().optional(),
});

const createCategorySchema = z.object({
  storeId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(255),
  description: z.string().max(5000).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  status: categoryStatusSchema.optional(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  seoKeywords: z.string().max(500).optional().nullable(),
  seoImageId: z.string().uuid().optional().nullable(),
});

const updateCategorySchema = z.object({
  storeId: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  status: categoryStatusSchema.optional(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  seoKeywords: z.string().max(500).optional().nullable(),
  seoImageId: z.string().uuid().optional().nullable(),
});

const deleteCategorySchema = z.object({
  storeId: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
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
 * Format category for summary view
 */
function formatCategorySummary(category: Category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    status: category.status,
    parentId: category.parentId,
    sortOrder: category.sortOrder,
    productCount: category.productCount,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

/**
 * Format full category for response
 */
function formatCategoryFull(category: Category) {
  return {
    id: category.id,
    storeId: category.storeId,
    name: category.name,
    slug: category.slug,
    description: category.description,
    parentId: category.parentId,
    sortOrder: category.sortOrder,
    status: category.status,
    productCount: category.productCount,
    imageId: category.imageId,
    imageUrl: category.imageUrl,
    seoTitle: category.seoTitle,
    seoDescription: category.seoDescription,
    seoKeywords: category.seoKeywords,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * Create all category management tools
 */
export function createCategoryTools(client: HttpClient): ToolDefinition[] {
  return [
    // =========================================================================
    // list_categories
    // =========================================================================
    {
      name: "list_categories",
      description:
        "List categories in your store. Can filter by status, parent, or get only root categories. Supports hierarchical tree retrieval.",
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
            description: "Filter by category status",
          },
          parentId: {
            type: "string",
            description: "Filter by parent category UUID (null for root categories)",
          },
          rootOnly: {
            type: "boolean",
            description: "If true, only return root categories (no parent)",
          },
          includeChildren: {
            type: "boolean",
            description: "If true, include nested children in response",
          },
          sortBy: {
            type: "string",
            enum: ["name", "sortOrder", "createdAt", "updatedAt"],
            default: "sortOrder",
            description: "Sort field",
          },
          sortOrder: {
            type: "string",
            enum: ["asc", "desc"],
            default: "asc",
            description: "Sort direction",
          },
          limit: {
            type: "integer",
            default: 50,
            minimum: 1,
            maximum: 200,
            description: "Number of categories to return",
          },
          offset: {
            type: "integer",
            default: 0,
            minimum: 0,
            description: "Number of categories to skip",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = listCategoriesSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const params: Record<string, unknown> = {
            limit: input.limit,
            offset: input.offset,
            sortBy: input.sortBy,
            sortOrder: input.sortOrder,
          };

          if (input.status) params.status = input.status;
          if (input.parentId !== undefined) params.parentId = input.parentId;
          if (input.rootOnly) params.rootOnly = input.rootOnly;
          if (input.includeChildren) params.includeChildren = input.includeChildren;

          const response = await client.get<ListResponse<Category>>(
            storeApiPath(storeId, "categories"),
            params
          );

          return formatSuccess({
            items: response.items.map(formatCategorySummary),
            total: response.pagination.total,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // get_category
    // =========================================================================
    {
      name: "get_category",
      description:
        "Get detailed information about a specific category including SEO settings and image.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          categoryId: {
            type: "string",
            description: "Category UUID",
          },
          slug: {
            type: "string",
            description: "Category slug (alternative to categoryId)",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = getCategorySchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          if (!input.categoryId && !input.slug) {
            return formatError(
              new Error("Either categoryId or slug must be provided")
            );
          }

          let category: Category;

          if (input.categoryId) {
            const response = await client.get<SingleResponse<Category>>(
              storeApiPath(storeId, `categories/${input.categoryId}`)
            );
            category = response.item;
          } else {
            // Find by slug
            const response = await client.get<ListResponse<Category>>(
              storeApiPath(storeId, "categories"),
              { slug: input.slug, limit: 1 }
            );
            if (response.items.length === 0) {
              return formatError(
                new Error(`Category with slug "${input.slug}" not found`)
              );
            }
            category = response.items[0]!;
          }

          return formatSuccess(formatCategoryFull(category));
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // create_category
    // =========================================================================
    {
      name: "create_category",
      description:
        "Create a new category. Categories can be nested by specifying a parentId.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          name: {
            type: "string",
            description: "Category name (required)",
          },
          slug: {
            type: "string",
            description: "URL-friendly slug (required, lowercase letters, numbers, hyphens only)",
          },
          description: {
            type: "string",
            description: "Category description",
          },
          parentId: {
            type: "string",
            description: "Parent category UUID for nesting",
          },
          status: {
            type: "string",
            enum: ["draft", "published", "archived"],
            description: "Category status (defaults to draft)",
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
        required: ["name", "slug"],
      },
      handler: async (args) => {
        try {
          const input = createCategorySchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const { storeId: _, ...categoryData } = input;

          const response = await client.post<SingleResponse<Category>>(
            storeApiPath(storeId, "categories"),
            categoryData
          );

          return formatSuccess({
            message: "Category created successfully",
            category: formatCategoryFull(response.item),
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // update_category
    // =========================================================================
    {
      name: "update_category",
      description:
        "Update an existing category's name, description, parent, status, or SEO settings.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          categoryId: {
            type: "string",
            description: "Category UUID (required)",
          },
          name: {
            type: "string",
            description: "Category name",
          },
          slug: {
            type: "string",
            description: "URL-friendly slug",
          },
          description: {
            type: "string",
            description: "Category description",
          },
          parentId: {
            type: "string",
            description: "Parent category UUID (null to make root)",
          },
          status: {
            type: "string",
            enum: ["draft", "published", "archived"],
            description: "Category status",
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
        required: ["categoryId"],
      },
      handler: async (args) => {
        try {
          const input = updateCategorySchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const { storeId: _, categoryId, ...updateData } = input;

          // Remove undefined values
          const payload = Object.fromEntries(
            Object.entries(updateData).filter(([, v]) => v !== undefined)
          );

          if (Object.keys(payload).length === 0) {
            return formatError(
              new Error("No fields to update. Provide at least one field.")
            );
          }

          const response = await client.patch<SingleResponse<Category>>(
            storeApiPath(storeId, `categories/${categoryId}`),
            payload
          );

          return formatSuccess({
            message: "Category updated successfully",
            category: formatCategoryFull(response.item),
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // delete_category
    // =========================================================================
    {
      name: "delete_category",
      description:
        "Delete a category. Products in this category will be unassigned. Child categories will become root categories.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          categoryId: {
            type: "string",
            description: "Category UUID to delete",
          },
        },
        required: ["categoryId"],
      },
      handler: async (args) => {
        try {
          const input = deleteCategorySchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          await client.delete(
            storeApiPath(storeId, `categories/${input.categoryId}`)
          );

          return formatSuccess({
            deleted: true,
            categoryId: input.categoryId,
            message: "Category deleted successfully",
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },
  ];
}
