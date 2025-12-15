# BareMCP — MCP Tools Contract v1.0

**Status:** Authoritative Reference  
**Purpose:** Defines ALL MCP tools, their schemas, and behaviors  
**LLM Integration Note:** Parse Section 2 for tool definitions. Each tool includes name, description, input schema, and output schema.

---

# 0. Hard Rules

```
RULE: No tool may exist unless defined in this document.
RULE: No input parameter may exist unless defined in this document.
RULE: No output field may exist unless defined in this document.
RULE: All tools must handle errors consistently per Section 1.3.
RULE: All store-scoped tools must accept optional storeId parameter.
```

---

# 1. Global Conventions

## 1.1 Tool Naming

```
Pattern: {action}_{resource}
Examples: list_products, get_order, create_customer, update_page
```

Actions:
- `list` - Retrieve multiple resources
- `get` - Retrieve single resource
- `create` - Create new resource
- `update` - Modify existing resource
- `delete` - Remove resource (soft delete)
- `search` - Full-text search
- `bulk` - Batch operations
- `upload` - File upload
- `export` - Data export

## 1.2 Common Parameters

All store-scoped tools accept:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `storeId` | string | No* | Target store UUID. Required if merchant has multiple stores and no default is set. |

*If not provided, uses `BARECOMMERCE_DEFAULT_STORE_ID` environment variable.

## 1.3 Error Response Schema

All tools return errors in this format:

```typescript
{
  isError: true,
  content: [{
    type: "text",
    text: JSON.stringify({
      code: "ERROR_CODE",
      message: "Human readable message",
      details: { /* optional context */ }
    })
  }]
}
```

## 1.4 Success Response Schema

Successful operations return:

```typescript
{
  content: [{
    type: "text", 
    text: JSON.stringify({
      success: true,
      data: { /* response data */ }
    })
  }]
}
```

## 1.5 Pagination

List operations support:

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | integer | 50 | 200 | Items per page |
| `offset` | integer | 0 | - | Skip count |

---

# 2. Tool Definitions

## 2.1 Store Management Tools (4)

### list_stores

List all stores accessible to the authenticated merchant.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "domain": "string | null",
        "currency": "string",
        "status": "active | suspended | deleted",
        "createdAt": "datetime"
      }
    ],
    "total": "number"
  }
}
```

**Required Scope:** None (implicit from API key)

---

### get_store

Get detailed information about a specific store.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID (optional if default store is set)"
    }
  },
  "required": []
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "domain": "string | null",
    "currency": "string",
    "timezone": "string",
    "weightUnit": "string",
    "status": "StoreStatus",
    "shopEmail": "string | null",
    "shopPhone": "string | null",
    "shopDescription": "string | null",
    "shopIndustry": "string | null",
    "businessAddress": {
      "address1": "string | null",
      "address2": "string | null",
      "city": "string | null",
      "region": "string | null",
      "zip": "string | null",
      "country": "string | null"
    },
    "orderNumberPrefix": "string",
    "logoMediaId": "string | null",
    "faviconMediaId": "string | null",
    "attributeSchema": "object | null",
    "metafieldSchema": "object | null",
    "createdAt": "datetime",
    "updatedAt": "datetime"
  }
}
```

**Required Scope:** None (implicit)

---

### update_store

