/**
 * Error Handling Tests
 */

import { describe, it, expect } from "bun:test";
import { z } from "zod";
import {
  ApiError,
  ConfigError,
  StoreIdRequiredError,
  formatError,
  formatSuccess,
} from "../src/client/index.js";

describe("Error Classes", () => {
  describe("ApiError", () => {
    it("should create error with code and message", () => {
      const error = new ApiError("NOT_FOUND", "Resource not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("Resource not found");
      expect(error.name).toBe("ApiError");
    });

    it("should include details and status code", () => {
      const error = new ApiError(
        "VALIDATION_ERROR",
        "Invalid input",
        { field: "email" },
        400
      );
      expect(error.details).toEqual({ field: "email" });
      expect(error.statusCode).toBe(400);
    });
  });

  describe("ConfigError", () => {
    it("should create config error", () => {
      const error = new ConfigError("Missing API key");
      expect(error.message).toBe("Missing API key");
      expect(error.name).toBe("ConfigError");
    });
  });

  describe("StoreIdRequiredError", () => {
    it("should create store ID required error with helpful message", () => {
      const error = new StoreIdRequiredError();
      expect(error.name).toBe("StoreIdRequiredError");
      expect(error.message).toContain("storeId is required");
      expect(error.message).toContain("connect");
    });
  });
});

describe("Error Formatting", () => {
  describe("formatError", () => {
    it("should format ApiError", () => {
      const error = new ApiError("NOT_FOUND", "Product not found", { id: "123" });
      const result = formatError(error);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]!.type).toBe("text");

      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.code).toBe("NOT_FOUND");
      expect(parsed.message).toBe("Product not found");
      expect(parsed.details).toEqual({ id: "123" });
    });

    it("should format ZodError", () => {
      const schema = z.object({ name: z.string() });
      let zodError: z.ZodError | null = null;

      try {
        schema.parse({ name: 123 });
      } catch (e) {
        zodError = e as z.ZodError;
      }

      const result = formatError(zodError);

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.code).toBe("INVALID_INPUT");
      expect(parsed.message).toBe("Validation failed");
      expect(parsed.details).toBeInstanceOf(Array);
    });

    it("should format StoreIdRequiredError", () => {
      const error = new StoreIdRequiredError();
      const result = formatError(error);

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.code).toBe("STORE_ID_REQUIRED");
    });

    it("should format ConfigError", () => {
      const error = new ConfigError("Missing API URL");
      const result = formatError(error);

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.code).toBe("CONFIG_ERROR");
      expect(parsed.message).toBe("Missing API URL");
    });

    it("should format unknown errors", () => {
      const error = new Error("Something went wrong");
      const result = formatError(error);

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.code).toBe("UNKNOWN_ERROR");
      expect(parsed.message).toBe("Something went wrong");
    });

    it("should handle non-Error objects", () => {
      const result = formatError("string error");

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.code).toBe("UNKNOWN_ERROR");
    });
  });

  describe("formatSuccess", () => {
    it("should format success response", () => {
      const data = { id: "123", name: "Test" };
      const result = formatSuccess(data);

      expect(result).not.toHaveProperty("isError");
      expect(result.content).toHaveLength(1);
      expect(result.content[0]!.type).toBe("text");

      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual(data);
    });

    it("should handle arrays", () => {
      const data = [1, 2, 3];
      const result = formatSuccess(data);

      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.data).toEqual([1, 2, 3]);
    });

    it("should handle null", () => {
      const result = formatSuccess(null);

      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.data).toBeNull();
    });
  });
});
