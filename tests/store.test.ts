/**
 * Store Tools Tests
 */

import { describe, it, expect, mock } from "bun:test";
import { createStoreTools } from "../src/tools/store.js";
import type { HttpClient } from "../src/client/index.js";

// Test UUIDs
const TEST_STORE_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_STORE_ID = "00000000-0000-0000-0000-000000000000";

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

describe("Store Tools", () => {
  describe("list_stores", () => {
    it("should list all stores", async () => {
      const mockGet = mock(() =>
        Promise.resolve({
          items: [
            {
              id: TEST_STORE_ID,
              name: "Test Store",
              domain: "test.com",
              currency: "USD",
              status: "active",
              createdAt: "2024-01-01T00:00:00Z",
            },
          ],
          pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
        })
      );

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createStoreTools(mockClient);
      const listStores = tools.find((t) => t.name === "list_stores")!;

      const result = await listStores.handler({});

      expect(result).not.toHaveProperty("isError");
      expect(mockGet).toHaveBeenCalledWith("/stores");

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].name).toBe("Test Store");
    });
  });

  describe("get_store", () => {
    it("should get store by ID", async () => {
      const mockGet = mock(() =>
        Promise.resolve({
          item: {
            id: TEST_STORE_ID,
            name: "Test Store",
            domain: "test.com",
            currency: "USD",
            status: "active",
            timezone: "UTC",
            weightUnit: "kg",
            shopEmail: "shop@test.com",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        })
      );

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createStoreTools(mockClient);
      const getStore = tools.find((t) => t.name === "get_store")!;

      const result = await getStore.handler({ storeId: TEST_STORE_ID });

      expect(result).not.toHaveProperty("isError");
      expect(mockGet).toHaveBeenCalledWith(`/stores/${TEST_STORE_ID}`);

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("Test Store");
    });

    it("should use default store ID if not provided", async () => {
      const mockGet = mock(() =>
        Promise.resolve({
          item: { id: DEFAULT_STORE_ID, name: "Default Store" },
        })
      );

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
        getDefaultStoreId: () => DEFAULT_STORE_ID,
      });

      const tools = createStoreTools(mockClient);
      const getStore = tools.find((t) => t.name === "get_store")!;

      await getStore.handler({});

      expect(mockGet).toHaveBeenCalledWith(`/stores/${DEFAULT_STORE_ID}`);
    });

    it("should return error if no store ID available", async () => {
      const mockClient = createMockClient({
        getDefaultStoreId: () => undefined,
      });

      const tools = createStoreTools(mockClient);
      const getStore = tools.find((t) => t.name === "get_store")!;

      const result = await getStore.handler({});

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.code).toBe("STORE_ID_REQUIRED");
    });
  });

  describe("update_store", () => {
    it("should update store settings", async () => {
      const mockPatch = mock(() =>
        Promise.resolve({
          item: {
            id: TEST_STORE_ID,
            name: "Updated Store",
            updatedAt: "2024-01-02T00:00:00Z",
          },
        })
      );

      const mockClient = createMockClient({
        patch: mockPatch as HttpClient["patch"],
      });

      const tools = createStoreTools(mockClient);
      const updateStore = tools.find((t) => t.name === "update_store")!;

      const result = await updateStore.handler({
        storeId: TEST_STORE_ID,
        name: "Updated Store",
        currency: "EUR",
      });

      expect(result).not.toHaveProperty("isError");
      expect(mockPatch).toHaveBeenCalledWith(`/stores/${TEST_STORE_ID}`, {
        name: "Updated Store",
        currency: "EUR",
      });
    });

    it("should return error if no fields to update", async () => {
      const mockClient = createMockClient();

      const tools = createStoreTools(mockClient);
      const updateStore = tools.find((t) => t.name === "update_store")!;

      // Only storeId provided, no actual fields to update
      const result = await updateStore.handler({ storeId: TEST_STORE_ID });

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("No fields to update");
    });
  });
});
