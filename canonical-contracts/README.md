# BareMCP — Canonical Contracts

This folder contains the authoritative specification documents for BareMCP, the Model Context Protocol server for BareCommerceCore.

## Document Index

| Document | Version | Description |
|----------|---------|-------------|
| [project-specification-v1.0.md](./project-specification-v1.0.md) | 1.0 | Overall project definition, architecture, and phases |
| [mcp-tools-contract-v1.0.md](./mcp-tools-contract-v1.0.md) | 1.0 | All 42 MCP tools with schemas and behaviors |
| [technical-stack-v1.0.md](./technical-stack-v1.0.md) | 1.0 | Bun runtime, project structure, and configuration |
| [prompts-resources-contract-v1.0.md](./prompts-resources-contract-v1.0.md) | 1.0 | MCP Prompts and Resources definitions |

## Quick Reference

### Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | [Bun](https://bun.sh/) 1.x |
| Language | TypeScript 5.x |
| Protocol | MCP (Model Context Protocol) |
| Target API | BareCommerceCore v1.7+ |

### Tools by Category (42 Total)

| Category | Tools | Scope Required |
|----------|-------|----------------|
| **Store** (4) | list_stores, get_store, update_store, get_store_analytics | owner/orders:read |
| **Products** (9) | list, get, create, update, delete, bulk_update, search, get_attributes, get_variants | products:read/write |
| **Orders** (5) | list, get, update_notes, record_refund, export | orders:read/write |
| **Customers** (5) | list, get, create, update, delete | customers:read/write |
| **Categories** (5) | list, get, create, update, delete | categories:read/write |
| **Pages** (5) | list, get, create, update, delete | pages:read/write |
| **Media** (4) | list, get, upload, delete | media:read/write |
| **Webhooks** (4) | list, create, update, delete | webhooks:read/write |
| **Audit** (2) | list_audit_logs, get_audit_log | audit_logs:read |

### Prompts (5 Total)

| Prompt | Purpose |
|--------|---------|
| `inventory_check` | Check stock levels and generate reorder alerts |
| `order_summary` | Summarize orders for a time period |
| `catalog_review` | Analyze catalog for completeness and SEO |
| `customer_insights` | Analyze customer patterns and segments |
| `daily_briefing` | Morning operations summary |

### Resources (4 Total)

| Resource URI | Content |
|--------------|---------|
| `store://schema/products` | Product entity JSON schema |
| `store://schema/orders` | Order entity JSON schema |
| `store://schema/customers` | Customer entity JSON schema |
| `store://config` | Live store configuration |

## Implementation Status

- [x] **Phase 1:** Foundation ✅
  - [x] Project setup (Bun, TypeScript, MCP SDK)
  - [x] HTTP client with auth
  - [x] Store tools (4)
  - [x] Product tools (9)
  - [x] Unit tests
  
- [x] **Phase 2:** Order & Customer Management ✅
  - [x] Order tools (5)
  - [x] Customer tools (5)
  - [x] Audit tools (2)
  - [x] Unit tests

- [ ] **Phase 3:** Catalog & Content
  - [ ] Category tools (5)
  - [ ] Page tools (5)
  - [ ] Media tools (4)
  - [ ] Webhook tools (4)

- [ ] **Phase 4:** Intelligence Layer
  - [ ] MCP Resources (4)
  - [ ] MCP Prompts (5)
  - [ ] Enhanced analytics

- [ ] **Phase 5:** Distribution
  - [ ] Testing
  - [ ] Documentation
  - [ ] NPM publishing

## Related Documents

- [BareCommerceCore API Contract v1.7](../../barecommerce-core/canonical-contracts/canonical-api-contract-v1.7.md)
- [BareCommerceCore Model Contract v1.7](../../barecommerce-core/canonical-contracts/canonical-model-contract-v1.7.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025 | Initial specification (Bun runtime) |
