# BareMCP — Project Specification v1.0

**Status:** Authoritative Reference  
**Purpose:** Defines the BareMCP Model Context Protocol server for BareCommerceCore  
**Parent Project:** BareCommerceCore v1.7+

---

# 1. Executive Summary

BareMCP is a Model Context Protocol (MCP) server that enables merchants to manage their BareCommerceCore stores through LLM-powered interfaces. It provides a standardized way for AI assistants (Claude, GPT, etc.) to interact with BareCommerceCore APIs on behalf of authenticated merchants.

## 1.1 Vision

Allow merchants to manage their e-commerce operations through natural language:
- "Show me all products that are low on stock"
- "Create a new product called 'Summer T-Shirt' priced at $29.99"
- "What were my top 5 orders this week?"
- "Update the About page with new company info"

## 1.2 Key Features

- **Multi-Store Support:** Single connection manages all stores tied to a merchant account
- **Full CRUD Operations:** Products, Pages, Categories, Customers, Media
- **Order Management:** View orders, add notes, record refunds
- **Analytics & Reporting:** Inventory reports, order summaries, store analytics
- **Media Management:** Upload, list, and manage media files
- **Webhook Configuration:** Manage outgoing webhook subscriptions
- **Audit Trail:** View activity logs and changes

## 1.3 Technology

