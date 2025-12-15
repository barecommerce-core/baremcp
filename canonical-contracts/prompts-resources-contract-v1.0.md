# BareMCP — Prompts & Resources Contract v1.0

**Status:** Authoritative Reference  
**Purpose:** Defines MCP Prompts (workflows) and Resources (schemas)

---

# 1. MCP Prompts

Prompts are pre-built workflows that LLMs can invoke to perform common operations. They provide structured guidance for complex tasks.

## 1.1 Prompt Registry

| Prompt Name | Description | Arguments |
|-------------|-------------|-----------|
| `inventory_check` | Check and report on inventory levels | storeId?, threshold? |
| `order_summary` | Summarize orders for a time period | storeId?, period? |
| `catalog_review` | Analyze catalog for completeness and SEO | storeId? |
| `customer_insights` | Analyze customer patterns and segments | storeId?, period? |
| `daily_briefing` | Morning operations summary | storeId? |

---

## 1.2 Prompt Definitions

### inventory_check

Check stock levels and identify products that need attention.

**Arguments:**
```json
{
  "storeId": {
    "type": "string",
    "description": "Store UUID (optional if default set)",
    "required": false
  },
  "threshold": {
    "type": "integer",
    "description": "Low stock threshold (default: 10)",
    "required": false
  }
}
```

**Prompt Template:**
```
Analyze the inventory for store {storeId}.

Please perform the following checks:

1. **Out of Stock Products**
   - Use list_products with outOfStock=true
   - Report count and list product names/SKUs

2. **Low Stock Products** (stock <= {threshold})
   - Use list_products with lowStock=true
   - Report count and list products with current stock levels

3. **Inventory Summary**
   - Total products with trackStock=true
   - Products with stock > 100 (overstocked?)
   - Products with stock between {threshold} and 50 (healthy)

4. **Recommendations**
   - Which products should be reordered urgently?
   - Are there any products that might be overstocked?

Format the response as a clear report the merchant can act on.
```

---

### order_summary

Generate a summary of orders for a given time period.

**Arguments:**
```json
{
  "storeId": {
    "type": "string",
    "description": "Store UUID (optional if default set)",
    "required": false
  },
  "period": {
    "type": "string",
    "enum": ["today", "yesterday", "7days", "30days", "month"],
    "description": "Time period for summary (default: 7days)",
    "required": false
  }
}
```

**Prompt Template:**
```
Generate an order summary for store {storeId} for the period: {period}.

Please analyze using the following steps:

1. **Order Volume**
   - Use list_orders with appropriate date filters
   - Count total orders
   - Count by status (pending, paid, fulfilled, cancelled)

2. **Revenue Analysis**
   - Calculate total revenue from orders
   - Calculate average order value
   - Identify highest value order

3. **Payment Status**
   - Orders by payment status
   - Any failed payments to follow up on?

4. **Top Products** (if data available)
   - Which products were ordered most?
   - Use get_store_analytics for top products

5. **Customer Activity**
   - New vs returning customers (if identifiable)
   - Any notable customer activity?

6. **Action Items**
   - Orders needing fulfillment
   - Pending payments to review
   - Cancellation rate concerns?

Present as an executive summary suitable for a merchant's daily review.
```

---

### catalog_review

Analyze the product catalog for completeness, SEO, and quality.

**Arguments:**
```json
{
  "storeId": {
    "type": "string",
    "description": "Store UUID (optional if default set)",
    "required": false
  }
}
```

