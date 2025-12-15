# API Stability

BareMCP follows strict versioning and stability guarantees for public releases.

## Versioning

BareMCP follows [Semantic Versioning](https://semver.org/):

| Version Component | When Incremented |
|-------------------|------------------|
| **MAJOR** (1.x.x) | Breaking changes to tool schemas, behavior, or removed tools |
| **MINOR** (x.1.x) | New tools, new optional parameters, new resources/prompts |
| **PATCH** (x.x.1) | Bug fixes, documentation updates, performance improvements |

## Stability Labels

Each tool is labeled with its stability status:

| Label | Meaning | Guarantee |
|-------|---------|-----------|
| **STABLE** | Production-ready | No breaking changes in minor versions |
| **EXPERIMENTAL** | Working but evolving | May change without notice in any release |
| **DEPRECATED** | Scheduled for removal | Warning emitted; removed in next major version |

### Current Tool Stability

See [docs/TOOLS.md](docs/TOOLS.md) for the complete list of tools with their stability labels.

**Summary:**
- 45 tools marked **STABLE**
- 1 tool marked **EXPERIMENTAL** (`bulk_update_product_status`)
- 0 tools marked **DEPRECATED**

## Deprecation Policy

When a tool or feature is deprecated:

1. **Announcement**: Marked as `[DEPRECATED]` in documentation
2. **Warning Period**: Minimum 1 minor version with runtime warnings
3. **Removal**: Removed in the next major version

### Runtime Deprecation Warnings

When you call a deprecated tool, a warning is logged to stderr:

```
[BareMCP] [DEPRECATED] tool_name will be removed in v2.0. Use alternative_tool instead.
```

### Example Timeline

```
v1.2.0 - Tool 'old_feature' marked deprecated
v1.3.0 - Continued deprecation warning
v2.0.0 - Tool 'old_feature' removed
```

## Breaking Changes

A **breaking change** is any change that could cause existing integrations to fail:

- Removing a tool
- Changing required parameters
- Changing the structure of returned data
- Changing error codes or behavior
- Removing optional parameters that were commonly used

### Non-Breaking Changes

These are NOT considered breaking changes:

- Adding new tools
- Adding optional parameters to existing tools
- Adding new fields to response objects
- Improving error messages (while keeping error codes stable)
- Performance improvements
- Documentation updates

## Compatibility Matrix

| BareMCP Version | BareCommerceCore API | MCP SDK |
|-----------------|---------------------|---------|
| 1.0.x | v1 | ^1.0.0 |

## Migration Guides

When major versions are released, migration guides will be provided in the [CHANGELOG.md](CHANGELOG.md).

## Questions?

For stability or compatibility questions, open an issue at:
https://github.com/barecommerce-core/baremcp/issues