Update store settings.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "name": {
      "type": "string",
      "description": "Store name"
    },
    "domain": {
      "type": "string",
      "description": "Custom domain"
    },
    "currency": {
      "type": "string",
      "description": "Currency code (e.g., USD, EUR)"
    },
    "timezone": {
      "type": "string",
      "description": "Timezone (e.g., America/New_York)"
    },
    "weightUnit": {
      "type": "string",
      "enum": ["kg", "lb"],
      "description": "Weight unit"
    },
    "shopEmail": {
      "type": "string",
      "description": "Store contact email"
    },
    "shopPhone": {
      "type": "string",
      "description": "Store contact phone"
    },
    "shopDescription": {
      "type": "string",
      "description": "Store description"
    },
    "shopIndustry": {
      "type": "string",
      "description": "Industry/niche"
    },
    "orderNumberPrefix": {
      "type": "string",
      "description": "Prefix for order numbers (e.g., ORD)"
    },
    "logoMediaId": {
      "type": "string",
      "description": "Media ID for store logo"
    },
    "faviconMediaId": {
      "type": "string",
      "description": "Media ID for favicon"
    }
  },
  "required": []
}
```

**Output:** Returns updated store object (same as get_store)

**Required Scope:** Store owner access

---

### get_store_analytics

Get store analytics overview.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "period": {
      "type": "string",
      "enum": ["today", "yesterday", "7days", "30days", "90days", "year", "all"],
      "default": "30days",
      "description": "Time period for analytics"
    }
  },
  "required": []
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "period": "string",
    "products": {
      "total": "number",
      "published": "number",
      "draft": "number",
      "archived": "number"
    },
    "orders": {
      "total": "number",
      "pending": "number",
      "paid": "number",
      "fulfilled": "number",
      "cancelled": "number",
      "revenue": "string"
    },
    "customers": {
      "total": "number",
      "newInPeriod": "number"
    },
    "topProducts": [
      {
        "id": "string",
        "title": "string",
        "orderCount": "number",
        "revenue": "string"
      }
    ]
  }
}
```

**Required Scope:** `orders:read`

---

## 2.2 Product Tools (9)

### list_products

List products with optional filters.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "status": {
      "type": "string",
      "enum": ["draft", "published", "archived"],
      "description": "Filter by status"
    },
    "categoryId": {
      "type": "string",
      "description": "Filter by category UUID"
    },
    "search": {
      "type": "string",
      "description": "Search in title, description, SKU"
    },
    "variantGroupId": {
      "type": "string",
      "description": "Filter by variant group"
    },
    "lowStock": {
      "type": "boolean",
      "description": "Only show products with stock <= 10"
    },
    "outOfStock": {
      "type": "boolean", 
      "description": "Only show products with stock = 0"
    },
    "sortBy": {
      "type": "string",
      "enum": ["title", "price", "stock", "createdAt", "updatedAt"],
      "default": "createdAt"
    },
    "sortOrder": {
      "type": "string",
      "enum": ["asc", "desc"],
      "default": "desc"
    },
    "limit": {
      "type": "integer",
      "default": 50,
      "maximum": 200
    },
    "offset": {
      "type": "integer",
      "default": 0
    }
  },
  "required": []
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "string",
        "slug": "string",
        "status": "ProductStatus",
        "price": "string",
        "compareAtPrice": "string | null",
        "sku": "string | null",
        "stock": "number",
        "trackStock": "boolean",
        "primaryMediaId": "string | null",
        "featuredMediaUrl": "string | null",
        "categoryIds": ["uuid"],
        "createdAt": "datetime",
        "updatedAt": "datetime"
      }
    ],
    "total": "number"
  }
}
```

**Required Scope:** `products:read`

---

### get_product

Get a single product by ID or slug.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "productId": {
      "type": "string",
      "description": "Product UUID"
    },
    "slug": {
      "type": "string",
      "description": "Product slug (alternative to productId)"
    }
  },
  "required": []
}
```

**Note:** Either `productId` or `slug` must be provided.

**Output:** Full product object including all fields

**Required Scope:** `products:read`

---

### create_product

