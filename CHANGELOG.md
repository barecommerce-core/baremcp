# Changelog

All notable changes to BareMCP are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-15

### Added

- Initial public release
- 46 MCP tools for e-commerce store management:
  - **Session:** `connect`, `disconnect`, `status`
  - **Store:** `get_store`, `update_store`, `list_stores`
  - **Products:** `list_products`, `get_product`, `create_product`, `update_product`, `delete_product`, `update_product_inventory`, `bulk_update_product_status`
  - **Categories:** `list_categories`, `get_category`, `create_category`, `update_category`, `delete_category`
  - **Orders:** `list_orders`, `get_order`, `update_order_status`, `add_order_note`
  - **Customers:** `list_customers`, `get_customer`, `create_customer`, `update_customer`
  - **Pages:** `list_pages`, `get_page`, `create_page`, `update_page`, `delete_page`
  - **Media:** `list_media`, `get_media`, `upload_media`, `delete_media`
  - **Webhooks:** `list_webhooks`, `get_webhook`, `create_webhook`, `update_webhook`, `delete_webhook`, `test_webhook`
  - **Audit:** `list_audit_logs`, `get_audit_log`
- 4 MCP resources:
  - `store://config` - Store configuration
  - `store://schema` - API schema reference
  - `store://categories` - Category tree
  - `store://stats` - Store analytics
- 6 MCP prompts for guided workflows
- OAuth Device Flow authentication (no API keys in chat)
- Encrypted credential storage (`~/.baremcp/credentials.json`)
- CLI flags: `--version`, `--help`

### Security

- AES-256-GCM encryption for stored credentials
- Machine-specific key derivation (credentials non-portable)
- SSRF protection for webhook URLs (blocks localhost/private IPs)
- Error message sanitization (no secrets in output)
- 30-second request timeout with structured error handling
- Credential integrity validation on load

### Documentation

- PRIVACY.md documenting no-telemetry policy
- Comprehensive tool descriptions for LLM consumption
- Environment variable reference
