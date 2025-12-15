/**
 * Tests for Page Tools
 */

import { describe, it, expect, mock } from "bun:test";
import { createPageTools } from "../src/tools/pages.js";
import type { HttpClient } from "../src/client/index.js";
import type { Page } from "../src/client/index.js";

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

const mockPage: Page = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  storeId: "550e8400-e29b-41d4-a716-446655440000",
  title: "About Us",
  slug: "about-us",
  status: "published",
  body: "<h1>About Our Company</h1><p>We are a great company.</p>",
  bodyFormat: "html",
  seoTitle: "About Us - Our Company",
  seoDescription: "Learn more about our company history and values",
  seoKeywords: "about, company, history",
  seoImageId: null,
  createdAt: "2024-01-10T10:00:00Z",
  updatedAt: "2024-01-15T12:00:00Z",
};

// =============================================================================
// Tests
// =============================================================================

describe("Page Tools", () => {
  describe("list_pages", () => {
    it("should list pages with default parameters", async () => {
      const mockClient = createMockClient({
        get: mock(() =>
          Promise.resolve({
            items: [mockPage],
            pagination: { total: 1, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false },
          })
        ),
      });

      const tools = createPageTools(mockClient);
      const listTool = tools.find((t) => t.name === "list_pages")!;

      const result = await listTool.handler({});

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].title).toBe("About Us");
      expect(mockClient.get).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/pages",
        {
          limit: 50,
          offset: 0,
          sortBy: "createdAt",
          sortOrder: "desc",
        }
      );
    });

    it("should filter by status and search", async () => {
      const mockClient = createMockClient({
        get: mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } })),
      });

      const tools = createPageTools(mockClient);
      const listTool = tools.find((t) => t.name === "list_pages")!;

      await listTool.handler({
        status: "published",
        search: "about",
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/pages",
        {
          limit: 50,
          offset: 0,
          sortBy: "createdAt",
          sortOrder: "desc",
          status: "published",
          search: "about",
        }
      );
    });
  });

  describe("get_page", () => {
    it("should get page by ID", async () => {
      const mockClient = createMockClient({
        get: mock(() => Promise.resolve({ item: mockPage })),
      });

      const tools = createPageTools(mockClient);
      const getTool = tools.find((t) => t.name === "get_page")!;

      const result = await getTool.handler({
        pageId: mockPage.id,
      });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe("About Us");
      expect(data.data.body).toContain("About Our Company");
    });

    it("should get page by slug", async () => {
      const mockClient = createMockClient({
        get: mock(() =>
          Promise.resolve({
            items: [mockPage],
            pagination: { total: 1, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false },
          })
        ),
      });

      const tools = createPageTools(mockClient);
      const getTool = tools.find((t) => t.name === "get_page")!;

      const result = await getTool.handler({ slug: "about-us" });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.slug).toBe("about-us");
    });

    it("should error when neither pageId nor slug provided", async () => {
      const mockClient = createMockClient();
      const tools = createPageTools(mockClient);
      const getTool = tools.find((t) => t.name === "get_page")!;

      const result = await getTool.handler({});

      expect(result).toHaveProperty("isError", true);
      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("pageId or slug");
    });

    it("should error when page not found by slug", async () => {
      const mockClient = createMockClient({
        get: mock(() => Promise.resolve({ items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false } })),
      });

      const tools = createPageTools(mockClient);
      const getTool = tools.find((t) => t.name === "get_page")!;

      const result = await getTool.handler({ slug: "nonexistent" });

      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("not found");
    });
  });

  describe("create_page", () => {
    it("should create a page with required fields", async () => {
      const mockClient = createMockClient({
        post: mock(() => Promise.resolve({ item: mockPage })),
      });

      const tools = createPageTools(mockClient);
      const createTool = tools.find((t) => t.name === "create_page")!;

      const result = await createTool.handler({
        title: "About Us",
        slug: "about-us",
      });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe("Page created successfully");
      expect(mockClient.post).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/pages",
        {
          title: "About Us",
          slug: "about-us",
          bodyFormat: "html",
          status: "draft",
        }
      );
    });

    it("should create a page with body and format", async () => {
      const mockClient = createMockClient({
        post: mock(() => Promise.resolve({ item: mockPage })),
      });

      const tools = createPageTools(mockClient);
      const createTool = tools.find((t) => t.name === "create_page")!;

      await createTool.handler({
        title: "About Us",
        slug: "about-us",
        body: "# About\n\nWe are great.",
        bodyFormat: "markdown",
        status: "published",
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        "/stores/550e8400-e29b-41d4-a716-446655440000/pages",
        {
          title: "About Us",
          slug: "about-us",
          body: "# About\n\nWe are great.",
          bodyFormat: "markdown",
          status: "published",
        }
      );
    });
  });

  describe("update_page", () => {
    it("should update page fields", async () => {
      const mockClient = createMockClient({
        put: mock(() =>
          Promise.resolve({
            item: { ...mockPage, title: "Updated Title" },
          })
        ),
      });

      const tools = createPageTools(mockClient);
      const updateTool = tools.find((t) => t.name === "update_page")!;

      const result = await updateTool.handler({
        pageId: mockPage.id,
        title: "Updated Title",
        status: "draft",
      });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(mockClient.patch).toHaveBeenCalledWith(
        `/stores/550e8400-e29b-41d4-a716-446655440000/pages/${mockPage.id}`,
        {
          title: "Updated Title",
          status: "draft",
        }
      );
    });

    it("should error when no fields to update", async () => {
      const mockClient = createMockClient();
      const tools = createPageTools(mockClient);
      const updateTool = tools.find((t) => t.name === "update_page")!;

      const result = await updateTool.handler({
        pageId: mockPage.id,
      });

      const data = JSON.parse(result.content[0]!.text);
      expect(data.message).toContain("No fields to update");
    });
  });

  describe("delete_page", () => {
    it("should delete a page", async () => {
      const mockClient = createMockClient({
        delete: mock(() => Promise.resolve({})),
      });

      const tools = createPageTools(mockClient);
      const deleteTool = tools.find((t) => t.name === "delete_page")!;

      const result = await deleteTool.handler({
        pageId: mockPage.id,
      });

      expect(result).not.toHaveProperty("isError");
      const data = JSON.parse(result.content[0]!.text);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
      expect(mockClient.delete).toHaveBeenCalledWith(
        `/stores/550e8400-e29b-41d4-a716-446655440000/pages/${mockPage.id}`
      );
    });
  });
});