- **Runtime:** [Bun](https://bun.sh/) — Fast JavaScript runtime with built-in TypeScript, bundler, and test runner
- **Protocol:** Model Context Protocol (MCP) by Anthropic
- **Target API:** BareCommerceCore API v1.7+

---

# 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        LLM Interface                             │
│                  (Claude, ChatGPT, etc.)                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │ MCP Protocol (stdio)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BareMCP Server (Bun)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Tools     │  │  Resources  │  │   Prompts   │              │
│  │  (42 total) │  │  (schemas)  │  │ (workflows) │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                          │                                       │
│  ┌───────────────────────┴───────────────────────┐              │
│  │              Authentication Layer              │              │
│  │         (API Key + Store Selection)            │              │
│  └───────────────────────┬───────────────────────┘              │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BareCommerceCore API                          │
│              (merchant's hosted instance)                        │
│                                                                  │
│  /api/stores/{storeId}/products                                  │
│  /api/stores/{storeId}/orders                                    │
│  /api/stores/{storeId}/customers                                 │
│  /api/stores/{storeId}/...                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

# 3. Connection Model

## 3.1 Configuration

BareMCP connects to BareCommerceCore using merchant-provided credentials.

**Using Bun (recommended):**
```json
{
  "mcpServers": {
    "barecommercecore": {
      "command": "bunx",
      "args": ["baremcp"],
      "env": {
        "BARECOMMERCE_API_URL": "https://your-instance.com",
        "BARECOMMERCE_API_KEY": "sk_live_xxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

**Using npx (Node.js fallback):**
```json
{
  "mcpServers": {
    "barecommercecore": {
      "command": "npx",
      "args": ["-y", "baremcp"],
      "env": {
        "BARECOMMERCE_API_URL": "https://your-instance.com",
        "BARECOMMERCE_API_KEY": "sk_live_xxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

**Local development:**
```json
{
  "mcpServers": {
    "barecommercecore": {
      "command": "bun",
      "args": ["run", "/path/to/baremcp/src/index.ts"],
      "env": {
        "BARECOMMERCE_API_URL": "http://localhost:3000",
        "BARECOMMERCE_API_KEY": "sk_test_xxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

## 3.2 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BARECOMMERCE_API_URL` | Yes | Base URL of merchant's BareCommerceCore instance |
| `BARECOMMERCE_API_KEY` | Yes | Merchant's API key (sk_live_* or sk_test_*) |
| `BARECOMMERCE_DEFAULT_STORE_ID` | No | Default store if merchant has multiple |

## 3.3 Multi-Store Handling

When a merchant has multiple stores:
1. Tools that require a store context accept an optional `storeId` parameter
2. If `storeId` is not provided, uses `BARECOMMERCE_DEFAULT_STORE_ID`
3. If no default is set, the `list_stores` tool must be called first
4. LLM can ask user which store to operate on

---

# 4. Capability Summary

## 4.1 Tools (42 Total)

| Category | Count | Operations |
|----------|-------|------------|
| Store | 4 | List, get info, update settings, analytics |
| Products | 9 | CRUD, bulk ops, search, attributes, variants |
| Orders | 5 | List, get, notes, refund, export |
| Customers | 5 | CRUD, order history |
| Categories | 5 | CRUD, hierarchy |
| Pages | 5 | CRUD |
| Media | 4 | List, get, upload, delete |
| Webhooks | 4 | CRUD |
| Audit | 2 | List logs, get entry |

## 4.2 Resources (4 Total)

| Resource | Description |
|----------|-------------|
| `store://schema/products` | Product validation schema |
| `store://schema/orders` | Order data schema |
| `store://schema/customers` | Customer data schema |
| `store://config` | Current store configuration |

## 4.3 Prompts (5 Total)

| Prompt | Description |
|--------|-------------|
| `inventory_check` | Check stock levels and alert on low inventory |
| `order_summary` | Summarize orders for a time period |
| `catalog_review` | Analyze catalog for completeness and SEO |
| `customer_insights` | Analyze customer patterns |
| `daily_briefing` | Morning operations summary |

---

# 5. Security Model

## 5.1 Authentication Flow

```
1. Merchant generates API key in BareCommerceCore dashboard
2. Merchant configures MCP client with API key + instance URL
3. BareMCP includes key in all requests to BareCommerceCore API
4. BareCommerceCore validates key and returns merchant's data
```

## 5.2 Scope Inheritance

BareMCP respects the scopes assigned to the API key:

| API Key Scope | BareMCP Tools Enabled |
|--------------|----------------------|
| `products:read` | list_products, get_product, search_products |
| `products:write` | create_product, update_product, delete_product, bulk_* |
| `orders:read` | list_orders, get_order, export_orders |
| `orders:write` | update_order_notes, record_refund |
| `customers:read` | list_customers, get_customer |
| `customers:write` | create_customer, update_customer, delete_customer |
| `categories:read` | list_categories, get_category |
| `categories:write` | create_category, update_category, delete_category |
| `pages:read` | list_pages, get_page |
| `pages:write` | create_page, update_page, delete_page |
| `media:read` | list_media, get_media |
| `media:write` | upload_media, delete_media |
| `webhooks:read` | list_webhooks |
| `webhooks:write` | create_webhook, update_webhook, delete_webhook |
| `audit_logs:read` | list_audit_logs, get_audit_log |

## 5.3 Data Isolation

- Each API key is scoped to a single merchant
- Merchants can only access their own stores
- No cross-merchant data access is possible

---

# 6. Error Handling

## 6.1 MCP Error Responses

All tools return consistent error structures:

```typescript
interface ToolError {
  code: string;        // Machine-readable code
  message: string;     // Human-readable message
  details?: object;    // Additional context
}
```

## 6.2 Error Code Mapping

| BareCommerceCore Error | MCP Error Code | Description |
|------------------------|----------------|-------------|
| 400 BAD_REQUEST | `INVALID_INPUT` | Malformed request |
| 401 UNAUTHORIZED | `AUTH_FAILED` | Invalid API key |
| 403 FORBIDDEN | `ACCESS_DENIED` | Insufficient permissions |
| 404 NOT_FOUND | `NOT_FOUND` | Resource doesn't exist |
| 409 CONFLICT | `CONFLICT` | Duplicate or constraint violation |
| 429 RATE_LIMITED | `RATE_LIMITED` | Too many requests |
| 500 INTERNAL | `SERVER_ERROR` | BareCommerceCore server error |

---

# 7. Implementation Phases

## Phase 1: Foundation (Core)
- [x] Project setup (Bun, TypeScript, MCP SDK)
- [x] HTTP client with authentication
- [x] Store management tools (list, get, update, analytics)
- [x] Product tools (full CRUD + search + bulk)
- [x] Error handling framework

## Phase 2: Order & Customer Management
- [x] Order tools (list, get, notes, refund, export)
- [x] Customer tools (full CRUD)
- [x] Address management
- [x] Audit log tools

## Phase 3: Catalog & Content
- [ ] Category tools (full CRUD + hierarchy)
- [ ] Page tools (full CRUD)
- [ ] Media tools (list, get, upload, delete)
- [ ] Webhook tools (full CRUD)

## Phase 4: Intelligence Layer
- [ ] MCP Resources (schemas)
- [ ] MCP Prompts (workflows)
- [ ] Enhanced analytics

## Phase 5: Polish & Distribution
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] NPM package publishing
- [ ] Example configurations

---

# 8. Success Metrics

## 8.1 Functional Requirements

- All 42 tools implemented and tested
- 100% alignment with BareCommerceCore API contract v1.7
- Sub-second response times for read operations
- Proper error handling for all edge cases

## 8.2 User Experience Goals

- Natural language operations feel intuitive
- Multi-store workflows are seamless
- Error messages are actionable
- Complex operations (bulk, variants) are accessible

---

# 9. Document Control

**Version:** 1.0  
**Created:** 2025  
**Author:** BareCommerceCore Team  
**Dependencies:** 
- BareCommerceCore API Contract v1.7
- MCP Protocol Specification (Anthropic)
- Bun 1.x Runtime
