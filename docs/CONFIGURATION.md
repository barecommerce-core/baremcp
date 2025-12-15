# Configuration Reference

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BARECOMMERCE_API_URL` | No | `https://api.barecommercecore.com` | BareCommerceCore API endpoint |
| `BARECOMMERCE_API_KEY` | No | — | Pre-configured API key (bypasses OAuth) |
| `BARECOMMERCE_DEFAULT_STORE_ID` | No | — | Default store UUID for all operations |

## MCP Client Configuration

### Claude Desktop

**Config file locations:**
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

### Hosted Mode (Recommended)

Users authenticate via browser at runtime. No configuration needed:

```json
{
  "mcpServers": {
    "baremcp": {
      "command": "baremcp"
    }
  }
}
```

### Self-Hosted Mode

Pre-configure credentials for single-merchant deployments:

```json
{
  "mcpServers": {
    "baremcp": {
      "command": "baremcp",
      "env": {
        "BARECOMMERCE_API_URL": "https://api.mystore.com",
        "BARECOMMERCE_API_KEY": "sk_live_your_api_key_here",
        "BARECOMMERCE_DEFAULT_STORE_ID": "550e8400-e29b-41d4-a716-446655440000"
      }
    }
  }
}
```

### Custom API Endpoint

Connect to a self-hosted BareCommerceCore instance:

```json
{
  "mcpServers": {
    "baremcp": {
      "command": "baremcp",
      "env": {
        "BARECOMMERCE_API_URL": "https://api.mycompany.com"
      }
    }
  }
}
```

Users can then authenticate via OAuth to this custom endpoint.

### Running from Source

If installed from source instead of npm:

```json
{
  "mcpServers": {
    "baremcp": {
      "command": "bun",
      "args": ["run", "/path/to/baremcp/src/index.ts"]
    }
  }
}
```

## API Key Formats

| Format | Environment | Description |
|--------|-------------|-------------|
| `sk_live_*` | Production | Full access to production data |
| `sk_test_*` | Sandbox | Test environment, no real transactions |

Keys must be at least 32 characters total.

## Credential Storage

When using OAuth (hosted mode), credentials are stored at:

```
~/.baremcp/credentials.json
```

This file contains:
- Encrypted API token
- Store ID
- Store name
- User role
- Permission scopes
- Timestamp

The file is:
- Encrypted with AES-256-GCM
- Machine-specific (won't work if copied)
- Permission 0600 (owner read/write only)

## CLI Options

```bash
baremcp --version    # Print version
baremcp --help       # Show help
```

## Data Storage Summary

| Data | Location | Encrypted |
|------|----------|-----------|
| API credentials | `~/.baremcp/credentials.json` | Yes (AES-256-GCM) |
| Configuration | Environment variables | No (use secrets manager) |
| Logs | stderr | No (redacted) |
