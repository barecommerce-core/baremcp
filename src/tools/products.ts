/**
 * BareMCP — Product Tools
 *
 * Tools for managing products:
 * - list_products
 * - get_product
 * - create_product
 * - update_product
 * - delete_product
 * - bulk_update_products
 * - search_products
 * - get_product_attributes
 * - get_product_variants
 */

import { z } from "zod";
import type { HttpClient } from "../client/index.js";
import {
  formatError,
  formatSuccess,
  StoreIdRequiredError,
  storeApiPath,
} from "../client/index.js";
import type { Product, ListResponse, SingleResponse } from "../client/index.js";
import type { ToolDefinition } from "./types.js";

// =============================================================================
// Validation Schemas
// =============================================================================

const productStatusFilter = z.enum(["draft", "published", "archived"]);
const productStatusCreate = z.enum(["draft", "published", "archived"]);
const productStatusUpdate = z.enum(["draft", "published", "archived"]);

const listProductsSchema = z.object({
  storeId: z.string().uuid().optional(),
  status: productStatusFilter.optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  variantGroupId: z.string().optional(),
  lowStock: z.boolean().optional(),
  outOfStock: z.boolean().optional(),
  sortBy: z
    .enum(["title", "price", "stock", "createdAt", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(200).default(50),
});

const getProductSchema = z.object({
  storeId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  slug: z.string().optional(),
});

const createProductSchema = z.object({
  storeId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  price: z.number().min(0),
  status: productStatusCreate.default("draft"),
  description: z.string().max(65535).optional().nullable(),
  compareAtPrice: z.number().min(0).optional().nullable(),
  sku: z.string().max(255).optional().nullable(),
  barcode: z.string().max(255).optional().nullable(),
  variantGroupId: z.string().max(255).optional().nullable(),
  attributes: z.record(z.string(), z.string()).optional(),
  trackStock: z.boolean().default(false),
  stock: z.number().int().min(0).default(0),
  allowBackorder: z.boolean().default(false),
  categoryIds: z.array(z.string().uuid()).optional(),
  primaryMediaId: z.string().uuid().optional().nullable(),
  mediaIds: z.array(z.string().uuid()).optional(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  seoKeywords: z.string().max(500).optional().nullable(),
});

const updateProductSchema = z.object({
  storeId: z.string().uuid().optional(),
  productId: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  price: z.number().min(0).optional(),
  status: productStatusUpdate.optional(),
  description: z.string().max(65535).optional().nullable(),
  compareAtPrice: z.number().min(0).optional().nullable(),
  sku: z.string().max(255).optional().nullable(),
  barcode: z.string().max(255).optional().nullable(),
  variantGroupId: z.string().max(255).optional().nullable(),
  attributes: z.record(z.string(), z.string()).optional(),
  trackStock: z.boolean().optional(),
  stock: z.number().int().min(0).optional(),
  allowBackorder: z.boolean().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  primaryMediaId: z.string().uuid().optional().nullable(),
  mediaIds: z.array(z.string().uuid()).optional(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  seoKeywords: z.string().max(500).optional().nullable(),
});

const deleteProductSchema = z.object({
  storeId: z.string().uuid().optional(),
  productId: z.string().uuid(),
});

const bulkUpdateProductsSchema = z.object({
  storeId: z.string().uuid().optional(),
  action: z.enum(["publish", "archive", "draft", "delete"]),
  productIds: z.array(z.string().uuid()).min(1).max(100),
});

const searchProductsSchema = z.object({
  storeId: z.string().uuid().optional(),
  query: z.string().min(1),
  status: productStatusFilter.optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

const getProductAttributesSchema = z.object({
  storeId: z.string().uuid().optional(),
});

const getProductVariantsSchema = z.object({
  storeId: z.string().uuid().optional(),
  variantGroupId: z.string().min(1),
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
 * Format product for response (simplified view)
 */
function formatProductSummary(product: Product) {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    status: product.status,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    sku: product.sku,
    stock: product.stock,
    trackStock: product.trackStock,
    primaryMediaId: product.primaryMediaId,
    featuredMediaUrl: product.featuredMediaUrl,
    categoryIds: product.categoryIds,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

/**
 * Format full product for response
 */
function formatProductFull(product: Product) {
  return {
    id: product.id,
    storeId: product.storeId,
    title: product.title,
    slug: product.slug,
    status: product.status,
    publishedAt: product.publishedAt,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    sku: product.sku,
    barcode: product.barcode,
    variantGroupId: product.variantGroupId,
    attributes: product.attributes,
    trackStock: product.trackStock,
    stock: product.stock,
    allowBackorder: product.allowBackorder,
    categoryIds: product.categoryIds,
    primaryMediaId: product.primaryMediaId,
    featuredMediaUrl: product.featuredMediaUrl,
    mediaIds: product.mediaIds,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    seoKeywords: product.seoKeywords,
    seoImageId: product.seoImageId,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * Create all product management tools
 */
export function createProductTools(client: HttpClient): ToolDefinition[] {
  return [
    // =========================================================================
    // list_products
    // =========================================================================
    {
      name: "list_products",
      description:
        "List products in your store with optional filters for status, category, search, stock levels, and sorting.",
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
            description: "Filter by product status",
          },
          categoryId: {
            type: "string",
            description: "Filter by category UUID",
          },
          search: {
            type: "string",
            description: "Search in title, description, and SKU",
          },
          variantGroupId: {
            type: "string",
            description: "Filter by variant group ID",
          },
          lowStock: {
            type: "boolean",
            description: "Only show products with stock <= 10",
          },
          outOfStock: {
            type: "boolean",
            description: "Only show products with stock = 0",
          },
          sortBy: {
            type: "string",
            enum: ["title", "price", "stock", "createdAt", "updatedAt"],
            default: "createdAt",
            description: "Sort field",
          },
          sortOrder: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
            description: "Sort direction",
          },
          page: {
            type: "integer",
            default: 1,
            minimum: 1,
            description: "Page number",
          },
          limit: {
            type: "integer",
            default: 50,
            minimum: 1,
            maximum: 200,
            description: "Number of products to return per page",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = listProductsSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          // Build query params
          const params: Record<string, unknown> = {
            page: input.page,
            limit: input.limit,
            sortBy: input.sortBy,
            sortOrder: input.sortOrder,
          };

          if (input.status) params.status = input.status;
          if (input.categoryId) params.categoryId = input.categoryId;
          if (input.search) params.search = input.search;
          if (input.variantGroupId) params.variantGroupId = input.variantGroupId;

          const response = await client.get<ListResponse<Product>>(
            storeApiPath(storeId, "products"),
            params
          );

          // Apply local stock filters if needed
          let items = response.items;
          if (input.lowStock) {
            items = items.filter((p) => p.trackStock && p.stock <= 10);
          }
          if (input.outOfStock) {
            items = items.filter((p) => p.trackStock && p.stock === 0);
          }

          return formatSuccess({
            items: items.map(formatProductSummary),
            pagination: response.pagination,
            total: input.lowStock || input.outOfStock ? items.length : response.pagination.total,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // get_product
    // =========================================================================
    {
      name: "get_product",
      description:
        "Get detailed information about a specific product by ID or slug.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          productId: {
            type: "string",
            description: "Product UUID",
          },
          slug: {
            type: "string",
            description: "Product slug (alternative to productId)",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = getProductSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          if (!input.productId && !input.slug) {
            return formatError(
              new Error("Either productId or slug must be provided")
            );
          }

          let product: Product;

          if (input.productId) {
            const response = await client.get<SingleResponse<Product>>(
              storeApiPath(storeId, `products/${input.productId}`)
            );
            product = response.item;
          } else {
            // Find by slug
            const response = await client.get<ListResponse<Product>>(
              storeApiPath(storeId, "products"),
              { search: input.slug, limit: 1 }
            );
            if (response.items.length === 0) {
              return formatError(
                new Error(`Product with slug "${input.slug}" not found`)
              );
            }
            product = response.items[0]!;
          }

          return formatSuccess(formatProductFull(product));
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // create_product
    // =========================================================================
    {
      name: "create_product",
      description:
        "Create a new product with title, price, and optional details like description, SKU, images, and SEO settings.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          title: {
            type: "string",
            description: "Product title (required)",
            minLength: 1,
            maxLength: 255,
          },
          slug: {
            type: "string",
            description:
              "URL slug (required). Lowercase letters, numbers, and hyphens only.",
            pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          },
          price: {
            type: "number",
            description: "Product price (required)",
            minimum: 0,
          },
          status: {
            type: "string",
            enum: ["draft", "published"],
            default: "draft",
            description: "Initial status",
          },
          description: {
            type: "string",
            description: "Product description (HTML allowed)",
          },
          compareAtPrice: {
            type: "number",
            description: "Original price for showing discounts",
          },
          sku: {
            type: "string",
            description: "Stock keeping unit",
          },
          barcode: {
            type: "string",
            description: "Product barcode (UPC, EAN, etc.)",
          },
          variantGroupId: {
            type: "string",
            description: "Group ID to link product variants together",
          },
          attributes: {
            type: "object",
            description:
              'Variant attributes object, e.g., {"color": "red", "size": "large"}',
          },
          trackStock: {
            type: "boolean",
            default: false,
            description: "Enable inventory tracking",
          },
          stock: {
            type: "integer",
            default: 0,
            description: "Current stock quantity",
          },
          allowBackorder: {
            type: "boolean",
            default: false,
            description: "Allow orders when out of stock",
          },
          categoryIds: {
            type: "array",
            items: { type: "string" },
            description: "Category UUIDs to assign product to",
          },
          primaryMediaId: {
            type: "string",
            description: "Primary image media ID",
          },
          mediaIds: {
            type: "array",
            items: { type: "string" },
            description: "Additional image media IDs",
          },
          seoTitle: {
            type: "string",
            description: "SEO meta title",
          },
          seoDescription: {
            type: "string",
            description: "SEO meta description",
          },
          seoKeywords: {
            type: "string",
            description: "SEO keywords",
          },
        },
        required: ["title", "slug", "price"],
      },
      handler: async (args) => {
        try {
          const input = createProductSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          // Build request body (exclude storeId)
          const { storeId: _, ...productData } = input;

          const response = await client.post<SingleResponse<Product>>(
            storeApiPath(storeId, "products"),
            productData
          );

          return formatSuccess({
            message: "Product created successfully",
            product: formatProductFull(response.item),
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // update_product
    // =========================================================================
    {
      name: "update_product",
      description:
        "Update an existing product's details, pricing, inventory, or SEO settings.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          productId: {
            type: "string",
            description: "Product UUID (required)",
          },
          title: { type: "string", description: "Product title" },
          slug: { type: "string", description: "URL slug" },
          price: { type: "number", description: "Product price" },
          status: {
            type: "string",
            enum: ["draft", "published", "archived"],
            description: "Product status",
          },
          description: { type: "string", description: "Product description" },
          compareAtPrice: { type: "number", description: "Compare at price" },
          sku: { type: "string", description: "SKU" },
          barcode: { type: "string", description: "Barcode" },
          variantGroupId: { type: "string", description: "Variant group ID" },
          attributes: { type: "object", description: "Variant attributes" },
          trackStock: { type: "boolean", description: "Track inventory" },
          stock: { type: "integer", description: "Stock quantity" },
          allowBackorder: { type: "boolean", description: "Allow backorders" },
          categoryIds: {
            type: "array",
            items: { type: "string" },
            description: "Category IDs",
          },
          primaryMediaId: { type: "string", description: "Primary image ID" },
          mediaIds: {
            type: "array",
            items: { type: "string" },
            description: "Additional image IDs",
          },
          seoTitle: { type: "string", description: "SEO title" },
          seoDescription: { type: "string", description: "SEO description" },
          seoKeywords: { type: "string", description: "SEO keywords" },
        },
        required: ["productId"],
      },
      handler: async (args) => {
        try {
          const input = updateProductSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          // Build update payload (exclude storeId and productId)
          const { storeId: _, productId, ...updateData } = input;

          // Remove undefined values
          const payload = Object.fromEntries(
            Object.entries(updateData).filter(([, v]) => v !== undefined)
          );

          if (Object.keys(payload).length === 0) {
            return formatError(
              new Error("No fields to update. Provide at least one field.")
            );
          }

          const response = await client.patch<SingleResponse<Product>>(
            storeApiPath(storeId, `products/${productId}`),
            payload
          );

          return formatSuccess({
            message: "Product updated successfully",
            product: formatProductFull(response.item),
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // delete_product
    // =========================================================================
    {
      name: "delete_product",
      description:
        "Delete a product (soft-delete). The product will be marked as archived.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          productId: {
            type: "string",
            description: "Product UUID to delete",
          },
        },
        required: ["productId"],
      },
      handler: async (args) => {
        try {
          const input = deleteProductSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          await client.delete(
            storeApiPath(storeId, `products/${input.productId}`)
          );

          return formatSuccess({
            deleted: true,
            productId: input.productId,
            message: "Product deleted successfully",
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // bulk_update_products
    // =========================================================================
    {
      name: "bulk_update_products",
      description:
        "Perform bulk operations on multiple products: publish, archive, draft, or delete.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          action: {
            type: "string",
            enum: ["publish", "archive", "draft", "delete"],
            description: "Operation to perform on all selected products",
          },
          productIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of product UUIDs (1-100 products)",
            minItems: 1,
            maxItems: 100,
          },
        },
        required: ["action", "productIds"],
      },
      handler: async (args) => {
        try {
          const input = bulkUpdateProductsSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const response = await client.post<{ item: { action: string; count: number } }>(
            storeApiPath(storeId, "products/bulk"),
            {
              action: input.action,
              productIds: input.productIds,
            }
          );

          return formatSuccess({
            action: input.action,
            count: response.item.count,
            message: `Successfully ${input.action}ed ${response.item.count} products`,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // search_products
    // =========================================================================
    {
      name: "search_products",
      description:
        "Full-text search across products by title, description, and SKU.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          query: {
            type: "string",
            description: "Search query",
            minLength: 1,
          },
          status: {
            type: "string",
            enum: ["draft", "published", "archived"],
            description: "Filter by status",
          },
          limit: {
            type: "integer",
            default: 20,
            maximum: 100,
            description: "Maximum results to return",
          },
        },
        required: ["query"],
      },
      handler: async (args) => {
        try {
          const input = searchProductsSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const params: Record<string, unknown> = {
            search: input.query,
            limit: input.limit,
          };
          if (input.status) params.status = input.status;

          const response = await client.get<ListResponse<Product>>(
            storeApiPath(storeId, "products"),
            params
          );

          return formatSuccess({
            query: input.query,
            items: response.items.map(formatProductSummary),
            total: response.pagination.total,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // get_product_attributes
    // =========================================================================
    {
      name: "get_product_attributes",
      description:
        "Get all attribute keys and their values used across products (e.g., colors, sizes).",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = getProductAttributesSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const response = await client.get<{ item: { attributes: Record<string, string[]>; keys: string[] } }>(
            storeApiPath(storeId, "products/attributes")
          );

          return formatSuccess(response.item);
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // get_product_variants
    // =========================================================================
    {
      name: "get_product_variants",
      description:
        "Get all product variants in a variant group (products sharing the same variantGroupId).",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          variantGroupId: {
            type: "string",
            description: "Variant group ID",
          },
        },
        required: ["variantGroupId"],
      },
      handler: async (args) => {
        try {
          const input = getProductVariantsSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const response = await client.get<{ item: { variantGroupId: string; products: Product[]; total: number } }>(
            storeApiPath(storeId, "products/by-variant-group"),
            { variantGroupId: input.variantGroupId }
          );

          return formatSuccess({
            variantGroupId: input.variantGroupId,
            variants: response.item.products.map((p) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              price: p.price,
              sku: p.sku,
              attributes: p.attributes,
              stock: p.stock,
              status: p.status,
            })),
            total: response.item.total,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },
  ];
}
