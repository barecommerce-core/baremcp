/**
 * Customer Tools Tests
 */

import { describe, it, expect, mock } from "bun:test";
import { createCustomerTools } from "../src/tools/customers.js";
import type { HttpClient } from "../src/client/index.js";

// Test UUIDs
const DEFAULT_STORE_ID = "00000000-0000-0000-0000-000000000000";
const TEST_CUSTOMER_ID = "77777777-7777-7777-7777-777777777777";
const TEST_ADDRESS_ID = "88888888-8888-8888-8888-888888888888";

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

const mockCustomer = {
  id: TEST_CUSTOMER_ID,
  storeId: DEFAULT_STORE_ID,
  email: "john@example.com",
  name: "John Doe",
  phone: "+1234567890",
  marketingOptIn: true,
  defaultAddressId: TEST_ADDRESS_ID,
  addresses: [
    {
      id: TEST_ADDRESS_ID,
      customerId: TEST_CUSTOMER_ID,
      address1: "123 Main St",
      address2: null,
      city: "New York",
      region: "NY",
      postalCode: "10001",
      country: "US",
      firstName: "John",
      lastName: "Doe",
      company: null,
      phone: "+1234567890",
      isDefault: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("Customer Tools", () => {
  describe("list_customers", () => {
    it("should list customers with default parameters", async () => {
      const mockGet = mock(() =>
        Promise.resolve({
          items: [mockCustomer],
          pagination: { total: 1, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false },
        })
      );

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createCustomerTools(mockClient);
      const listCustomers = tools.find((t) => t.name === "list_customers")!;

      const result = await listCustomers.handler({});

      expect(result).not.toHaveProperty("isError");
      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/customers`,
        expect.objectContaining({
          limit: 50,
          offset: 0,
          sortBy: "createdAt",
          sortOrder: "desc",
        })
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].email).toBe("john@example.com");
    });

    it("should search customers", async () => {
      const mockGet = mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } }));

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createCustomerTools(mockClient);
      const listCustomers = tools.find((t) => t.name === "list_customers")!;

      await listCustomers.handler({ search: "john" });

      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/customers`,
        expect.objectContaining({ search: "john" })
      );
    });
  });

  describe("get_customer", () => {
    it("should get customer by ID", async () => {
      const mockGet = mock(() => Promise.resolve({ item: mockCustomer }));

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createCustomerTools(mockClient);
      const getCustomer = tools.find((t) => t.name === "get_customer")!;

      const result = await getCustomer.handler({ customerId: TEST_CUSTOMER_ID });

      expect(result).not.toHaveProperty("isError");
      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/customers/${TEST_CUSTOMER_ID}`
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.email).toBe("john@example.com");
      expect(data.data.addresses).toHaveLength(1);
    });

    it("should return error if neither customerId nor email provided", async () => {
      const mockClient = createMockClient();

      const tools = createCustomerTools(mockClient);
      const getCustomer = tools.find((t) => t.name === "get_customer")!;

      const result = await getCustomer.handler({});

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("customerId or email");
    });
  });

  describe("create_customer", () => {
    it("should create a customer", async () => {
      const mockPost = mock(() => Promise.resolve({ item: mockCustomer }));

      const mockClient = createMockClient({
        post: mockPost as HttpClient["post"],
      });

      const tools = createCustomerTools(mockClient);
      const createCustomer = tools.find((t) => t.name === "create_customer")!;

      const result = await createCustomer.handler({
        email: "john@example.com",
        name: "John Doe",
      });

      expect(result).not.toHaveProperty("isError");
      expect(mockPost).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/customers`,
        expect.objectContaining({
          email: "john@example.com",
          name: "John Doe",
        })
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe("Customer created successfully");
    });

    it("should validate email is required", async () => {
      const mockClient = createMockClient();

      const tools = createCustomerTools(mockClient);
      const createCustomer = tools.find((t) => t.name === "create_customer")!;

      const result = await createCustomer.handler({ name: "John Doe" });

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.code).toBe("INVALID_INPUT");
    });
  });

  describe("update_customer", () => {
    it("should update a customer", async () => {
      const mockPatch = mock(() =>
        Promise.resolve({ item: { ...mockCustomer, name: "Jane Doe" } })
      );

      const mockClient = createMockClient({
        patch: mockPatch as HttpClient["patch"],
      });

      const tools = createCustomerTools(mockClient);
      const updateCustomer = tools.find((t) => t.name === "update_customer")!;

      const result = await updateCustomer.handler({
        customerId: TEST_CUSTOMER_ID,
        name: "Jane Doe",
      });

      expect(result).not.toHaveProperty("isError");
      expect(mockPatch).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/customers/${TEST_CUSTOMER_ID}`,
        { name: "Jane Doe" }
      );
    });

    it("should return error if no fields to update", async () => {
      const mockClient = createMockClient();

      const tools = createCustomerTools(mockClient);
      const updateCustomer = tools.find((t) => t.name === "update_customer")!;

      const result = await updateCustomer.handler({
        customerId: TEST_CUSTOMER_ID,
      });

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("No fields to update");
    });
  });

  describe("delete_customer", () => {
    it("should delete a customer", async () => {
      const mockDelete = mock(() => Promise.resolve({}));

      const mockClient = createMockClient({
        delete: mockDelete as HttpClient["delete"],
      });

      const tools = createCustomerTools(mockClient);
      const deleteCustomer = tools.find((t) => t.name === "delete_customer")!;

      const result = await deleteCustomer.handler({
        customerId: TEST_CUSTOMER_ID,
      });

      expect(result).not.toHaveProperty("isError");
      expect(mockDelete).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/customers/${TEST_CUSTOMER_ID}`
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.data.deleted).toBe(true);
    });
  });
});
