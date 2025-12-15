# Privacy Policy

BareMCP does not collect telemetry, analytics, or usage data.

## Data Storage

| Data Type | Location | Purpose |
|-----------|----------|---------|
| API credentials | `~/.baremcp/credentials.json` | Authentication with BareCommerceCore API |

### Credential Security

- **Encryption:** AES-256-GCM (authenticated encryption)
- **Key derivation:** Machine-specific using scrypt
- **File permissions:** 0600 (owner read/write only)
- **Directory permissions:** 0700 (owner only)

Credentials are tied to your machine. Copying the credentials file to another machine will not work (decryption will fail).

## Data NOT Collected

- No telemetry
- No analytics
- No crash reporting
- No usage statistics
- No personal information

## Network Requests

BareMCP only makes network requests to:

1. **Your configured BareCommerceCore API endpoint**
   - Default: `https://api.barecommercecore.com`
   - Custom: Value of `BARECOMMERCE_API_URL` environment variable

2. **OAuth authorization endpoints** (during `connect` tool only)
   - Device code request: `POST /auth/device`
   - Token polling: `POST /auth/device/token`

## Third-Party Services

BareMCP does not integrate with any third-party analytics, tracking, or telemetry services.

## Data Sharing

No data is shared with Anthropic, BareCommerceCore, or any third party through this MCP server. All API communication is directly between your machine and your configured API endpoint.

## Deleting Your Data

To remove all locally stored data:

```bash
rm -rf ~/.baremcp
```

This deletes your stored credentials. You will need to re-authenticate using the `connect` tool.

## Contact

For privacy questions about BareMCP, open an issue at:
https://github.com/barecommerce-core/baremcp/issues