**Prompt Template:**
```
Perform a comprehensive catalog review for store {storeId}.

Please analyze the following:

1. **Catalog Overview**
   - Use list_products to get all products
   - Count by status (draft, published, archived)
   - Products without images (primaryMediaId is null)
   - Products without descriptions

2. **SEO Analysis**
   - Products missing seoTitle
   - Products missing seoDescription
   - Products with duplicate slugs (check for similar patterns)

3. **Pricing Review**
   - Products with $0 price
   - Products with compareAtPrice set (on sale)
   - Price range distribution

4. **Inventory Health**
   - Products with trackStock=true but stock=0
   - Products with very high stock (>1000)

5. **Category Organization**
   - Use list_categories to see structure
   - Products with no categories assigned
   - Categories with no products

6. **Variant Completeness**
   - Use get_product_attributes to see attribute usage
   - Variant groups with missing combinations

7. **Recommendations**
   - Priority fixes for published products
   - Drafts that could be published
   - SEO improvements with biggest impact

Generate a detailed report with specific action items.
```

---

### customer_insights

Analyze customer data and identify patterns.

**Arguments:**
```json
{
  "storeId": {
    "type": "string",
    "description": "Store UUID (optional if default set)",
    "required": false
  },
  "period": {
    "type": "string",
    "enum": ["30days", "90days", "year", "all"],
    "description": "Analysis period (default: 90days)",
    "required": false
  }
}
```

**Prompt Template:**
```
Generate customer insights for store {storeId} over the period: {period}.

Analyze the following:

1. **Customer Overview**
   - Use list_customers to get customer data
   - Total customer count
   - Customers with marketing opt-in
   - Customers added in period

2. **Purchase Behavior**
   - Use get_customer with includeOrders=true for top customers
   - Customers with multiple orders (repeat buyers)
   - Average order value by customer segment
   - Top 10 customers by total spent

3. **Engagement Patterns**
   - Customers who haven't ordered recently
   - New customers vs established
   - Marketing opt-in rate

4. **Geographic Distribution** (if address data available)
   - Top regions/countries
   - Shipping address patterns

5. **Customer Segments**
   - VIP customers (high spend, multiple orders)
   - At-risk customers (no recent orders)
   - New customers (first order in period)

6. **Recommendations**
   - Re-engagement opportunities
   - VIP program candidates
   - Marketing strategy suggestions

Present insights in a way that helps the merchant understand their customer base.
```

---

### daily_briefing

Generate a morning operations summary.

**Arguments:**
```json
{
  "storeId": {
    "type": "string",
    "description": "Store UUID (optional if default set)",
    "required": false
  }
}
```

**Prompt Template:**
```
Generate a daily operations briefing for store {storeId}.

Today's date is {current_date}. Please provide:

1. **Yesterday's Summary**
   - Orders received yesterday
   - Revenue generated
   - New customers

2. **Current Status**
   - Pending orders needing fulfillment
   - Orders awaiting payment confirmation
   - Recent cancellations or refunds

3. **Inventory Alerts**
   - Out of stock products
   - Low stock products (<10 units)

4. **Today's Tasks**
   - Orders to fulfill (prioritized by age)
   - Customer inquiries to address (if tracked)
   - Inventory to reorder

5. **Quick Stats**
   - Use get_store_analytics for period=7days
   - Week-over-week comparison if possible

6. **Reminders**
   - Any scheduled promotions ending soon?
   - Products in draft status

Keep the briefing concise and actionable. Format for quick scanning during morning review.
```

---

# 2. MCP Resources

Resources expose data schemas and configuration to help LLMs understand the data structures.

## 2.1 Resource Registry

| Resource URI | Description | MIME Type |
|--------------|-------------|-----------|
| `store://schema/products` | Product entity schema | application/json |
| `store://schema/orders` | Order entity schema | application/json |
| `store://schema/customers` | Customer entity schema | application/json |
| `store://config` | Current store configuration | application/json |

---

## 2.2 Resource Definitions

### store://schema/products

Exposes the product schema for LLM understanding.

