/**
 * Tests for Category Tools
 */

import { describe, it, expect, mock } from "bun:test";
import { createCategoryTools } from "../src/tools/categories.js";
import type { HttpClient } from "../src/client/index.js";
import type { Category } from "../src/client/index.js";

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

const mockCategory: Category = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  storeId: "550e8400-e29b-41d4-a716-446655440000",
  name: "Electronics",
  slug: "electronics",
  status: "published",
  description: "Electronic devices and accessories",
  parentId: null,
  sortOrder: 0,
  productCount: 42,
  imageId: null,
  imageUrl: null,
  seoTitle: "Electronics - Best Deals",
  seoDescription: "Shop the best electronics",
  seoKeywords: "electronics, gadgets, tech",
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-20T15:30:00Z",
};

// =============================================================================
// Tests
// =============================================================================

describe("Category Tools", () => {
  describe("list_categories", () => {
    it("should list categories with default parameters", async () => {
      const mockClient = createMockClient({
        get: mock(() =>
          Promise.resolve({
            items: [mockCategory],
            pagination: { total: 1, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false },
          })
        ),
      });

      const tools = createCategoryTools(mockClient);
      const listTool = tools.find((t) => t.name === "list_categories")!;

      const result = await listTool.handler({});

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].name).toBe("Electronics");
      expect(mockClient.get).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/categories",
        {
          limit: 50,
          offset: 0,
          sortBy: "sortOrder",
          sortOrder: "asc",
        }
      );
    });

    it("should filter by status and parentId", async () => {
      const mockClient = createMockClient({
        get: mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } })),
      });

      const tools = createCategoryTools(mockClient);
      const listTool = tools.find((t) => t.name === "list_categories")!;

      await listTool.handler({
        status: "published",
        parentId: "770e8400-e29b-41d4-a716-446655440002",
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/categories",
        {
          limit: 50,
          offset: 0,
          sortBy: "sortOrder",
          sortOrder: "asc",
          status: "published",
          parentId: "770e8400-e29b-41d4-a716-446655440002",
        }
      );
    });

    it("should support rootOnly filter", async () => {
      const mockClient = createMockClient({
        get: mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } })),
      });

      const tools = createCategoryTools(mockClient);
      const listTool = tools.find((t) => t.name === "list_categories")!;

      await listTool.handler({ rootOnly: true });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/categories",
        {
          limit: 50,
          offset: 0,
          sortBy: "sortOrder",
          sortOrder: "asc",
          rootOnly: true,
        }
      );
    });
  });

  describe("get_category", () => {
    it("should get category by ID", async () => {
      const mockClient = createMockClient({
        get: mock(() => Promise.resolve({ item: mockCategory })),
      });

      const tools = createCategoryTools(mockClient);
      const getTool = tools.find((t) => t.name === "get_category")!;

      const result = await getTool.handler({
        categoryId: mockCategory.id,
      });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("Electronics");
      expect(data.data.productCount).toBe(42);
    });

    it("should get category by slug", async () => {
      const mockClient = createMockClient({
        get: mock(() =>
          Promise.resolve({
            items: [mockCategory],
            pagination: { total: 1, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false },
          })
        ),
      });

      const tools = createCategoryTools(mockClient);
      const getTool = tools.find((t) => t.name === "get_category")!;

      const result = await getTool.handler({ slug: "electronics" });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.slug).toBe("electronics");
    });

    it("should error when neither categoryId nor slug provided", async () => {
      const mockClient = createMockClient();
      const tools = createCategoryTools(mockClient);
      const getTool = tools.find((t) => t.name === "get_category")!;

      const result = await getTool.handler({});

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("categoryId or slug");
    });
  });

  describe("create_category", () => {
    it("should create a category with required fields", async () => {
      const mockClient = createMockClient({
        post: mock(() => Promise.resolve({ item: mockCategory })),
      });

      const tools = createCategoryTools(mockClient);
      const createTool = tools.find((t) => t.name === "create_category")!;

      const result = await createTool.handler({
        name: "Electronics",
        slug: "electronics",
      });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe("Category created successfully");
      expect(mockClient.post).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/categories",
        {
          name: "Electronics",
          slug: "electronics",
          sortOrder: 0,
          status: "draft",
        }
      );
    });

    it("should create a nested category with parentId", async () => {
      const mockClient = createMockClient({
        post: mock(() => Promise.resolve({ item: mockCategory })),
      });

      const tools = createCategoryTools(mockClient);
      const createTool = tools.find((t) => t.name === "create_category")!;

      await createTool.handler({
        name: "Laptops",
        slug: "laptops",
        parentId: "770e8400-e29b-41d4-a716-446655440002",
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/categories",
        {
          name: "Laptops",
          slug: "laptops",
          parentId: "770e8400-e29b-41d4-a716-446655440002",
          sortOrder: 0,
          status: "draft",
        }
      );
    });
  });

  describe("update_category", () => {
    it("should update category fields", async () => {
      const mockClient = createMockClient({
        put: mock(() =>
          Promise.resolve({
            item: { ...mockCategory, name: "Updated Electronics" },
          })
        ),
      });

      const tools = createCategoryTools(mockClient);
      const updateTool = tools.find((t) => t.name === "update_category")!;

      const result = await updateTool.handler({
        categoryId: mockCategory.id,
        name: "Updated Electronics",
        status: "archived",
      });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(mockClient.patch).toHaveBeenCalledWith(
        `/stores/550e8400-e29b-41d4-a716-446655440000/categories/${mockCategory.id}`,
        {
          name: "Updated Electronics",
          status: "archived",
        }
      );
    });

    it("should error when no fields to update", async () => {
      const mockClient = createMockClient();
      const tools = createCategoryTools(mockClient);
      const updateTool = tools.find((t) => t.name === "update_category")!;

      const result = await updateTool.handler({
        categoryId: mockCategory.id,
      });

      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("No fields to update");
    });
  });

  describe("delete_category", () => {
    it("should delete a category", async () => {
      const mockClient = createMockClient({
        delete: mock(() => Promise.resolve({})),
      });

      const tools = createCategoryTools(mockClient);
      const deleteTool = tools.find((t) => t.name === "delete_category")!;

      const result = await deleteTool.handler({
        categoryId: mockCategory.id,
      });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
      expect(mockClient.delete).toHaveBeenCalledWith(
        `/stores/550e8400-e29b-41d4-a716-446655440000/categories/${mockCategory.id}`
      );
    });
  });
});
