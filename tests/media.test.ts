/**
 * Tests for Media Tools
 */

import { describe, it, expect, mock } from "bun:test";
import { createMediaTools } from "../src/tools/media.js";
import type { HttpClient } from "../src/client/index.js";
import type { Media } from "../src/client/index.js";

// =============================================================================
// Test Helpers
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockClient(overrides: Record<string, any> = {}): HttpClient {
  return {
    get: mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } })),
    post: mock(() => Promise.resolve({ item: {} })),
    put: mock(() => Promise.resolve({ item: {} })),
    patch: mock(() => Promise.resolve({ item: {} })),
    delete: mock(() => Promise.resolve({})),
    upload: mock(() => Promise.resolve({ item: {} })),
    getDefaultStoreId: () => "550e8400-e29b-41d4-a716-446655440000",
    setDefaultStoreId: () => {},
    getBaseUrl: () => "https://api.example.com",
    isAuthenticated: () => true,
    setApiKey: () => {},
    clearAuth: () => {},
    setBaseUrl: () => {},
    ...overrides,
  } as HttpClient;
}

const mockMedia: Media = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  storeId: "550e8400-e29b-41d4-a716-446655440000",
  filename: "product-image.jpg",
  alt: "Product front view",
  mimeType: "image/jpeg",
  size: 245760, // 240 KB
  width: 1200,
  height: 800,
  url: "https://cdn.example.com/media/product-image.jpg",
  thumbnailUrl: "https://cdn.example.com/media/product-image-thumb.jpg",
  createdAt: "2024-01-12T10:00:00Z",
  updatedAt: "2024-01-12T10:00:00Z",
};

// =============================================================================
// Tests
// =============================================================================

describe("Media Tools", () => {
  describe("list_media", () => {
    it("should list media with default parameters", async () => {
      const mockClient = createMockClient({
        get: mock(() =>
          Promise.resolve({
            items: [mockMedia],
            pagination: { total: 1, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false },
          })
        ),
      });

      const tools = createMediaTools(mockClient);
      const listTool = tools.find((t) => t.name === "list_media")!;

      const result = await listTool.handler({});

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].filename).toBe("product-image.jpg");
      expect(data.data.items[0].sizeFormatted).toBe("240.0 KB");
      expect(mockClient.get).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/media",
        {
          limit: 50,
          offset: 0,
          sortBy: "createdAt",
          sortOrder: "desc",
        }
      );
    });

    it("should filter by mimeType", async () => {
      const mockClient = createMockClient({
        get: mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } })),
      });

      const tools = createMediaTools(mockClient);
      const listTool = tools.find((t) => t.name === "list_media")!;

      await listTool.handler({
        mimeType: "image/*",
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/media",
        {
          limit: 50,
          offset: 0,
          sortBy: "createdAt",
          sortOrder: "desc",
          mimeType: "image/*",
        }
      );
    });

    it("should filter by search", async () => {
      const mockClient = createMockClient({
        get: mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } })),
      });

      const tools = createMediaTools(mockClient);
      const listTool = tools.find((t) => t.name === "list_media")!;

      await listTool.handler({
        search: "product",
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/media",
        {
          limit: 50,
          offset: 0,
          sortBy: "createdAt",
          sortOrder: "desc",
          search: "product",
        }
      );
    });
  });

  describe("get_media", () => {
    it("should get media by ID", async () => {
      const mockClient = createMockClient({
        get: mock(() => Promise.resolve({ item: mockMedia })),
      });

      const tools = createMediaTools(mockClient);
      const getTool = tools.find((t) => t.name === "get_media")!;

      const result = await getTool.handler({
        mediaId: mockMedia.id,
      });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.filename).toBe("product-image.jpg");
      expect(data.data.width).toBe(1200);
      expect(data.data.height).toBe(800);
      expect(data.data.sizeFormatted).toBe("240.0 KB");
    });
  });

  describe("upload_media", () => {
    it("should upload media from URL", async () => {
      const mockClient = createMockClient({
        post: mock(() => Promise.resolve({ item: mockMedia })),
      });

      const tools = createMediaTools(mockClient);
      const uploadTool = tools.find((t) => t.name === "upload_media")!;

      const result = await uploadTool.handler({
        url: "https://example.com/image.jpg",
        filename: "product-image.jpg",
        alt: "Product front view",
      });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe("Media uploaded successfully");
      expect(mockClient.post).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/media",
        {
          url: "https://example.com/image.jpg",
          filename: "product-image.jpg",
          alt: "Product front view",
        }
      );
    });

    it("should upload media from base64", async () => {
      const mockClient = createMockClient({
        post: mock(() => Promise.resolve({ item: mockMedia })),
      });

      const tools = createMediaTools(mockClient);
      const uploadTool = tools.find((t) => t.name === "upload_media")!;

      const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const result = await uploadTool.handler({
        base64: base64Data,
        filename: "tiny-image.png",
        mimeType: "image/png",
      });

      expect(result).not.toHaveProperty("isError");
      expect(mockClient.post).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/media",
        {
          base64: base64Data,
          filename: "tiny-image.png",
          mimeType: "image/png",
        }
      );
    });

    it("should error when neither url nor base64 provided", async () => {
      const mockClient = createMockClient();
      const tools = createMediaTools(mockClient);
      const uploadTool = tools.find((t) => t.name === "upload_media")!;

      const result = await uploadTool.handler({
        filename: "test.jpg",
      });

      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("url or base64");
    });
  });

  describe("delete_media", () => {
    it("should delete media", async () => {
      const mockClient = createMockClient({
        delete: mock(() => Promise.resolve({})),
      });

      const tools = createMediaTools(mockClient);
      const deleteTool = tools.find((t) => t.name === "delete_media")!;

      const result = await deleteTool.handler({
        mediaId: mockMedia.id,
      });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
      expect(mockClient.delete).toHaveBeenCalledWith(
        `/stores/550e8400-e29b-41d4-a716-446655440000/media/${mockMedia.id}`
      );
    });
  });
});
