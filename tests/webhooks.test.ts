/**
 * Tests for Webhook Tools
 */

import { describe, it, expect, mock } from "bun:test";
import { createWebhookTools } from "../src/tools/webhooks.js";
import type { HttpClient } from "../src/client/index.js";
import type { Webhook } from "../src/client/index.js";

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

const mockWebhook: Webhook = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  storeId: "550e8400-e29b-41d4-a716-446655440000",
  url: "https://example.com/webhooks/orders",
  events: ["order.created", "order.fulfilled"],
  secret: "whsec_abc123secretkey456",
  isActive: true,
  description: "Order notifications webhook",
  lastTriggeredAt: "2024-01-20T15:30:00Z",
  failureCount: 0,
  createdAt: "2024-01-10T10:00:00Z",
  updatedAt: "2024-01-15T12:00:00Z",
};

// =============================================================================
// Tests
// =============================================================================

describe("Webhook Tools", () => {
  describe("list_webhooks", () => {
    it("should list webhooks with default parameters", async () => {
      const mockClient = createMockClient({
        get: mock(() =>
          Promise.resolve({
            items: [mockWebhook],
            pagination: { total: 1, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false },
          })
        ),
      });

      const tools = createWebhookTools(mockClient);
      const listTool = tools.find((t) => t.name === "list_webhooks")!;

      const result = await listTool.handler({});

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].url).toBe("https://example.com/webhooks/orders");
      expect(data.data.items[0].events).toContain("order.created");
      expect(mockClient.get).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/webhooks",
        {
          limit: 50,
          offset: 0,
        }
      );
    });

    it("should filter by event type", async () => {
      const mockClient = createMockClient({
        get: mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } })),
      });

      const tools = createWebhookTools(mockClient);
      const listTool = tools.find((t) => t.name === "list_webhooks")!;

      await listTool.handler({
        event: "order.created",
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/webhooks",
        {
          limit: 50,
          offset: 0,
          event: "order.created",
        }
      );
    });

    it("should filter by active status", async () => {
      const mockClient = createMockClient({
        get: mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } })),
      });

      const tools = createWebhookTools(mockClient);
      const listTool = tools.find((t) => t.name === "list_webhooks")!;

      await listTool.handler({
        isActive: true,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/webhooks",
        {
          limit: 50,
          offset: 0,
          isActive: true,
        }
      );
    });
  });

  describe("create_webhook", () => {
    it("should create a webhook with required fields", async () => {
      const mockClient = createMockClient({
        post: mock(() => Promise.resolve({ item: mockWebhook })),
      });

      const tools = createWebhookTools(mockClient);
      const createTool = tools.find((t) => t.name === "create_webhook")!;

      const result = await createTool.handler({
        url: "https://example.com/webhooks/orders",
        events: ["order.created", "order.fulfilled"],
      });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe("Webhook created successfully");
      // Secret should be masked
      expect(data.data.webhook.secret).toBe("********");
      expect(mockClient.post).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/webhooks",
        {
          url: "https://example.com/webhooks/orders",
          events: ["order.created", "order.fulfilled"],
          isActive: true,
        }
      );
    });

    it("should create a webhook with optional fields", async () => {
      const mockClient = createMockClient({
        post: mock(() => Promise.resolve({ item: mockWebhook })),
      });

      const tools = createWebhookTools(mockClient);
      const createTool = tools.find((t) => t.name === "create_webhook")!;

      await createTool.handler({
        url: "https://example.com/webhooks/orders",
        events: ["order.created"],
        secret: "my-secret-key-1234567890",
        description: "Order notifications",
        isActive: false,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/webhooks",
        {
          url: "https://example.com/webhooks/orders",
          events: ["order.created"],
          secret: "my-secret-key-1234567890",
          description: "Order notifications",
          isActive: false,
        }
      );
    });
  });

  describe("update_webhook", () => {
    it("should update webhook fields", async () => {
      const mockClient = createMockClient({
        put: mock(() =>
          Promise.resolve({
            item: { ...mockWebhook, isActive: false },
          })
        ),
      });

      const tools = createWebhookTools(mockClient);
      const updateTool = tools.find((t) => t.name === "update_webhook")!;

      const result = await updateTool.handler({
        webhookId: mockWebhook.id,
        isActive: false,
        url: "https://example.com/webhooks/v2/orders",
      });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(mockClient.patch).toHaveBeenCalledWith(
        `/stores/550e8400-e29b-41d4-a716-446655440000/webhooks/${mockWebhook.id}`,
        {
          isActive: false,
          url: "https://example.com/webhooks/v2/orders",
        }
      );
    });

    it("should update webhook events", async () => {
      const mockClient = createMockClient({
        patch: mock(() => Promise.resolve({ item: mockWebhook })),
      });

      const tools = createWebhookTools(mockClient);
      const updateTool = tools.find((t) => t.name === "update_webhook")!;

      await updateTool.handler({
        webhookId: mockWebhook.id,
        events: ["product.created", "product.updated", "product.deleted"],
      });

      expect(mockClient.patch).toHaveBeenCalledWith(
        `/stores/550e8400-e29b-41d4-a716-446655440000/webhooks/${mockWebhook.id}`,
        {
          events: ["product.created", "product.updated", "product.deleted"],
        }
      );
    });

    it("should error when no fields to update", async () => {
      const mockClient = createMockClient();
      const tools = createWebhookTools(mockClient);
      const updateTool = tools.find((t) => t.name === "update_webhook")!;

      const result = await updateTool.handler({
        webhookId: mockWebhook.id,
      });

      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("No fields to update");
    });
  });

  describe("delete_webhook", () => {
    it("should delete a webhook", async () => {
      const mockClient = createMockClient({
        delete: mock(() => Promise.resolve({})),
      });

      const tools = createWebhookTools(mockClient);
      const deleteTool = tools.find((t) => t.name === "delete_webhook")!;

      const result = await deleteTool.handler({
        webhookId: mockWebhook.id,
      });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
      expect(mockClient.delete).toHaveBeenCalledWith(
        `/stores/550e8400-e29b-41d4-a716-446655440000/webhooks/${mockWebhook.id}`
      );
    });
  });
});
