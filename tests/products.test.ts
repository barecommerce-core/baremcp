/**
 * Product Tools Tests
 */

import { describe, it, expect, mock } from "bun:test";
import { createProductTools } from "../src/tools/products.js";
import type { HttpClient } from "../src/client/index.js";

// Test UUIDs
const TEST_STORE_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_STORE_ID = "00000000-0000-0000-0000-000000000000";
const TEST_PRODUCT_ID = "22222222-2222-2222-2222-222222222222";
const TEST_PRODUCT_ID_2 = "33333333-3333-3333-3333-333333333333";
const TEST_PRODUCT_ID_3 = "44444444-4444-4444-4444-444444444444";

// Mock HTTP client factory
function createMockClient(overrides: Partial<HttpClient> = {}): HttpClient {
  return {
    get: mock(() => Promise.resolve({})) as HttpClient["get"],
    post: mock(() => Promise.resolve({})) as HttpClient["post"],
    patch: mock(() => Promise.resolve({})) as HttpClient["patch"],
    delete: mock(() => Promise.resolve({})) as HttpClient["delete"],
    upload: mock(() => Promise.resolve({})) as HttpClient["upload"],
    getDefaultStoreId: () => DEFAULT_STORE_ID,
    setDefaultStoreId: () => {},
    getBaseUrl: () => "https://test.com",
    isAuthenticated: () => true,
    setApiKey: () => {},
    clearAuth: () => {},
    setBaseUrl: () => {},
    ...overrides,
  };
}