Create a new product.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "title": {
      "type": "string",
      "description": "Product title (required)",
      "minLength": 1,
      "maxLength": 255
    },
    "slug": {
      "type": "string",
      "description": "URL slug (required, lowercase, hyphens only)",
      "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
    },
    "price": {
      "type": "number",
      "description": "Product price (required)",
      "minimum": 0
    },
    "status": {
      "type": "string",
      "enum": ["draft", "published"],
      "default": "draft",
      "description": "Initial status"
    },
    "description": {
      "type": "string",
      "description": "Product description (HTML allowed)"
    },
    "compareAtPrice": {
      "type": "number",
      "description": "Original price for showing discounts"
    },
    "sku": {
      "type": "string",
      "description": "Stock keeping unit"
    },
    "barcode": {
      "type": "string",
      "description": "Product barcode (UPC, EAN, etc.)"
    },
    "variantGroupId": {
      "type": "string",
      "description": "Group ID for product variants"
    },
    "attributes": {
      "type": "object",
      "description": "Variant attributes (e.g., {\"color\": \"red\", \"size\": \"large\"})"
    },
    "trackStock": {
      "type": "boolean",
      "default": false,
      "description": "Enable inventory tracking"
    },
    "stock": {
      "type": "integer",
      "default": 0,
      "description": "Current stock quantity"
    },
    "allowBackorder": {
      "type": "boolean",
      "default": false,
      "description": "Allow orders when out of stock"
    },
    "categoryIds": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Category UUIDs to assign"
    },
    "primaryMediaId": {
      "type": "string",
      "description": "Primary image media ID"
    },
    "mediaIds": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Additional image media IDs"
    },
    "seoTitle": {
      "type": "string",
      "description": "SEO meta title"
    },
    "seoDescription": {
      "type": "string",
      "description": "SEO meta description"
    },
    "seoKeywords": {
      "type": "string",
      "description": "SEO keywords"
    }
  },
  "required": ["title", "slug", "price"]
}
```

**Output:** Created product object

**Required Scope:** `products:write`

---

### update_product

Update an existing product.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "productId": {
      "type": "string",
      "description": "Product UUID (required)"
    },
    "title": {"type": "string"},
    "slug": {"type": "string"},
    "price": {"type": "number"},
    "status": {
      "type": "string",
      "enum": ["draft", "published", "archived"]
    },
    "description": {"type": "string"},
    "compareAtPrice": {"type": "number"},
    "sku": {"type": "string"},
    "barcode": {"type": "string"},
    "variantGroupId": {"type": "string"},
    "attributes": {"type": "object"},
    "trackStock": {"type": "boolean"},
    "stock": {"type": "integer"},
    "allowBackorder": {"type": "boolean"},
    "categoryIds": {"type": "array", "items": {"type": "string"}},
    "primaryMediaId": {"type": "string"},
    "mediaIds": {"type": "array", "items": {"type": "string"}},
    "seoTitle": {"type": "string"},
    "seoDescription": {"type": "string"},
    "seoKeywords": {"type": "string"}
  },
  "required": ["productId"]
}
```

**Output:** Updated product object

**Required Scope:** `products:write`

---

### delete_product

Soft-delete a product.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "productId": {
      "type": "string",
      "description": "Product UUID to delete"
    }
  },
  "required": ["productId"]
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "productId": "uuid"
  }
}
```

**Required Scope:** `products:write`

---

### bulk_update_products

Perform bulk operations on multiple products.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "operation": {
      "type": "string",
      "enum": ["publish", "archive", "delete"],
      "description": "Operation to perform"
    },
    "productIds": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Product UUIDs to update",
      "minItems": 1,
      "maxItems": 100
    }
  },
  "required": ["operation", "productIds"]
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "affected": "number",
    "operation": "string"
  }
}
```

**Required Scope:** `products:write`

---

### search_products

Full-text search across products.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "query": {
      "type": "string",
      "description": "Search query",
      "minLength": 1
    },
    "status": {
      "type": "string",
      "enum": ["draft", "published", "archived"],
      "description": "Filter by status"
    },
    "limit": {
      "type": "integer",
      "default": 20,
      "maximum": 100
    }
  },
  "required": ["query"]
}
```

**Output:** Same as list_products

**Required Scope:** `products:read`

---

### get_product_attributes

Get all attribute keys and values used across products.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    }
  },
  "required": []
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "color": ["red", "blue", "green", "black"],
    "size": ["small", "medium", "large", "xl"],
    "material": ["cotton", "polyester"]
  }
}
```

**Required Scope:** `products:read`

---

### get_product_variants

