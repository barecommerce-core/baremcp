/**
 * Audit Tools Tests
 */

import { describe, it, expect, mock } from "bun:test";
import { createAuditTools } from "../src/tools/audit.js";
import type { HttpClient } from "../src/client/index.js";

// Test UUIDs
const DEFAULT_STORE_ID = "00000000-0000-0000-0000-000000000000";
const TEST_LOG_ID = "99999999-9999-9999-9999-999999999999";
const TEST_ACTOR_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TEST_RESOURCE_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

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

const mockAuditLog = {
  id: TEST_LOG_ID,
  storeId: DEFAULT_STORE_ID,
  actorId: TEST_ACTOR_ID,
  actorType: "api_key",
  action: "update",
  resourceId: TEST_RESOURCE_ID,
  resourceType: "product",
  diff: {
    before: { title: "Old Title", price: "10.00" },
    after: { title: "New Title", price: "15.00" },
  },
  ipAddress: "192.168.1.1",
  createdAt: "2024-01-01T00:00:00Z",
};

describe("Audit Tools", () => {
  describe("list_audit_logs", () => {
    it("should list audit logs with default parameters", async () => {
      const mockGet = mock(() =>
        Promise.resolve({
          items: [mockAuditLog],
          pagination: { total: 1, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false },
        })
      );

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createAuditTools(mockClient);
      const listLogs = tools.find((t) => t.name === "list_audit_logs")!;

      const result = await listLogs.handler({});

      expect(result).not.toHaveProperty("isError");
      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/audit-logs`,
        expect.objectContaining({
          limit: 50,
          offset: 0,
          sortOrder: "desc",
        })
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].action).toBe("update");
      expect(data.data.items[0].resourceType).toBe("product");
    });

    it("should filter by action type", async () => {
      const mockGet = mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } }));

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createAuditTools(mockClient);
      const listLogs = tools.find((t) => t.name === "list_audit_logs")!;

      await listLogs.handler({ action: "create" });

      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/audit-logs`,
        expect.objectContaining({ action: "create" })
      );
    });

    it("should filter by resource type", async () => {
      const mockGet = mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } }));

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createAuditTools(mockClient);
      const listLogs = tools.find((t) => t.name === "list_audit_logs")!;

      await listLogs.handler({ resourceType: "product" });

      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/audit-logs`,
        expect.objectContaining({ resourceType: "product" })
      );
    });

    it("should filter by date range", async () => {
      const mockGet = mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } }));

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createAuditTools(mockClient);
      const listLogs = tools.find((t) => t.name === "list_audit_logs")!;

      await listLogs.handler({
        dateFrom: "2024-01-01",
        dateTo: "2024-01-31",
      });

      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/audit-logs`,
        expect.objectContaining({
          dateFrom: "2024-01-01",
          dateTo: "2024-01-31",
        })
      );
    });
  });

  describe("get_audit_log", () => {
    it("should get audit log by ID", async () => {
      const mockGet = mock(() => Promise.resolve({ item: mockAuditLog }));

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createAuditTools(mockClient);
      const getLog = tools.find((t) => t.name === "get_audit_log")!;

      const result = await getLog.handler({ logId: TEST_LOG_ID });

      expect(result).not.toHaveProperty("isError");
      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/audit-logs/${TEST_LOG_ID}`
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.action).toBe("update");
      expect(data.data.diff.before.title).toBe("Old Title");
      expect(data.data.diff.after.title).toBe("New Title");
    });

    it("should require logId", async () => {
      const mockClient = createMockClient();

      const tools = createAuditTools(mockClient);
      const getLog = tools.find((t) => t.name === "get_audit_log")!;

      const result = await getLog.handler({});

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.code).toBe("INVALID_INPUT");
    });
  });

  describe("recover_deleted_resource", () => {
    const mockDeletedProductLog = {
      ...mockAuditLog,
      action: "delete",
      resourceType: "product",
    };

    it("should recover a deleted product", async () => {
      const mockGet = mock(() => Promise.resolve({ item: mockDeletedProductLog }));
      const mockPost = mock(() =>
        Promise.resolve({
          message: "product recovered successfully",
          resourceId: TEST_RESOURCE_ID,
          resourceType: "product",
        })
      );

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
        post: mockPost as HttpClient["post"],
      });

      const tools = createAuditTools(mockClient);
      const recoverTool = tools.find((t) => t.name === "recover_deleted_resource")!;

      const result = await recoverTool.handler({ logId: TEST_LOG_ID });

      expect(result).not.toHaveProperty("isError");
      expect(mockGet).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/audit-logs/${TEST_LOG_ID}`
      );
      expect(mockPost).toHaveBeenCalledWith(
        `/stores/${DEFAULT_STORE_ID}/audit-logs/${TEST_LOG_ID}/recover`,
        {}
      );

      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.recovered).toBe(true);
      expect(data.data.resourceType).toBe("product");
    });

    it("should reject recovery of non-delete actions", async () => {
      const mockUpdateLog = { ...mockAuditLog, action: "update" };
      const mockGet = mock(() => Promise.resolve({ item: mockUpdateLog }));

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createAuditTools(mockClient);
      const recoverTool = tools.find((t) => t.name === "recover_deleted_resource")!;

      const result = await recoverTool.handler({ logId: TEST_LOG_ID });

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("Only \"delete\" actions can be recovered");
    });

    it("should reject recovery of api_key resources", async () => {
      const mockApiKeyLog = { ...mockDeletedProductLog, resourceType: "api_key" };
      const mockGet = mock(() => Promise.resolve({ item: mockApiKeyLog }));

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createAuditTools(mockClient);
      const recoverTool = tools.find((t) => t.name === "recover_deleted_resource")!;

      const result = await recoverTool.handler({ logId: TEST_LOG_ID });

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("API keys cannot be recovered");
    });

    it("should reject recovery of media resources", async () => {
      const mockMediaLog = { ...mockDeletedProductLog, resourceType: "media" };
      const mockGet = mock(() => Promise.resolve({ item: mockMediaLog }));

      const mockClient = createMockClient({
        get: mockGet as HttpClient["get"],
      });

      const tools = createAuditTools(mockClient);
      const recoverTool = tools.find((t) => t.name === "recover_deleted_resource")!;

      const result = await recoverTool.handler({ logId: TEST_LOG_ID });

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("Media files are permanently deleted");
    });

    it("should require logId", async () => {
      const mockClient = createMockClient();

      const tools = createAuditTools(mockClient);
      const recoverTool = tools.find((t) => t.name === "recover_deleted_resource")!;

      const result = await recoverTool.handler({});

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.code).toBe("INVALID_INPUT");
    });
  });
});
