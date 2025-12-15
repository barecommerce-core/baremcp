/**
 * BareMCP — Prompts
 *
 * MCP Prompts provide pre-built workflows for common tasks.
 * They guide the LLM through multi-step operations with context.
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// =============================================================================
// Prompt Definitions
// =============================================================================

interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

interface PromptDefinition {
  name: string;
  description: string;
  arguments: PromptArgument[];
  handler: (args: Record<string, string>) => { role: string; content: string }[];
}

/**
 * Create all prompt definitions
 */
export function createPrompts(): PromptDefinition[] {
  return [
    // =========================================================================
    // create-product
    // =========================================================================
    {
      name: "create-product",
      description:
        "Guided workflow to create a new product with all required fields and optional SEO settings",
      arguments: [
        {
          name: "title",
          description: "Product title/name",
          required: true,
        },
        {
          name: "price",
          description: "Product price (e.g., 29.99)",
          required: true,
        },
        {
          name: "category",
          description: "Category name or slug to assign",
          required: false,
        },
      ],
      handler: (args) => [
        {
          role: "user",
          content: `Create a new product with the following details:

**Product Title:** ${args.title || "[Not provided]"}
**Price:** ${args.price || "[Not provided]"}
**Category:** ${args.category || "[None specified]"}

Please:
1. Generate a URL-friendly slug from the title
2. Create a compelling product description (2-3 sentences)
3. Suggest SEO title and meta description
4. Use the create_product tool with all the details
5. If a category was specified, look it up first with list_categories to get the category ID

After creating, show me a summary of the new product.`,
        },
      ],
    },

    // =========================================================================
    // sales-report
    // =========================================================================
    {
      name: "sales-report",
      description:
        "Generate a sales summary report for a specified date range",
      arguments: [
        {
          name: "from",
          description: "Start date (YYYY-MM-DD)",
          required: true,
        },
        {
          name: "to",
          description: "End date (YYYY-MM-DD)",
          required: false,
        },
        {
          name: "status",
          description: "Order status filter (paid, fulfilled, etc.)",
          required: false,
        },
      ],
      handler: (args) => [
        {
          role: "user",
          content: `Generate a sales report with the following parameters:

**Date Range:** ${args.from || "[Start date required]"} to ${args.to || "today"}
**Status Filter:** ${args.status || "all statuses"}

Please:
1. Use list_orders with the date filters to fetch orders
2. Calculate totals:
   - Total number of orders
   - Total revenue
   - Average order value
   - Orders by status breakdown
3. Identify top-selling products in this period
4. Present the report in a clear, formatted summary

Include any notable trends or insights from the data.`,
        },
      ],
    },

    // =========================================================================
    // inventory-check
    // =========================================================================
    {
      name: "inventory-check",
      description:
        "Find products with low stock that may need reordering",
      arguments: [
        {
          name: "threshold",
          description: "Stock level to consider 'low' (default: 10)",
          required: false,
        },
        {
          name: "category",
          description: "Limit check to specific category",
          required: false,
        },
      ],
      handler: (args) => {
        const threshold = args.threshold || "10";
        return [
          {
            role: "user",
            content: `Check inventory for low stock products:

**Low Stock Threshold:** ${threshold} units or fewer
**Category Filter:** ${args.category || "all categories"}

Please:
1. Use list_products with lowStockThreshold=${threshold} to find products needing attention
2. For each low-stock product, show:
   - Product title and SKU
   - Current stock level
   - Whether backorders are allowed
3. Sort by stock level (lowest first)
4. Summarize total products needing reorder
5. If category was specified, filter results accordingly

Flag any products with zero stock as CRITICAL.`,
          },
        ];
      },
    },

    // =========================================================================
    // customer-lookup
    // =========================================================================
    {
      name: "customer-lookup",
      description:
        "Find a customer and view their order history",
      arguments: [
        {
          name: "email",
          description: "Customer email address",
          required: false,
        },
        {
          name: "search",
          description: "Search by name or other info",
          required: false,
        },
      ],
      handler: (args) => [
        {
          role: "user",
          content: `Look up customer information:

**Email:** ${args.email || "[Not provided]"}
**Search:** ${args.search || "[Not provided]"}

Please:
1. Use get_customer (if email provided) or list_customers (if searching) to find the customer
2. Show customer details:
   - Name and contact info
   - Marketing opt-in status
   - Account creation date
3. Use list_orders filtered by customerId to get their order history
4. Summarize:
   - Total orders placed
   - Total amount spent
   - Most recent order date and status
   - Favorite products (most ordered)

Present a complete customer profile.`,
        },
      ],
    },

    // =========================================================================
    // bulk-price-update
    // =========================================================================
    {
      name: "bulk-price-update",
      description:
        "Update prices for multiple products by percentage or fixed amount",
      arguments: [
        {
          name: "category",
          description: "Category to update prices for",
          required: false,
        },
        {
          name: "adjustment",
          description: "Price adjustment (e.g., '+10%', '-5%', '+2.00')",
          required: true,
        },
        {
          name: "filter",
          description: "Additional filter (e.g., 'status:published')",
          required: false,
        },
      ],
      handler: (args) => [
        {
          role: "user",
          content: `Bulk update product prices:

**Category:** ${args.category || "all products"}
**Adjustment:** ${args.adjustment || "[Required]"}
**Additional Filter:** ${args.filter || "none"}

Please:
1. First, list the products that will be affected using list_products with appropriate filters
2. Show me the products and their current prices BEFORE making changes
3. Calculate the new prices based on the adjustment:
   - If percentage (e.g., +10%), multiply current price
   - If fixed amount (e.g., +2.00), add to current price
4. Ask for my confirmation before proceeding
5. After confirmation, use bulk_update_products to apply the price changes
6. Show a summary of all changes made

⚠️ IMPORTANT: Wait for my confirmation before making any changes!`,
        },
      ],
    },

    // =========================================================================
    // product-catalog-export
    // =========================================================================
    {
      name: "product-catalog-export",
      description:
        "Export product catalog data for a specific category or the entire store",
      arguments: [
        {
          name: "category",
          description: "Category to export (optional, exports all if omitted)",
          required: false,
        },
        {
          name: "format",
          description: "Export format: summary or detailed",
          required: false,
        },
      ],
      handler: (args) => [
        {
          role: "user",
          content: `Export product catalog:

**Category:** ${args.category || "entire catalog"}
**Format:** ${args.format || "summary"}

Please:
1. If category specified, first look it up with list_categories
2. Use list_products with appropriate filters to get all products
3. For each product include:
   - Summary: title, SKU, price, stock, status
   - Detailed: add description, categories, images, SEO fields
4. Format as a clean table or structured list
5. Include totals:
   - Number of products
   - Total inventory value (price × stock)
   - Products by status

Present the catalog in an easy-to-read format.`,
        },
      ],
    },
  ];
}

/**
 * Register prompts with the MCP server
 */
export function registerPrompts(server: Server): void {
  const prompts = createPrompts();

  // Create a map for quick handler lookup
  const promptHandlers = new Map(prompts.map((p) => [p.name, p.handler]));

  // Register prompts/list handler
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: prompts.map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments,
    })),
  }));

  // Register prompts/get handler
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const handler = promptHandlers.get(name);
    if (!handler) {
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Unknown prompt: ${name}. Use prompts/list to see available prompts.`,
            },
          },
        ],
      };
    }

    const messages = handler(args || {});
    return {
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: {
          type: "text" as const,
          text: m.content,
        },
      })),
    };
  });

  console.error(`[BareMCP] Registered ${prompts.length} prompts`);
}