Get all variants in a variant group.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "variantGroupId": {
      "type": "string",
      "description": "Variant group ID"
    }
  },
  "required": ["variantGroupId"]
}
```

**Output:** Array of product objects in the variant group

**Required Scope:** `products:read`

---

## 2.3 Order Tools (5)

### list_orders

List orders with optional filters.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "status": {
      "type": "string",
      "enum": ["pending", "paid", "fulfilled", "cancelled"],
      "description": "Filter by order status"
    },
    "paymentStatus": {
      "type": "string",
      "enum": ["pending", "processing", "succeeded", "failed", "refunded", "partially_refunded", "cancelled"],
      "description": "Filter by payment status"
    },
    "customerId": {
      "type": "string",
      "description": "Filter by customer UUID"
    },
    "orderNumber": {
      "type": "string",
      "description": "Filter by order number"
    },
    "dateFrom": {
      "type": "string",
      "format": "date",
      "description": "Orders placed on or after this date"
    },
    "dateTo": {
      "type": "string",
      "format": "date",
      "description": "Orders placed on or before this date"
    },
    "minTotal": {
      "type": "number",
      "description": "Minimum order total"
    },
    "maxTotal": {
      "type": "number",
      "description": "Maximum order total"
    },
    "limit": {
      "type": "integer",
      "default": 50,
      "maximum": 200
    },
    "offset": {
      "type": "integer",
      "default": 0
    }
  },
  "required": []
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "orderNumber": "ORD-000001",
        "customerId": "uuid",
        "status": "OrderStatus",
        "paymentStatus": "PaymentStatus",
        "total": "99.99",
        "currency": "USD",
        "itemCount": "number",
        "placedAt": "datetime",
        "paidAt": "datetime | null",
        "createdAt": "datetime"
      }
    ],
    "total": "number"
  }
}
```

**Required Scope:** `orders:read`

---

### get_order

Get a single order with full details.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "orderId": {
      "type": "string",
      "description": "Order UUID"
    },
    "orderNumber": {
      "type": "string",
      "description": "Order number (alternative to orderId)"
    }
  },
  "required": []
}
```

**Note:** Either `orderId` or `orderNumber` must be provided.

**Output:** Full order object including items, addresses, payment details

**Required Scope:** `orders:read`

---

### update_order_notes

Add or update notes on an order.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "orderId": {
      "type": "string",
      "description": "Order UUID"
    },
    "merchantNote": {
      "type": "string",
      "description": "Internal note (not visible to customer)"
    }
  },
  "required": ["orderId"]
}
```

**Output:** Updated order object

**Required Scope:** `orders:write`

---

### record_refund

Record a refund for an order.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "orderId": {
      "type": "string",
      "description": "Order UUID"
    },
    "amount": {
      "type": "number",
      "description": "Refund amount",
      "minimum": 0.01
    },
    "reason": {
      "type": "string",
      "description": "Reason for refund"
    },
    "refundId": {
      "type": "string",
      "description": "Payment provider's refund ID"
    }
  },
  "required": ["orderId", "amount"]
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "refundAmount": "string",
    "newPaymentStatus": "string"
  }
}
```

**Required Scope:** `orders:write`

---

### export_orders

Export orders to CSV format.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "dateFrom": {
      "type": "string",
      "format": "date",
      "description": "Start date"
    },
    "dateTo": {
      "type": "string",
      "format": "date",
      "description": "End date"
    },
    "status": {
      "type": "string",
      "enum": ["pending", "paid", "fulfilled", "cancelled"],
      "description": "Filter by status"
    }
  },
  "required": []
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "csv": "string (CSV content)",
    "rowCount": "number"
  }
}
```

**Required Scope:** `orders:read`

---

## 2.4 Customer Tools (5)

### list_customers

