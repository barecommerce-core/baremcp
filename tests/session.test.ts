/**
 * Tests for Session Tools
 *
 * Note: The connect tool uses OAuth Device Flow which requires browser interaction
 * and network calls. These tests focus on disconnect, status, and diagnostics.
 */

import { describe, it, expect, mock } from "bun:test";
import { createSessionTools } from "../src/tools/session.js";
import type { HttpClient } from "../src/client/index.js";

// =============================================================================
// Test Helpers
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockClient(overrides: Record<string, any> = {}): HttpClient {
  let apiKey: string | undefined;
  let defaultStoreId: string | undefined;
  let baseUrl = "https://api.example.com";

  return {
    get: mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } })),
    post: mock(() => Promise.resolve({ item: {} })),
    put: mock(() => Promise.resolve({ item: {} })),
    patch: mock(() => Promise.resolve({ item: {} })),
    delete: mock(() => Promise.resolve({})),
    upload: mock(() => Promise.resolve({ item: {} })),
    getDefaultStoreId: () => defaultStoreId,
    setDefaultStoreId: (id: string) => {
      defaultStoreId = id;
    },
    getBaseUrl: () => baseUrl,
    isAuthenticated: () => !!apiKey,
    setApiKey: (key: string) => {
      apiKey = key;
    },
    clearAuth: () => {
      apiKey = undefined;
      defaultStoreId = undefined;
    },
    setBaseUrl: (url: string) => {
      baseUrl = url;
    },
    ...overrides,
  } as HttpClient;
}

const mockStore = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  merchantId: "merchant-123",
  name: "Test Store",
  domain: "test-store.example.com",
  status: "active",
  currency: "USD",
  timezone: "America/New_York",
};

// =============================================================================
// Tests
// =============================================================================

describe("Session Tools", () => {
  describe("connect", () => {
    it("should have connect tool available", () => {
      const mockClient = createMockClient();
      const tools = createSessionTools(mockClient);
      const connectTool = tools.find((t) => t.name === "connect");

      expect(connectTool).toBeDefined();
      expect(connectTool!.description).toContain("browser");
    });

    it("should accept optional apiUrl parameter", () => {
      const mockClient = createMockClient();
      const tools = createSessionTools(mockClient);
      const connectTool = tools.find((t) => t.name === "connect")!;

      // Check input schema has apiUrl property
      expect(connectTool.inputSchema.properties).toHaveProperty("apiUrl");
    });
  });

  describe("disconnect", () => {
    it("should disconnect when connected", async () => {
      const mockClient = createMockClient();
      mockClient.setApiKey("sk_live_test123");

      const tools = createSessionTools(mockClient);
      const disconnectTool = tools.find((t) => t.name === "disconnect")!;

      const result = await disconnectTool.handler({});

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.disconnected).toBe(true);
      expect(mockClient.isAuthenticated()).toBe(false);
    });

    it("should handle disconnect when not connected", async () => {
      const mockClient = createMockClient();

      const tools = createSessionTools(mockClient);
      const disconnectTool = tools.find((t) => t.name === "disconnect")!;

      const result = await disconnectTool.handler({});

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain("No active connection");
    });
  });

  describe("status", () => {
    it("should show not connected when no auth", async () => {
      const mockClient = createMockClient();

      const tools = createSessionTools(mockClient);
      const statusTool = tools.find((t) => t.name === "status")!;

      const result = await statusTool.handler({});

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.connected).toBe(false);
    });

    it("should show connected with store info", async () => {
      const mockClient = createMockClient({
        get: mock(() => Promise.resolve({ item: mockStore })),
      });
      mockClient.setApiKey("sk_live_test123");
      mockClient.setDefaultStoreId(mockStore.id);

      const tools = createSessionTools(mockClient);
      const statusTool = tools.find((t) => t.name === "status")!;

      const result = await statusTool.handler({});

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.connected).toBe(true);
      expect(data.data.store.name).toBe("Test Store");
    });
  });

  describe("diagnostics", () => {
    it("should have diagnostics tool available", () => {
      const mockClient = createMockClient();
      const tools = createSessionTools(mockClient);
      const diagnosticsTool = tools.find((t) => t.name === "diagnostics");

      expect(diagnosticsTool).toBeDefined();
      expect(diagnosticsTool!.description).toContain("diagnostic");
    });
  });
});
