/**
 * Tests for Prompts
 */

import { describe, it, expect } from "bun:test";
import { createPrompts } from "../src/prompts/index.js";

// =============================================================================
// Tests
// =============================================================================

describe("Prompts", () => {
  describe("create-product", () => {
    it("should generate product creation prompt with arguments", () => {
      const prompts = createPrompts();
      const createProduct = prompts.find((p) => p.name === "create-product")!;

      const messages = createProduct.handler({
        title: "Wireless Headphones",
        price: "79.99",
        category: "electronics",
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]!.role).toBe("user");
      expect(messages[0]!.content).toContain("Wireless Headphones");
      expect(messages[0]!.content).toContain("79.99");
      expect(messages[0]!.content).toContain("electronics");
      expect(messages[0]!.content).toContain("create_product");
    });

    it("should handle missing optional arguments", () => {
      const prompts = createPrompts();
      const createProduct = prompts.find((p) => p.name === "create-product")!;

      const messages = createProduct.handler({
        title: "Test Product",
        price: "19.99",
      });

      expect(messages[0]!.content).toContain("Test Product");
      expect(messages[0]!.content).toContain("[None specified]");
    });
  });

  describe("sales-report", () => {
    it("should generate sales report prompt with date range", () => {
      const prompts = createPrompts();
      const salesReport = prompts.find((p) => p.name === "sales-report")!;

      const messages = salesReport.handler({
        from: "2024-01-01",
        to: "2024-01-31",
        status: "paid",
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]!.content).toContain("2024-01-01");
      expect(messages[0]!.content).toContain("2024-01-31");
      expect(messages[0]!.content).toContain("paid");
      expect(messages[0]!.content).toContain("list_orders");
    });
  });

  describe("inventory-check", () => {
    it("should generate inventory check prompt with threshold", () => {
      const prompts = createPrompts();
      const inventoryCheck = prompts.find((p) => p.name === "inventory-check")!;

      const messages = inventoryCheck.handler({
        threshold: "5",
        category: "electronics",
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]!.content).toContain("5");
      expect(messages[0]!.content).toContain("electronics");
      expect(messages[0]!.content).toContain("lowStockThreshold");
    });

    it("should use default threshold when not provided", () => {
      const prompts = createPrompts();
      const inventoryCheck = prompts.find((p) => p.name === "inventory-check")!;

      const messages = inventoryCheck.handler({});

      expect(messages[0]!.content).toContain("10");
    });
  });

  describe("customer-lookup", () => {
    it("should generate customer lookup prompt with email", () => {
      const prompts = createPrompts();
      const customerLookup = prompts.find((p) => p.name === "customer-lookup")!;

      const messages = customerLookup.handler({
        email: "customer@example.com",
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]!.content).toContain("customer@example.com");
      expect(messages[0]!.content).toContain("get_customer");
      expect(messages[0]!.content).toContain("list_orders");
    });
  });

  describe("bulk-price-update", () => {
    it("should generate bulk price update prompt with confirmation warning", () => {
      const prompts = createPrompts();
      const bulkUpdate = prompts.find((p) => p.name === "bulk-price-update")!;

      const messages = bulkUpdate.handler({
        category: "electronics",
        adjustment: "+10%",
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]!.content).toContain("electronics");
      expect(messages[0]!.content).toContain("+10%");
      expect(messages[0]!.content).toContain("confirmation");
      expect(messages[0]!.content).toContain("bulk_update_products");
    });
  });

  describe("product-catalog-export", () => {
    it("should generate catalog export prompt", () => {
      const prompts = createPrompts();
      const catalogExport = prompts.find(
        (p) => p.name === "product-catalog-export"
      )!;

      const messages = catalogExport.handler({
        category: "clothing",
        format: "detailed",
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]!.content).toContain("clothing");
      expect(messages[0]!.content).toContain("detailed");
      expect(messages[0]!.content).toContain("list_products");
    });
  });

  describe("prompt list", () => {
    it("should have all expected prompts", () => {
      const prompts = createPrompts();

      const names = prompts.map((p) => p.name);
      expect(names).toContain("create-product");
      expect(names).toContain("sales-report");
      expect(names).toContain("inventory-check");
      expect(names).toContain("customer-lookup");
      expect(names).toContain("bulk-price-update");
      expect(names).toContain("product-catalog-export");
      expect(prompts).toHaveLength(6);
    });

    it("should have descriptions for all prompts", () => {
      const prompts = createPrompts();

      prompts.forEach((prompt) => {
        expect(prompt.description).toBeTruthy();
        expect(prompt.description.length).toBeGreaterThan(10);
      });
    });

    it("should have arguments defined for all prompts", () => {
      const prompts = createPrompts();

      prompts.forEach((prompt) => {
        expect(Array.isArray(prompt.arguments)).toBe(true);
        prompt.arguments.forEach((arg) => {
          expect(arg.name).toBeTruthy();
          expect(arg.description).toBeTruthy();
          expect(typeof arg.required).toBe("boolean");
        });
      });
    });
  });
});