List customers with optional filters.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "search": {
      "type": "string",
      "description": "Search in name, email, phone"
    },
    "hasOrders": {
      "type": "boolean",
      "description": "Filter to customers with/without orders"
    },
    "marketingOptIn": {
      "type": "boolean",
      "description": "Filter by marketing consent"
    },
    "limit": {
      "type": "integer",
      "default": 50,
      "maximum": 200
    },
    "offset": {
      "type": "integer",
      "default": 0
    }
  },
  "required": []
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "email": "string",
        "name": "string | null",
        "phone": "string | null",
        "marketingOptIn": "boolean",
        "orderCount": "number",
        "totalSpent": "string",
        "createdAt": "datetime"
      }
    ],
    "total": "number"
  }
}
```

**Required Scope:** `customers:read`

---

### get_customer

Get a single customer with addresses and order history.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "customerId": {
      "type": "string",
      "description": "Customer UUID"
    },
    "email": {
      "type": "string",
      "description": "Customer email (alternative to customerId)"
    },
    "includeOrders": {
      "type": "boolean",
      "default": false,
      "description": "Include recent orders"
    }
  },
  "required": []
}
```

**Output:** Full customer object with addresses and optionally orders

**Required Scope:** `customers:read`

---

### create_customer

Create a new customer.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "Customer email (required)"
    },
    "name": {
      "type": "string",
      "description": "Full name"
    },
    "phone": {
      "type": "string",
      "description": "Phone number"
    },
    "marketingOptIn": {
      "type": "boolean",
      "default": false,
      "description": "Marketing consent"
    },
    "addresses": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "address1": {"type": "string"},
          "address2": {"type": "string"},
          "city": {"type": "string"},
          "region": {"type": "string"},
          "postalCode": {"type": "string"},
          "country": {"type": "string"},
          "firstName": {"type": "string"},
          "lastName": {"type": "string"},
          "phone": {"type": "string"},
          "isDefault": {"type": "boolean"}
        },
        "required": ["address1", "city", "postalCode", "country"]
      },
      "description": "Customer addresses"
    }
  },
  "required": ["email"]
}
```

**Output:** Created customer object

**Required Scope:** `customers:write`

---

### update_customer

Update an existing customer.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "customerId": {
      "type": "string",
      "description": "Customer UUID (required)"
    },
    "email": {"type": "string", "format": "email"},
    "name": {"type": "string"},
    "phone": {"type": "string"},
    "marketingOptIn": {"type": "boolean"},
    "addresses": {
      "type": "array",
      "items": {"type": "object"},
      "description": "Replace all addresses (use carefully)"
    }
  },
  "required": ["customerId"]
}
```

**Output:** Updated customer object

**Required Scope:** `customers:write`

---

### delete_customer

Delete a customer (blocked if customer has orders).

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "customerId": {
      "type": "string",
      "description": "Customer UUID to delete"
    }
  },
  "required": ["customerId"]
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "customerId": "uuid"
  }
}
```

**Error:** Returns `CONFLICT` if customer has orders.

**Required Scope:** `customers:write`

---

## 2.5 Category Tools (5)

### list_categories

List categories (hierarchical structure).

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "status": {
      "type": "string",
      "enum": ["draft", "published", "archived"],
      "description": "Filter by status"
    },
    "parentId": {
      "type": "string",
      "description": "Filter by parent category (null for root categories)"
    },
    "flat": {
      "type": "boolean",
      "default": false,
      "description": "Return flat list instead of tree"
    },
    "limit": {
      "type": "integer",
      "default": 100,
      "maximum": 200
    },
    "offset": {
      "type": "integer",
      "default": 0
    }
  },
  "required": []
}
```

**Output (tree mode):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "slug": "string",
        "status": "CategoryStatus",
        "productCount": "number",
        "children": [
          { "id": "uuid", "name": "string", "children": [] }
        ]
      }
    ],
    "total": "number"
  }
}
```

**Required Scope:** `categories:read`

---

### get_category

Get a single category.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "categoryId": {
      "type": "string",
      "description": "Category UUID"
    },
    "slug": {
      "type": "string",
      "description": "Category slug (alternative to categoryId)"
    },
    "includeProducts": {
      "type": "boolean",
      "default": false,
      "description": "Include products in this category"
    }
  },
  "required": []
}
```

**Output:** Full category object with optional products

**Required Scope:** `categories:read`

---

### create_category

