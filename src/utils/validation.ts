/**
 * BareMCP — Validation Utilities
 *
 * Common Zod schemas and validation helpers.
 */

import { z } from "zod";

// =============================================================================
// Common Schemas
// =============================================================================

/**
 * UUID schema
 */
export const uuidSchema = z.string().uuid();

/**
 * Optional UUID schema
 */
export const optionalUuidSchema = z.string().uuid().optional();

/**
 * Store ID parameter (optional, falls back to default)
 */
export const storeIdParam = z.string().uuid().optional();

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * Sort parameters
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * URL slug pattern (lowercase letters, numbers, hyphens)
 */
export const slugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain only lowercase letters, numbers, and hyphens"
  );

/**
 * Email schema
 */
export const emailSchema = z.string().email().max(255);

/**
 * Price schema (non-negative number)
 */
export const priceSchema = z.number().min(0);

/**
 * Stock quantity schema (non-negative integer)
 */
export const stockSchema = z.number().int().min(0);

// =============================================================================
// Status Enums
// =============================================================================

export const productStatusSchema = z.enum(["draft", "published", "archived", "deleted"]);
export const productStatusFilterSchema = z.enum(["draft", "published", "archived"]);
export const productStatusCreateSchema = z.enum(["draft", "published"]);

export const orderStatusSchema = z.enum(["pending", "paid", "fulfilled", "cancelled"]);

export const categoryStatusSchema = z.enum(["draft", "published", "archived", "deleted"]);

export const pageStatusSchema = z.enum(["draft", "published", "archived", "deleted"]);
export const pageBodyFormatSchema = z.enum(["plain", "html", "markdown"]);

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a nullable version of a schema
 */
export function nullable<T extends z.ZodTypeAny>(schema: T) {
  return schema.optional().nullable();
}

/**
 * Validate and return parsed value, or throw formatted error
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation that returns result object
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
