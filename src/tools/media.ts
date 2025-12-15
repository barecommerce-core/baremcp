/**
 * BareMCP — Media Tools
 *
 * Tools for managing media files:
 * - list_media
 * - get_media
 * - upload_media
 * - delete_media
 */

import { z } from "zod";
import type { HttpClient } from "../client/index.js";
import {
  formatError,
  formatSuccess,
  StoreIdRequiredError,
  storeApiPath,
} from "../client/index.js";
import type { Media, ListResponse, SingleResponse } from "../client/index.js";
import type { ToolDefinition } from "./types.js";

// =============================================================================
// Validation Schemas
// =============================================================================

const listMediaSchema = z.object({
  storeId: z.string().uuid().optional(),
  mimeType: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["filename", "size", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

const getMediaSchema = z.object({
  storeId: z.string().uuid().optional(),
  mediaId: z.string().uuid(),
});

// Max base64 size: ~50MB encoded (decodes to ~37.5MB)
// Formula: decoded_size ≈ (encoded_length / 4) * 3
const MAX_BASE64_LENGTH = 67_108_864; // 64MB encoded max

const uploadMediaSchema = z.object({
  storeId: z.string().uuid().optional(),
  url: z.string().url().optional(),
  base64: z.string().max(MAX_BASE64_LENGTH, "Base64 data too large (max ~50MB)").optional(),
  filename: z.string().min(1).max(255),
  alt: z.string().max(255).optional(),
  mimeType: z.string().optional(),
});

const deleteMediaSchema = z.object({
  storeId: z.string().uuid().optional(),
  mediaId: z.string().uuid(),
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
 * Format media for summary view
 */
function formatMediaSummary(media: Media) {
  return {
    id: media.id,
    filename: media.filename,
    alt: media.alt,
    mimeType: media.mimeType,
    size: media.size,
    width: media.width,
    height: media.height,
    url: media.url,
    createdAt: media.createdAt,
  };
}

/**
 * Format full media for response
 */
function formatMediaFull(media: Media) {
  return {
    id: media.id,
    storeId: media.storeId,
    filename: media.filename,
    alt: media.alt,
    mimeType: media.mimeType,
    size: media.size,
    width: media.width,
    height: media.height,
    url: media.url,
    thumbnailUrl: media.thumbnailUrl,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
  };
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * Create all media management tools
 */
export function createMediaTools(client: HttpClient): ToolDefinition[] {
  return [
    // =========================================================================
    // list_media
    // =========================================================================
    {
      name: "list_media",
      description:
        "List media files (images, documents, etc.) in your store. Filter by MIME type or search by filename.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          mimeType: {
            type: "string",
            description: "Filter by MIME type (e.g., 'image/jpeg', 'image/*', 'application/pdf')",
          },
          search: {
            type: "string",
            description: "Search in filename",
          },
          sortBy: {
            type: "string",
            enum: ["filename", "size", "createdAt"],
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
            description: "Number of media items to return",
          },
          offset: {
            type: "integer",
            default: 0,
            minimum: 0,
            description: "Number of media items to skip",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = listMediaSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const params: Record<string, unknown> = {
            limit: input.limit,
            offset: input.offset,
            sortBy: input.sortBy,
            sortOrder: input.sortOrder,
          };

          if (input.mimeType) params.mimeType = input.mimeType;
          if (input.search) params.search = input.search;

          const response = await client.get<ListResponse<Media>>(
            storeApiPath(storeId, "media"),
            params
          );

          return formatSuccess({
            items: response.items.map((m) => ({
              ...formatMediaSummary(m),
              sizeFormatted: formatFileSize(m.size),
            })),
            total: response.pagination.total,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // get_media
    // =========================================================================
    {
      name: "get_media",
      description:
        "Get detailed information about a specific media file including dimensions and URLs.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          mediaId: {
            type: "string",
            description: "Media UUID",
          },
        },
        required: ["mediaId"],
      },
      handler: async (args) => {
        try {
          const input = getMediaSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const response = await client.get<SingleResponse<Media>>(
            storeApiPath(storeId, `media/${input.mediaId}`)
          );

          return formatSuccess({
            ...formatMediaFull(response.item),
            sizeFormatted: formatFileSize(response.item.size),
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // upload_media
    // =========================================================================
    {
      name: "upload_media",
      description:
        "Upload a media file from a URL or base64-encoded data. Useful for adding product images, page assets, etc.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          url: {
            type: "string",
            description: "URL to download the file from (provide either url or base64)",
          },
          base64: {
            type: "string",
            description: "Base64-encoded file data (provide either url or base64)",
          },
          filename: {
            type: "string",
            description: "Filename to save as (required)",
          },
          alt: {
            type: "string",
            description: "Alt text for images (accessibility)",
          },
          mimeType: {
            type: "string",
            description: "MIME type (auto-detected if not provided)",
          },
        },
        required: ["filename"],
      },
      handler: async (args) => {
        try {
          const input = uploadMediaSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          if (!input.url && !input.base64) {
            return formatError(
              new Error("Either url or base64 must be provided")
            );
          }

          const { storeId: _, ...uploadData } = input;

          const response = await client.post<SingleResponse<Media>>(
            storeApiPath(storeId, "media"),
            uploadData
          );

          return formatSuccess({
            message: "Media uploaded successfully",
            media: {
              ...formatMediaFull(response.item),
              sizeFormatted: formatFileSize(response.item.size),
            },
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // delete_media
    // =========================================================================
    {
      name: "delete_media",
      description:
        "Delete a media file. Note: Files referenced by products, pages, or categories should be reassigned first.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          mediaId: {
            type: "string",
            description: "Media UUID to delete",
          },
        },
        required: ["mediaId"],
      },
      handler: async (args) => {
        try {
          const input = deleteMediaSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          await client.delete(storeApiPath(storeId, `media/${input.mediaId}`));

          return formatSuccess({
            deleted: true,
            mediaId: input.mediaId,
            message: "Media deleted successfully",
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },
  ];
}
