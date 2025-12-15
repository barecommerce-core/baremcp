/**
 * Tests for Resources
 */

import { describe, it, expect, mock } from "bun:test";
import { createResources } from "../src/resources/index.js";
import type { HttpClient } from "../src/client/index.js";
import type { Store } from "../src/client/index.js";

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

const mockStore: Store = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  merchantId: "merchant-123",
  name: "Test Store",
  domain: "test-store.example.com",
  status: "active",
  currency: "USD",
  timezone: "America/New_York",
  weightUnit: "lb",
  shopEmail: "shop@example.com",
  shopPhone: "+1-555-1234",
  shopDescription: "A test store",
  shopIndustry: "retail",
  businessAddress1: "123 Main St",
  businessAddress2: null,
  businessCity: "New York",
  businessRegion: "NY",
  businessZip: "10001",
  businessCountry: "US",
  orderNumberPrefix: "ORD-",
  logoMediaId: null,
  faviconMediaId: null,
  attributeSchema: { size: { label: "Size" }, color: { label: "Color" } },
  metafieldSchema: { material: { type: "string" } },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-15T00:00:00Z",
};

// =============================================================================
// Tests
// =============================================================================

describe("Resources", () => {
  describe("store://config", () => {
    it("should return store configuration", async () => {
      const mockClient = createMockClient({
        get: mock(() => Promise.resolve({ item: mockStore })),
      });

      const resources = createResources(mockClient);
      const configResource = resources.find((r) => r.uri === "store://config")!;

      const result = await configResource.handler();
      const data = JSON.parse(result);

      expect(data.id).toBe(mockStore.id);
      expect(data.name).toBe("Test Store");
      expect(data.currency).toBe("USD");
      expect(data.timezone).toBe("America/New_York");
      expect(data.contact.email).toBe("shop@example.com");
    });

    it("should return error when no store configured", async () => {
      const mockClient = createMockClient({
        getDefaultStoreId: () => undefined,
      });

      const resources = createResources(mockClient);
      const configResource = resources.find((r) => r.uri === "store://config")!;

      const result = await configResource.handler();
      const data = JSON.parse(result);

      expect(data.error).toBe("No default store configured");
    });
  });

  describe("store://schema", () => {
    it("should return attribute and metafield schemas", async () => {
      const mockClient = createMockClient({
        get: mock(() => Promise.resolve({ item: mockStore })),
      });

      const resources = createResources(mockClient);
      const schemaResource = resources.find((r) => r.uri === "store://schema")!;

      const result = await schemaResource.handler();
      const data = JSON.parse(result);

      expect(data.attributeSchema).toHaveProperty("size");
      expect(data.attributeSchema.size.label).toBe("Size");
      expect(data.metafieldSchema).toHaveProperty("material");
    });
  });

  describe("store://categories", () => {
    it("should return category tree", async () => {
      const mockClient = createMockClient({
        get: mock(() =>
          Promise.resolve({
            items: [
              {
                id: "cat-1",
                name: "Electronics",
                slug: "electronics",
                parentId: null,
                status: "published",
                productCount: 50,
              },
              {
                id: "cat-2",
                name: "Laptops",
                slug: "laptops",
                parentId: "cat-1",
                status: "published",
                productCount: 20,
              },
              {
                id: "cat-3",
                name: "Clothing",
                slug: "clothing",
                parentId: null,
                status: "published",
                productCount: 30,
              },
            ],
            pagination: { total: 3, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false },
          })
        ),
      });

      const resources = createResources(mockClient);
      const catResource = resources.find((r) => r.uri === "store://categories")!;

      const result = await catResource.handler();
      const data = JSON.parse(result);

      expect(data.total).toBe(3);
      expect(data.tree).toHaveLength(2); // 2 root categories
      expect(data.tree[0].name).toBe("Electronics");
      expect(data.tree[0].children).toHaveLength(1);
      expect(data.tree[0].children[0].name).toBe("Laptops");
    });
  });

  describe("resource list", () => {
    it("should have all expected resources", () => {
      const mockClient = createMockClient();
      const resources = createResources(mockClient);

      const uris = resources.map((r) => r.uri);
      expect(uris).toContain("store://config");
      expect(uris).toContain("store://schema");
      expect(uris).toContain("store://categories");
      expect(resources).toHaveLength(3);
    });
  });
});
