/**
 * Order Tools Tests
 */

import { describe, it, expect, mock } from "bun:test";
import { createOrderTools } from "../src/tools/orders.js";
import type { HttpClient } from "../src/client/index.js";

// Test UUIDs
const DEFAULT_STORE_ID = "00000000-0000-0000-0000-000000000000";
const TEST_ORDER_ID = "55555555-5555-5555-5555-555555555555";
const TEST_CUSTOMER_ID = "66666666-6666-6666-6666-666666666666";

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

const mockOrder = {
  id: TEST_ORDER_ID,
  storeId: DEFAULT_STORE_ID,
  customerId: TEST_CUSTOMER_ID,
  orderNumber: "ORD-000001",
  status: "paid",
  currency: "USD",
  subtotal: "100.00",
  tax: "10.00",
  taxRate: "0.10",
  shipping: "5.00",
  discount: null,
  discountCode: null,
  total: "115.00",
  paymentProvider: "stripe",
  paymentId: "pi_123",
  paymentStatus: "succeeded",
  paymentMethod: "card",
  shippingAddress: {
    address1: "123 Main St",
    city: "New York",
    postalCode: "10001",
    country: "US",
  },
  billingAddress: null,
  customerNote: null,
  merchantNote: "VIP customer",
  items: [
    {
      id: "item-1",
      productId: "prod-1",
      titleSnapshot: "Test Product",
      skuSnapshot: "TEST-001",
      variantTitle: null,
      attributesSnapshot: null,
      unitPrice: "50.00",
      quantity: 2,
      lineDiscount: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ],
  placedAt: "2024-01-01T00:00:00Z",
  paidAt: "2024-01-01T00:00:00Z",
  fulfilledAt: null,
  cancelledAt: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("Order Tools", () => {
  describe("list_orders", () => {
    it("should list orders with default parameters", async () => {
      const mockGet = mock(() =>
        Promise.resolve({
          items: [mockOrder],
          pagination: { total: 1, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false },
        })
      );

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createOrderTools(mockClient);
      const listOrders = tools.find((t) => t.name === "list_orders")!;

      const result = await listOrders.handler({});

      expect(result).not.toHaveProperty("isError");
      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/orders`,
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
      expect(data.data.items[0].orderNumber).toBe("ORD-000001");
    });

    it("should filter by status", async () => {
      const mockGet = mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } }));

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createOrderTools(mockClient);
      const listOrders = tools.find((t) => t.name === "list_orders")!;

      await listOrders.handler({ status: "pending" });

      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/orders`,
        expect.objectContaining({ status: "pending" })
      );
    });
  });

  describe("get_order", () => {
    it("should get order by ID", async () => {
      const mockGet = mock(() => Promise.resolve({ item: mockOrder }));

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createOrderTools(mockClient);
      const getOrder = tools.find((t) => t.name === "get_order")!;

      const result = await getOrder.handler({ orderId: TEST_ORDER_ID });

      expect(result).not.toHaveProperty("isError");
      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/orders/${TEST_ORDER_ID}`
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.orderNumber).toBe("ORD-000001");
      expect(data.data.items).toHaveLength(1);
    });

    it("should return error if neither orderId nor orderNumber provided", async () => {
      const mockClient = createMockClient();

      const tools = createOrderTools(mockClient);
      const getOrder = tools.find((t) => t.name === "get_order")!;

      const result = await getOrder.handler({});

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("orderId or orderNumber");
    });
  });

  describe("update_order_notes", () => {
    it("should update merchant notes", async () => {
      const mockPatch = mock(() =>
        Promise.resolve({
          item: { ...mockOrder, merchantNote: "Updated note" },
        })
      );

      const mockClient = createMockClient({
        patch: mockPatch as HttpClient["patch"],
      });

      const tools = createOrderTools(mockClient);
      const updateNotes = tools.find((t) => t.name === "update_order_notes")!;

      const result = await updateNotes.handler({
        orderId: TEST_ORDER_ID,
        merchantNote: "Updated note",
      });

      expect(result).not.toHaveProperty("isError");
      expect(mockPatch).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/orders/${TEST_ORDER_ID}`,
        { merchantNote: "Updated note" }
      );
    });
  });

  describe("record_refund", () => {
    it("should record a refund", async () => {
      const mockPost = mock(() =>
        Promise.resolve({
          success: true,
          order: { ...mockOrder, paymentStatus: "refunded" },
          refundedAmount: "50.00",
        })
      );

      const mockClient = createMockClient({
        post: mockPost as HttpClient["post"],
      });

      const tools = createOrderTools(mockClient);
      const recordRefund = tools.find((t) => t.name === "record_refund")!;

      const result = await recordRefund.handler({
        orderId: TEST_ORDER_ID,
        amount: 50.0,
        reason: "Customer request",
      });

      expect(result).not.toHaveProperty("isError");
      expect(mockPost).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/orders/${TEST_ORDER_ID}/refund`,
        { amount: 50.0, reason: "Customer request" }
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.data.refundedAmount).toBe("50.00");
    });
  });

  describe("export_orders", () => {
    it("should export orders to CSV", async () => {
      const mockPost = mock(() =>
        Promise.resolve({
          downloadUrl: "https://example.com/export.csv",
          count: 10,
        })
      );

      const mockClient = createMockClient({
        post: mockPost as HttpClient["post"],
      });

      const tools = createOrderTools(mockClient);
      const exportOrders = tools.find((t) => t.name === "export_orders")!;

      const result = await exportOrders.handler({ format: "csv" });

      expect(result).not.toHaveProperty("isError");

      const data = JSON.parse(result.content[0]!.text);
      expect(data.data.count).toBe(10);
      expect(data.data.downloadUrl).toBe("https://example.com/export.csv");
    });
  });
});