Create a new category.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "name": {
      "type": "string",
      "description": "Category name (required)",
      "minLength": 1,
      "maxLength": 255
    },
    "slug": {
      "type": "string",
      "description": "URL slug (required)",
      "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
    },
    "status": {
      "type": "string",
      "enum": ["draft", "published"],
      "default": "draft"
    },
    "description": {
      "type": "string",
      "description": "Category description"
    },
    "parentId": {
      "type": "string",
      "description": "Parent category UUID for nested categories"
    },
    "seoTitle": {"type": "string"},
    "seoDescription": {"type": "string"},
    "seoKeywords": {"type": "string"}
  },
  "required": ["name", "slug"]
}
```

**Output:** Created category object

**Required Scope:** `categories:write`

---

### update_category

Update an existing category.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {"type": "string"},
    "categoryId": {
      "type": "string",
      "description": "Category UUID (required)"
    },
    "name": {"type": "string"},
    "slug": {"type": "string"},
    "status": {
      "type": "string",
      "enum": ["draft", "published", "archived"]
    },
    "description": {"type": "string"},
    "parentId": {"type": "string"},
    "seoTitle": {"type": "string"},
    "seoDescription": {"type": "string"},
    "seoKeywords": {"type": "string"}
  },
  "required": ["categoryId"]
}
```

**Output:** Updated category object

**Required Scope:** `categories:write`

---

### delete_category

Delete a category.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "categoryId": {
      "type": "string",
      "description": "Category UUID to delete"
    }
  },
  "required": ["categoryId"]
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "categoryId": "uuid"
  }
}
```

**Required Scope:** `categories:write`

---

## 2.6 Page Tools (5)

### list_pages

List CMS pages.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "status": {
      "type": "string",
      "enum": ["draft", "published", "archived"],
      "description": "Filter by status"
    },
    "search": {
      "type": "string",
      "description": "Search in title and body"
    },
    "limit": {
      "type": "integer",
      "default": 50,
      "maximum": 200
    },
    "offset": {
      "type": "integer",
      "default": 0
    }
  },
  "required": []
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "string",
        "slug": "string",
        "status": "PageStatus",
        "bodyFormat": "plain | html | markdown",
        "publishedAt": "datetime | null",
        "createdAt": "datetime",
        "updatedAt": "datetime"
      }
    ],
    "total": "number"
  }
}
```

**Required Scope:** `pages:read`

---

### get_page

Get a single page by ID or slug.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "pageId": {
      "type": "string",
      "description": "Page UUID"
    },
    "slug": {
      "type": "string",
      "description": "Page slug (alternative to pageId)"
    }
  },
  "required": []
}
```

**Output:** Full page object including body content

**Required Scope:** `pages:read`

---

### create_page

Create a new CMS page.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "title": {
      "type": "string",
      "description": "Page title (required)",
      "minLength": 1,
      "maxLength": 255
    },
    "slug": {
      "type": "string",
      "description": "URL slug (required)",
      "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
    },
    "status": {
      "type": "string",
      "enum": ["draft", "published"],
      "default": "draft"
    },
    "body": {
      "type": "string",
      "description": "Page content"
    },
    "bodyFormat": {
      "type": "string",
      "enum": ["plain", "html", "markdown"],
      "default": "html"
    },
    "seoTitle": {"type": "string"},
    "seoDescription": {"type": "string"},
    "seoKeywords": {"type": "string"}
  },
  "required": ["title", "slug"]
}
```

**Output:** Created page object

**Required Scope:** `pages:write`

---

### update_page

Update an existing page.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {"type": "string"},
    "pageId": {
      "type": "string",
      "description": "Page UUID (required)"
    },
    "title": {"type": "string"},
    "slug": {"type": "string"},
    "status": {
      "type": "string",
      "enum": ["draft", "published", "archived"]
    },
    "body": {"type": "string"},
    "bodyFormat": {
      "type": "string",
      "enum": ["plain", "html", "markdown"]
    },
    "seoTitle": {"type": "string"},
    "seoDescription": {"type": "string"},
    "seoKeywords": {"type": "string"}
  },
  "required": ["pageId"]
}
```

**Output:** Updated page object

**Required Scope:** `pages:write`

---

### delete_page

Delete a page.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "pageId": {
      "type": "string",
      "description": "Page UUID to delete"
    }
  },
  "required": ["pageId"]
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "pageId": "uuid"
  }
}
```