**Content:**
```json
{
  "type": "object",
  "description": "BareCommerce Product Entity",
  "properties": {
    "id": { "type": "string", "format": "uuid", "description": "Unique identifier" },
    "title": { "type": "string", "description": "Product title" },
    "slug": { "type": "string", "description": "URL-friendly identifier" },
    "status": { 
      "type": "string", 
      "enum": ["draft", "published", "archived", "deleted"],
      "description": "Publication status"
    },
    "price": { "type": "string", "description": "Price as decimal string" },
    "compareAtPrice": { "type": "string", "description": "Original price for discounts" },
    "description": { "type": "string", "description": "Product description (HTML)" },
    "sku": { "type": "string", "description": "Stock keeping unit" },
    "barcode": { "type": "string", "description": "Product barcode" },
    "variantGroupId": { "type": "string", "description": "Groups variants together" },
    "attributes": { 
      "type": "object", 
      "description": "Variant attributes like {color: 'red', size: 'large'}"
    },
    "trackStock": { "type": "boolean", "description": "Whether inventory is tracked" },
    "stock": { "type": "integer", "description": "Current stock quantity" },
    "allowBackorder": { "type": "boolean", "description": "Allow orders when out of stock" },
    "categoryIds": { "type": "array", "items": { "type": "string" }, "description": "Category UUIDs" },
    "primaryMediaId": { "type": "string", "description": "Main product image" },
    "mediaIds": { "type": "array", "items": { "type": "string" }, "description": "Additional images" },
    "seoTitle": { "type": "string", "description": "Meta title for SEO" },
    "seoDescription": { "type": "string", "description": "Meta description for SEO" },
    "seoKeywords": { "type": "string", "description": "Meta keywords for SEO" },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  },
  "required": ["title", "slug", "price"]
}
```

---

### store://schema/orders

Exposes the order schema.

**Content:**
```json
{
  "type": "object",
  "description": "BareCommerce Order Entity (Read-Only - created via payment webhooks)",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "orderNumber": { "type": "string", "description": "Human-readable order number" },
    "customerId": { "type": "string", "format": "uuid" },
    "status": {
      "type": "string",
      "enum": ["pending", "paid", "fulfilled", "cancelled"],
      "description": "Order lifecycle status"
    },
    "paymentStatus": {
      "type": "string",
      "enum": ["pending", "processing", "succeeded", "failed", "refunded", "partially_refunded", "cancelled"],
      "description": "Payment processing status"
    },
    "subtotal": { "type": "string", "description": "Pre-tax/shipping amount" },
    "tax": { "type": "string", "description": "Tax amount" },
    "shipping": { "type": "string", "description": "Shipping cost" },
    "discount": { "type": "string", "description": "Discount amount" },
    "total": { "type": "string", "description": "Final order total" },
    "currency": { "type": "string", "default": "USD" },
    "paymentProvider": { "type": "string", "description": "stripe, paypal, square" },
    "paymentId": { "type": "string", "description": "Provider transaction ID" },
    "shippingAddress": { "type": "object", "description": "Delivery address snapshot" },
    "billingAddress": { "type": "object", "description": "Billing address snapshot" },
    "customerNote": { "type": "string", "description": "Note from customer" },
    "merchantNote": { "type": "string", "description": "Internal notes" },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "productId": { "type": "string" },
          "titleSnapshot": { "type": "string" },
          "skuSnapshot": { "type": "string" },
          "unitPrice": { "type": "string" },
          "quantity": { "type": "integer" },
          "variantTitle": { "type": "string" }
        }
      }
    },
    "placedAt": { "type": "string", "format": "date-time" },
    "paidAt": { "type": "string", "format": "date-time" },
    "fulfilledAt": { "type": "string", "format": "date-time" },
    "cancelledAt": { "type": "string", "format": "date-time" },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  },
  "readOnly": true
}
```

---

### store://schema/customers

Exposes the customer schema.

**Content:**
```json
{
  "type": "object",
  "description": "BareCommerce Customer Entity",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "email": { "type": "string", "format": "email" },
    "name": { "type": "string" },
    "phone": { "type": "string" },
    "marketingOptIn": { "type": "boolean", "description": "Marketing consent" },
    "addresses": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "address1": { "type": "string" },
          "address2": { "type": "string" },
          "city": { "type": "string" },
          "region": { "type": "string" },
          "postalCode": { "type": "string" },
          "country": { "type": "string" },
          "firstName": { "type": "string" },
          "lastName": { "type": "string" },
          "phone": { "type": "string" },
          "isDefault": { "type": "boolean" }
        },
        "required": ["address1", "city", "postalCode", "country"]
      }
    },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  },
  "required": ["email"]
}
```

