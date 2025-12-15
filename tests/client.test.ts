/**
 * HTTP Client Tests
 */

import { describe, it, expect } from "bun:test";
import { createHttpClient, ApiError } from "../src/client/index.js";

describe("HttpClient", () => {
  describe("createHttpClient", () => {
    it("should create a client with config", () => {
      const client = createHttpClient({
        baseUrl: "https://test.com",
        apiKey: "sk_test_123",
      });

      expect(client).toBeDefined();
      expect(client.getDefaultStoreId()).toBeUndefined();
      expect(client.getBaseUrl()).toBe("https://test.com");
    });

    it("should normalize base URL (remove trailing slash)", () => {
      const client = createHttpClient({
        baseUrl: "https://test.com/",
        apiKey: "sk_test_123",
      });

      expect(client.getBaseUrl()).toBe("https://test.com");
    });

    it("should store default store ID", () => {
      const client = createHttpClient({
        baseUrl: "https://test.com",
        apiKey: "sk_test_123",
        defaultStoreId: "store-123",
      });

      expect(client.getDefaultStoreId()).toBe("store-123");
    });

    it("should allow setting default store ID", () => {
      const client = createHttpClient({
        baseUrl: "https://test.com",
        apiKey: "sk_test_123",
      });

      client.setDefaultStoreId("store-456");
      expect(client.getDefaultStoreId()).toBe("store-456");
    });
  });
});

describe("ApiError", () => {
  it("should create error with code and message", () => {
    const error = new ApiError("NOT_FOUND", "Product not found");

    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("Product not found");
    expect(error.name).toBe("ApiError");
  });

  it("should include details and status code", () => {
    const error = new ApiError(
      "VALIDATION_ERROR",
      "Invalid input",
      { field: "price", reason: "must be positive" },
      400
    );

    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details).toEqual({ field: "price", reason: "must be positive" });
    expect(error.statusCode).toBe(400);
  });
});