**Required Scope:** `pages:write`

---

## 2.7 Media Tools (4)

### list_media

List uploaded media files.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "mimeType": {
      "type": "string",
      "description": "Filter by MIME type prefix (e.g., 'image/')"
    },
    "search": {
      "type": "string",
      "description": "Search in altText"
    },
    "limit": {
      "type": "integer",
      "default": 50,
      "maximum": 200
    },
    "offset": {
      "type": "integer",
      "default": 0
    }
  },
  "required": []
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "url": "string",
        "mimeType": "string",
        "width": "number | null",
        "height": "number | null",
        "fileSize": "number | null",
        "altText": "string | null",
        "createdAt": "datetime"
      }
    ],
    "total": "number"
  }
}
```

**Required Scope:** `media:read`

---

### get_media

Get a single media item.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "mediaId": {
      "type": "string",
      "description": "Media UUID"
    }
  },
  "required": ["mediaId"]
}
```

**Output:** Full media object

**Required Scope:** `media:read`

---

### upload_media

Upload a media file.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "url": {
      "type": "string",
      "format": "uri",
      "description": "URL to fetch the image from"
    },
    "base64": {
      "type": "string",
      "description": "Base64-encoded file content (alternative to url)"
    },
    "filename": {
      "type": "string",
      "description": "Original filename (required if using base64)"
    },
    "altText": {
      "type": "string",
      "description": "Alt text for accessibility"
    }
  },
  "required": []
}
```

**Note:** Either `url` or `base64` must be provided.

**Output:** Created media object

**Required Scope:** `media:write`

---

### delete_media

Delete a media file.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "mediaId": {
      "type": "string",
      "description": "Media UUID to delete"
    }
  },
  "required": ["mediaId"]
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "mediaId": "uuid"
  }
}
```

**Required Scope:** `media:write`

---

## 2.8 Webhook Tools (4)

### list_webhooks

List webhook subscriptions.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "isActive": {
      "type": "boolean",
      "description": "Filter by active status"
    }
  },
  "required": []
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "url": "string",
        "events": ["product.created", "order.paid"],
        "isActive": "boolean",
        "lastTriggeredAt": "datetime | null",
        "createdAt": "datetime"
      }
    ],
    "total": "number"
  }
}
```

**Required Scope:** `webhooks:read`

---

### create_webhook

Create a webhook subscription.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "url": {
      "type": "string",
      "format": "uri",
      "description": "Webhook endpoint URL (required)"
    },
    "events": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "product.created", "product.updated", "product.deleted",
          "order.created", "order.paid", "order.fulfilled", "order.cancelled",
          "customer.created", "customer.updated", "customer.deleted"
        ]
      },
      "description": "Events to subscribe to (required)",
      "minItems": 1
    }
  },
  "required": ["url", "events"]
}
```

**Output:** Created webhook object (includes `secret` - only shown once!)

**Required Scope:** `webhooks:write`

---

### update_webhook

Update a webhook subscription.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {"type": "string"},
    "webhookId": {
      "type": "string",
      "description": "Webhook UUID (required)"
    },
    "url": {"type": "string", "format": "uri"},
    "events": {"type": "array", "items": {"type": "string"}},
    "isActive": {"type": "boolean"}
  },
  "required": ["webhookId"]
}
```

**Output:** Updated webhook object

**Required Scope:** `webhooks:write`

---

### delete_webhook

Delete a webhook subscription.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "webhookId": {
      "type": "string",
      "description": "Webhook UUID to delete"
    }
  },
  "required": ["webhookId"]
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "webhookId": "uuid"
  }
}
```

**Required Scope:** `webhooks:write`

---

## 2.9 Audit Tools (2)

### list_audit_logs