const mockProduct = {
  id: TEST_PRODUCT_ID,
  storeId: TEST_STORE_ID,
  title: "Test Product",
  slug: "test-product",
  status: "published",
  publishedAt: "2024-01-01T00:00:00Z",
  description: "A test product",
  price: "29.99",
  compareAtPrice: "39.99",
  sku: "TEST-001",
  barcode: null,
  variantGroupId: null,
  attributes: {},
  trackStock: true,
  stock: 100,
  allowBackorder: false,
  categoryIds: [],
  primaryMediaId: null,
  featuredMediaUrl: null,
  mediaIds: [],
  seoTitle: null,
  seoDescription: null,
  seoKeywords: null,
  seoImageId: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("Product Tools", () => {
  describe("list_products", () => {
    it("should list products with default parameters", async () => {
      const mockGet = mock(() =>
        Promise.resolve({
          items: [mockProduct],
          pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
        })
      );

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createProductTools(mockClient);
      const listProducts = tools.find((t) => t.name === "list_products")!;

      const result = await listProducts.handler({});

      expect(result).not.toHaveProperty("isError");
      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/products`,
        expect.objectContaining({
          limit: 50,
          page: 1,
          sortBy: "createdAt",
          sortOrder: "desc",
        })
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].title).toBe("Test Product");
    });

    it("should filter by status", async () => {
      const mockGet = mock(() =>
        Promise.resolve({
          items: [],
          pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
        })
      );

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createProductTools(mockClient);
      const listProducts = tools.find((t) => t.name === "list_products")!;

      await listProducts.handler({ status: "draft" });

      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/products`,
        expect.objectContaining({ status: "draft" })
      );
    });

    it("should filter low stock products locally", async () => {
      const mockGet = mock(() =>
        Promise.resolve({
          items: [
            { ...mockProduct, id: TEST_PRODUCT_ID, stock: 5, trackStock: true },
            { ...mockProduct, id: TEST_PRODUCT_ID_2, stock: 50, trackStock: true },
            { ...mockProduct, id: TEST_PRODUCT_ID_3, stock: 8, trackStock: true },
          ],
          pagination: { total: 3, page: 1, limit: 50, totalPages: 1 },
        })
      );

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createProductTools(mockClient);
      const listProducts = tools.find((t) => t.name === "list_products")!;

      const result = await listProducts.handler({ lowStock: true });

      const data = JSON.parse(result.content[0]!.text);
      expect(data.data.items).toHaveLength(2); // Only prod-1 and prod-3 (stock <= 10)
    });
  });

  describe("get_product", () => {
    it("should get product by ID", async () => {
      const mockGet = mock(() => Promise.resolve({ item: mockProduct }));

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createProductTools(mockClient);
      const getProduct = tools.find((t) => t.name === "get_product")!;

      const result = await getProduct.handler({ productId: TEST_PRODUCT_ID });

      expect(result).not.toHaveProperty("isError");
      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/products/${TEST_PRODUCT_ID}`
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe("Test Product");
    });

    it("should get product by slug", async () => {
      const mockGet = mock(() =>
        Promise.resolve({
          items: [mockProduct],
          pagination: { total: 1, page: 1, limit: 1, totalPages: 1 },
        })
      );

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createProductTools(mockClient);
      const getProduct = tools.find((t) => t.name === "get_product")!;

      const result = await getProduct.handler({ slug: "test-product" });

      expect(result).not.toHaveProperty("isError");
      // The code uses `search` param to find by slug
      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/products`,
        expect.objectContaining({ search: "test-product", limit: 1 })
      );
    });

    it("should return error if neither productId nor slug provided", async () => {
      const mockClient = createMockClient();

      const tools = createProductTools(mockClient);
      const getProduct = tools.find((t) => t.name === "get_product")!;

      const result = await getProduct.handler({});

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("productId or slug");
    });
  });

  describe("create_product", () => {
    it("should create a product", async () => {
      const mockPost = mock(() => Promise.resolve({ item: mockProduct }));

      const mockClient = createMockClient({
        post: mockPost as HttpClient["post"],
      });

      const tools = createProductTools(mockClient);
      const createProduct = tools.find((t) => t.name === "create_product")!;

      const result = await createProduct.handler({
        title: "New Product",
        slug: "new-product",
        price: 19.99,
      });

      expect(result).not.toHaveProperty("isError");
      expect(mockPost).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/products`,
        expect.objectContaining({
          title: "New Product",
          slug: "new-product",
          price: 19.99,
          status: "draft",
        })
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe("Product created successfully");
    });

    it("should validate required fields", async () => {
      const mockClient = createMockClient();

      const tools = createProductTools(mockClient);
      const createProduct = tools.find((t) => t.name === "create_product")!;

      const result = await createProduct.handler({
        title: "Missing slug and price",
      });

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.code).toBe("INVALID_INPUT");
    });

    it("should validate slug format", async () => {
      const mockClient = createMockClient();

      const tools = createProductTools(mockClient);
      const createProduct = tools.find((t) => t.name === "create_product")!;

      const result = await createProduct.handler({
        title: "Product",
        slug: "Invalid Slug!", // Invalid: spaces and special chars
        price: 10,
      });

      expect(result).toHaveProperty("isError", true);
    });
  });

  describe("update_product", () => {
    it("should update a product", async () => {
      const mockPatch = mock(() =>
        Promise.resolve({ item: { ...mockProduct, title: "Updated Title" } })
      );

      const mockClient = createMockClient({
        patch: mockPatch as HttpClient["patch"],
      });

      const tools = createProductTools(mockClient);
      const updateProduct = tools.find((t) => t.name === "update_product")!;

      const result = await updateProduct.handler({
        productId: TEST_PRODUCT_ID,
        title: "Updated Title",
        price: 39.99,
      });

      expect(result).not.toHaveProperty("isError");
      expect(mockPatch).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/products/${TEST_PRODUCT_ID}`,
        { title: "Updated Title", price: 39.99 }
      );
    });

    it("should return error if no fields to update", async () => {
      const mockClient = createMockClient();

      const tools = createProductTools(mockClient);
      const updateProduct = tools.find((t) => t.name === "update_product")!;

      const result = await updateProduct.handler({ productId: TEST_PRODUCT_ID });

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("No fields to update");
    });
  });

  describe("delete_product", () => {
    it("should delete a product", async () => {
      const mockDelete = mock(() => Promise.resolve({}));

      const mockClient = createMockClient({
        delete: mockDelete as HttpClient["delete"],
      });

      const tools = createProductTools(mockClient);
      const deleteProduct = tools.find((t) => t.name === "delete_product")!;

      const result = await deleteProduct.handler({ productId: TEST_PRODUCT_ID });

      expect(result).not.toHaveProperty("isError");
      expect(mockDelete).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/products/${TEST_PRODUCT_ID}`
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.data.deleted).toBe(true);
    });
  });

  describe("bulk_update_products", () => {
    it("should bulk publish products", async () => {
      const mockPost = mock(() =>
        Promise.resolve({ item: { action: "publish", count: 3 } })
      );

      const mockClient = createMockClient({
        post: mockPost as HttpClient["post"],
      });

      const tools = createProductTools(mockClient);
      const bulkUpdate = tools.find((t) => t.name === "bulk_update_products")!;

      const result = await bulkUpdate.handler({
        action: "publish",
        productIds: [TEST_PRODUCT_ID, TEST_PRODUCT_ID_2, TEST_PRODUCT_ID_3],
      });

      expect(result).not.toHaveProperty("isError");
      expect(mockPost).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/products/bulk`,
        {
          action: "publish",
          productIds: [TEST_PRODUCT_ID, TEST_PRODUCT_ID_2, TEST_PRODUCT_ID_3],
        }
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.data.count).toBe(3);
    });
  });

  describe("search_products", () => {
    it("should search products", async () => {
      const mockGet = mock(() =>
        Promise.resolve({
          items: [mockProduct],
          pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        })
      );

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createProductTools(mockClient);
      const searchProducts = tools.find((t) => t.name === "search_products")!;

      const result = await searchProducts.handler({ query: "test" });

      expect(result).not.toHaveProperty("isError");
      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/products`,
        expect.objectContaining({ search: "test", limit: 20 })
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.data.query).toBe("test");
    });
  });
});