---

### store://config

Returns current store configuration. This is dynamic and fetched via get_store.

**Template Response:**
```json
{
  "type": "store_configuration",
  "description": "Current store settings retrieved via get_store tool",
  "data": {
    "id": "store-uuid",
    "name": "My Store",
    "domain": "mystore.com",
    "currency": "USD",
    "timezone": "America/New_York",
    "weightUnit": "kg",
    "orderNumberPrefix": "ORD",
    "attributeSchema": {
      "color": { "label": "Color" },
      "size": { "label": "Size" }
    }
  }
}
```

---

# 3. Implementation Notes

## 3.1 Prompt Implementation

```typescript
// src/prompts/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

export function registerPrompts(server: Server) {
  server.setRequestHandler("prompts/list", async () => ({
    prompts: [
      {
        name: "inventory_check",
        description: "Check and report on inventory levels",
        arguments: [
          { name: "storeId", description: "Store UUID", required: false },
          { name: "threshold", description: "Low stock threshold", required: false },
        ],
      },
      {
        name: "order_summary",
        description: "Summarize orders for a time period",
        arguments: [
          { name: "storeId", description: "Store UUID", required: false },
          { name: "period", description: "Time period", required: false },
        ],
      },
      // ... more prompts
    ],
  }));

  server.setRequestHandler("prompts/get", async (request) => {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      case "inventory_check":
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: generateInventoryCheckPrompt(args),
            },
          }],
        };
      // ... handle other prompts
    }
  });
}

function generateInventoryCheckPrompt(args: Record<string, string>): string {
  const storeId = args.storeId || "{default_store}";
  const threshold = args.threshold || "10";
  
  return `Analyze the inventory for store ${storeId}.

Please perform the following checks:

1. **Out of Stock Products**
   - Use list_products with outOfStock=true
   - Report count and list product names/SKUs

2. **Low Stock Products** (stock <= ${threshold})
   - Use list_products with lowStock=true
   - Report count and list products with current stock levels

...`; // Full template from above
}
```

## 3.2 Resource Implementation

```typescript
// src/resources/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { HttpClient } from "../client/http.js";
import { productSchema, orderSchema, customerSchema } from "./schemas.js";

export function registerResources(server: Server, client: HttpClient) {
  server.setRequestHandler("resources/list", async () => ({
    resources: [
      {
        uri: "store://schema/products",
        name: "Product Schema",
        description: "BareCommerce product entity schema",
        mimeType: "application/json",
      },
      {
        uri: "store://schema/orders",
        name: "Order Schema",
        description: "BareCommerce order entity schema",
        mimeType: "application/json",
      },
      {
        uri: "store://schema/customers",
        name: "Customer Schema",
        description: "BareCommerce customer entity schema",
        mimeType: "application/json",
      },
      {
        uri: "store://config",
        name: "Store Configuration",
        description: "Current store settings",
        mimeType: "application/json",
      },
    ],
  }));

  server.setRequestHandler("resources/read", async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case "store://schema/products":
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(productSchema, null, 2),
          }],
        };

      case "store://schema/orders":
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(orderSchema, null, 2),
          }],
        };

      case "store://config":
        // Fetch live from API
        const storeId = client.getDefaultStoreId();
        if (!storeId) {
          throw new Error("No default store configured");
        }
        const store = await client.get(`/api/stores/${storeId}`);
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify({ type: "store_configuration", data: store }, null, 2),
          }],
        };

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });
}
```

---

# 4. Document Control

**Version:** 1.0  
**Created:** 2025  
**Dependencies:**
- MCP Tools Contract v1.0
- BareCommerce API Contract v1.7