List recent audit log entries.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "resourceType": {
      "type": "string",
      "enum": ["product", "page", "category", "customer", "order", "media", "webhook", "api_key"],
      "description": "Filter by resource type"
    },
    "action": {
      "type": "string",
      "enum": ["create", "update", "delete"],
      "description": "Filter by action"
    },
    "resourceId": {
      "type": "string",
      "description": "Filter by specific resource UUID"
    },
    "actorId": {
      "type": "string",
      "description": "Filter by actor (user or API key)"
    },
    "dateFrom": {
      "type": "string",
      "format": "date",
      "description": "Entries on or after this date"
    },
    "dateTo": {
      "type": "string",
      "format": "date",
      "description": "Entries on or before this date"
    },
    "limit": {
      "type": "integer",
      "default": 50,
      "maximum": 200
    },
    "offset": {
      "type": "integer",
      "default": 0
    }
  },
  "required": []
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "actorId": "uuid",
        "actorType": "user | api_key | system | webhook",
        "action": "create | update | delete",
        "resourceId": "uuid",
        "resourceType": "string",
        "diff": {
          "before": {},
          "after": {}
        },
        "ipAddress": "string | null",
        "createdAt": "datetime"
      }
    ],
    "total": "number"
  }
}
```

**Required Scope:** `audit_logs:read`

---

### get_audit_log

Get a single audit log entry.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "storeId": {
      "type": "string",
      "description": "Store UUID"
    },
    "logId": {
      "type": "string",
      "description": "Audit log UUID"
    }
  },
  "required": ["logId"]
}
```

**Output:** Full audit log entry with diff

**Required Scope:** `audit_logs:read`

---

# 3. Tool Summary Table

| Tool | Category | Scope Required | Description |
|------|----------|----------------|-------------|
| list_stores | Store | - | List merchant's stores |
| get_store | Store | - | Get store details |
| update_store | Store | owner | Update store settings |
| get_store_analytics | Store | orders:read | Get analytics overview |
| list_products | Products | products:read | List products |
| get_product | Products | products:read | Get product details |
| create_product | Products | products:write | Create product |
| update_product | Products | products:write | Update product |
| delete_product | Products | products:write | Delete product |
| bulk_update_products | Products | products:write | Bulk operations |
| search_products | Products | products:read | Search products |
| get_product_attributes | Products | products:read | Get attributes |
| get_product_variants | Products | products:read | Get variants |
| list_orders | Orders | orders:read | List orders |
| get_order | Orders | orders:read | Get order details |
| update_order_notes | Orders | orders:write | Update notes |
| record_refund | Orders | orders:write | Record refund |
| export_orders | Orders | orders:read | Export to CSV |
| list_customers | Customers | customers:read | List customers |
| get_customer | Customers | customers:read | Get customer |
| create_customer | Customers | customers:write | Create customer |
| update_customer | Customers | customers:write | Update customer |
| delete_customer | Customers | customers:write | Delete customer |
| list_categories | Categories | categories:read | List categories |
| get_category | Categories | categories:read | Get category |
| create_category | Categories | categories:write | Create category |
| update_category | Categories | categories:write | Update category |
| delete_category | Categories | categories:write | Delete category |
| list_pages | Pages | pages:read | List pages |
| get_page | Pages | pages:read | Get page |
| create_page | Pages | pages:write | Create page |
| update_page | Pages | pages:write | Update page |
| delete_page | Pages | pages:write | Delete page |
| list_media | Media | media:read | List media |
| get_media | Media | media:read | Get media |
| upload_media | Media | media:write | Upload media |
| delete_media | Media | media:write | Delete media |
| list_webhooks | Webhooks | webhooks:read | List webhooks |
| create_webhook | Webhooks | webhooks:write | Create webhook |
| update_webhook | Webhooks | webhooks:write | Update webhook |
| delete_webhook | Webhooks | webhooks:write | Delete webhook |
| list_audit_logs | Audit | audit_logs:read | List audit logs |
| get_audit_log | Audit | audit_logs:read | Get audit entry |

**Total: 42 Tools**

---

# 4. Document Control

**Version:** 1.0  
**Created:** 2025  
**Dependencies:**
- BareCommerce API Contract v1.7
- MCP Protocol Specification
