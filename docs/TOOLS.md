# Tool Reference

Complete reference for all BareMCP tools.

## Stability Labels

| Label | Meaning |
|-------|---------|
| **STABLE** | No breaking changes in minor versions |
| **EXPERIMENTAL** | May change without notice |

## Transport Support

| Transport | Status |
|-----------|--------|
| stdio | Supported (default) |
| SSE | Not currently supported |

---

## Session Tools

### connect [STABLE]

Connect to BareCommerceCore via browser-based OAuth Device Flow.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `apiUrl` | string | No | Custom API endpoint for self-hosted instances |

**Returns:** Connection status, store info, user role

### disconnect [STABLE]

Clear stored credentials and disconnect from the current store.

**Parameters:** None

**Returns:** Disconnection confirmation

### status [STABLE]

Check current connection status, store info, and user role.

**Parameters:** None

**Returns:** Connection state, store details, credential info

---

## Store Tools

### list_stores [STABLE]

List all stores accessible to the authenticated user.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Results per page (default: 20) |

### get_store [STABLE]

Get detailed information about a specific store.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |

### update_store [STABLE]

Update store settings.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `name` | string | No | Store name |
| `description` | string | No | Store description |
| `currency` | string | No | Currency code (e.g., "USD") |
| `timezone` | string | No | Timezone (e.g., "America/New_York") |

---

## Product Tools

### list_products [STABLE]

List products with filtering and pagination.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `status` | string | No | Filter by status: draft, published, archived |
| `categoryId` | string | No | Filter by category UUID |
| `search` | string | No | Search query |
| `page` | number | No | Page number |
| `limit` | number | No | Results per page |

### get_product [STABLE]

Get detailed product information including variants.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `productId` | string | Yes | Product UUID |

### create_product [STABLE]

Create a new product.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `name` | string | Yes | Product name |
| `slug` | string | No | URL slug (auto-generated if omitted) |
| `description` | string | No | Product description |
| `price` | number | Yes | Price in store currency |
| `compareAtPrice` | number | No | Original price for sale display |
| `status` | string | No | draft, published, archived |
| `categoryIds` | string[] | No | Category UUIDs |

### update_product [STABLE]

Update an existing product.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `productId` | string | Yes | Product UUID |
| `name` | string | No | Product name |
| `description` | string | No | Product description |
| `price` | number | No | Price |
| `status` | string | No | draft, published, archived |

### delete_product [STABLE]

Delete a product.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `productId` | string | Yes | Product UUID |

### update_product_inventory [STABLE]

Update inventory quantity for a product or variant.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `productId` | string | Yes | Product UUID |
| `quantity` | number | Yes | New inventory quantity |
| `variantId` | string | No | Variant UUID (if updating variant) |

### bulk_update_product_status [EXPERIMENTAL]

Update status for multiple products at once.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `productIds` | string[] | Yes | Array of product UUIDs |
| `status` | string | Yes | New status for all products |

---

## Order Tools

### list_orders [STABLE]

List orders with filtering.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `status` | string | No | Filter by status |
| `customerId` | string | No | Filter by customer |
| `startDate` | string | No | Start date (ISO 8601) |
| `endDate` | string | No | End date (ISO 8601) |
| `page` | number | No | Page number |
| `limit` | number | No | Results per page |

### get_order [STABLE]

Get detailed order information.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `orderId` | string | Yes | Order UUID |

### update_order_status [STABLE]

Update order fulfillment status.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `orderId` | string | Yes | Order UUID |
| `status` | string | Yes | New status |

### add_order_note [STABLE]

Add a note to an order.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `orderId` | string | Yes | Order UUID |
| `note` | string | Yes | Note content (max 1000 chars) |

---

## Customer Tools

### list_customers [STABLE]

List customers with filtering.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `search` | string | No | Search by name or email |
| `page` | number | No | Page number |
| `limit` | number | No | Results per page |

### get_customer [STABLE]

Get customer details including order history.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `customerId` | string | Yes | Customer UUID |

### create_customer [STABLE]

Create a new customer.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `email` | string | Yes | Customer email |
| `firstName` | string | No | First name |
| `lastName` | string | No | Last name |
| `phone` | string | No | Phone number |

### update_customer [STABLE]

Update customer information.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `customerId` | string | Yes | Customer UUID |
| `firstName` | string | No | First name |
| `lastName` | string | No | Last name |
| `phone` | string | No | Phone number |

---

## Category Tools

### list_categories [STABLE]

List all categories in hierarchical structure.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |

### get_category [STABLE]

Get category details.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `categoryId` | string | Yes | Category UUID |

### create_category [STABLE]

Create a new category.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `name` | string | Yes | Category name |
| `slug` | string | No | URL slug |
| `parentId` | string | No | Parent category UUID |
| `description` | string | No | Category description |

### update_category [STABLE]

Update a category.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `categoryId` | string | Yes | Category UUID |
| `name` | string | No | Category name |
| `description` | string | No | Category description |

### delete_category [STABLE]

Delete a category.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `categoryId` | string | Yes | Category UUID |

---

## Page Tools

### list_pages [STABLE]

List content pages.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `status` | string | No | Filter by status |

### get_page [STABLE]

Get page content.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `pageId` | string | Yes | Page UUID |

### create_page [STABLE]

Create a new content page.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `title` | string | Yes | Page title |
| `slug` | string | No | URL slug |
| `content` | string | No | Page content (HTML/Markdown) |
| `status` | string | No | draft or published |

### update_page [STABLE]

Update a content page.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `pageId` | string | Yes | Page UUID |
| `title` | string | No | Page title |
| `content` | string | No | Page content |
| `status` | string | No | draft or published |

### delete_page [STABLE]

Delete a content page.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `pageId` | string | Yes | Page UUID |

---

## Media Tools

### list_media [STABLE]

List uploaded media files.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `page` | number | No | Page number |
| `limit` | number | No | Results per page |

### get_media [STABLE]

Get media file details.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `mediaId` | string | Yes | Media UUID |

### upload_media [STABLE]

Upload a media file (base64 encoded).

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `filename` | string | Yes | File name |
| `content` | string | Yes | Base64-encoded file content |
| `mimeType` | string | Yes | MIME type (e.g., "image/jpeg") |

**Limits:** 64MB max file size

### delete_media [STABLE]

Delete a media file.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `mediaId` | string | Yes | Media UUID |

---

## Webhook Tools

### list_webhooks [STABLE]

List configured webhooks.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |

### create_webhook [STABLE]

Create a new webhook.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `url` | string | Yes | Webhook URL (HTTPS required) |
| `events` | string[] | Yes | Event types to subscribe |
| `secret` | string | No | Signing secret |

**URL Restrictions:** Must be HTTPS. Localhost and private IPs blocked.

### update_webhook [STABLE]

Update a webhook.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `webhookId` | string | Yes | Webhook UUID |
| `url` | string | No | New URL |
| `events` | string[] | No | New event types |
| `enabled` | boolean | No | Enable/disable |

### delete_webhook [STABLE]

Delete a webhook.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `webhookId` | string | Yes | Webhook UUID |

---

## Audit Tools

### list_audit_logs [STABLE]

List audit log entries.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `action` | string | No | Filter by action type |
| `userId` | string | No | Filter by user |
| `startDate` | string | No | Start date (ISO 8601) |
| `endDate` | string | No | End date (ISO 8601) |
| `page` | number | No | Page number |
| `limit` | number | No | Results per page |

### get_audit_log [STABLE]

Get audit log entry details.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string | Yes | Store UUID |
| `logId` | string | Yes | Audit log UUID |
