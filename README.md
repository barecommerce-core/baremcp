# BareMCP

MCP server for [BareCommerceCore](https://github.com/AltEnding/barecommercecore) e-commerce management via AI assistants.

## Quick Start (30 seconds)

### 1. Install

```bash
bun add -g @barecommercecore/mcp
```

### 2. Configure Claude Desktop

Add to your Claude Desktop config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "baremcp": {
      "command": "baremcp"
    }
  }
}
```

### 3. Connect

Say to Claude: **"Connect to my BareCommerce store"**

A browser window opens for secure OAuth login. No API keys in chat.

## Security

**Never paste API keys into chat.** BareMCP uses browser-based OAuth Device Flow.

- Credentials encrypted with AES-256-GCM at `~/.baremcp/credentials.json`
- Machine-specific encryption (credentials don't work on other machines)
- No telemetry, no analytics — see [PRIVACY.md](PRIVACY.md)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BARECOMMERCE_API_URL` | No | `https://api.barecommercecore.com` | API endpoint |
| `BARECOMMERCE_API_KEY` | No | — | Pre-configured key (skips OAuth) |
| `BARECOMMERCE_DEFAULT_STORE_ID` | No | — | Auto-select store |

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `NOT_AUTHENTICATED` | Not connected | Run `connect` tool first |
| `STORE_ID_REQUIRED` | No default store | Pass `storeId` parameter |
| `RATE_LIMITED` | Too many requests | Wait 60s, retry |
| `UNAUTHORIZED` | Invalid/expired token | Run `disconnect` then `connect` |
| `TIMEOUT` | Request took >30s | Check network, retry |

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for complete error reference.

## Features

- **46 Tools** for complete store management
- **4 Resources** for quick data access
- **6 Prompts** for guided workflows
- **Multi-tenant** — users authenticate at runtime

### Tools by Category

| Category | Tools |
|----------|-------|
| **Session** | `connect`, `disconnect`, `status` |
| **Store** | `list_stores`, `get_store`, `update_store`, `get_store_analytics` |
| **Products** | `list_products`, `get_product`, `create_product`, `update_product`, `delete_product`, `bulk_update_products`, `search_products`, `get_product_variants`, `update_variant` |
| **Orders** | `list_orders`, `get_order`, `update_order_notes`, `record_refund`, `export_orders` |
| **Customers** | `list_customers`, `get_customer`, `create_customer`, `update_customer`, `delete_customer` |
| **Categories** | `list_categories`, `get_category`, `create_category`, `update_category`, `delete_category` |
| **Pages** | `list_pages`, `get_page`, `create_page`, `update_page`, `delete_page` |
| **Media** | `list_media`, `get_media`, `upload_media`, `delete_media` |
| **Webhooks** | `list_webhooks`, `create_webhook`, `update_webhook`, `delete_webhook` |
| **Audit** | `list_audit_logs`, `get_audit_log` |

### Resources

| URI | Description |
|-----|-------------|
| `store://config` | Store settings, currency, timezone, contact info |
| `store://schema` | Product attribute and metafield definitions |
| `store://categories` | Hierarchical category tree |

### Prompts

| Name | Description |
|------|-------------|
| `create-product` | Guided product creation workflow |
| `sales-report` | Generate sales summary for date range |
| `inventory-check` | Find low stock products |
| `customer-lookup` | Find customer and order history |
| `bulk-price-update` | Update prices across products |
| `product-catalog-export` | Export catalog data |

## Usage Examples

### Products

> "List all published products"
> "Create a new product called 'Wireless Headphones' priced at $79.99"
> "Find products with less than 10 items in stock"

### Orders

> "Show me orders from last week"
> "Get details for order ORD-2024-001"

### Customers

> "Find customer with email john@example.com"

### Analytics

> "Give me a sales report for this month"

## Documentation

- [Configuration Reference](docs/CONFIGURATION.md)
- [Security Model](docs/SECURITY.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [Privacy Policy](PRIVACY.md)
- [Changelog](CHANGELOG.md)

## Development

```bash
# Install dependencies
bun install

# Type check
bun run typecheck

# Run tests
bun test

# Build
bun run build

# Run locally
bun run dev
```

## License

MIT — see [LICENSE](LICENSE)

## Links

- [BareCommerceCore](https://github.com/barecommerce-core/barecommercecore)
- [MCP Specification](https://modelcontextprotocol.io)
- [Claude Desktop](https://claude.ai/download)
