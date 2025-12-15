# Security Model

## Authentication

BareMCP uses **OAuth Device Flow** for authentication:

1. User says "connect to my store"
2. BareMCP requests a device code from the API
3. Browser opens for user to log in
4. User authenticates on BareCommerceCore website
5. Token returned and stored locally (encrypted)

**No API keys are ever typed into chat.**

## Credential Storage

| Property | Value |
|----------|-------|
| **Location** | `~/.baremcp/credentials.json` |
| **Encryption** | AES-256-GCM (authenticated encryption) |
| **Key derivation** | scrypt from machine identity |
| **File permissions** | 0600 (owner read/write only) |
| **Directory permissions** | 0700 (owner only) |

### Machine-Specific Encryption

Credentials are encrypted using a key derived from:
- User home directory path
- Username

This means:
- Credentials **cannot** be copied to another machine
- Credentials **cannot** be decrypted by another user
- Tampering is detected (GCM provides integrity)

### What's Stored

```json
{
  "version": 1,
  "iv": "<random-iv>",
  "data": "<encrypted-payload>"
}
```

The encrypted payload contains:
- API access token
- Store ID and name
- User role (owner, admin, viewer)
- Permission scopes
- Creation timestamp

## Network Security

### Outbound Connections

BareMCP only connects to:

| Destination | Purpose | When |
|-------------|---------|------|
| Your API endpoint | All operations | Always |
| OAuth endpoints | Authentication | `connect` tool only |

Default API: `https://api.barecommercecore.com`

### No Inbound Connections

BareMCP does not:
- Listen on any ports
- Accept incoming connections
- Run a web server

All communication is outbound HTTPS only.

## Webhook URL Restrictions (SSRF Protection)

When creating webhooks, URLs are validated:

| Blocked | Examples |
|---------|----------|
| Localhost | `localhost`, `127.0.0.1`, `::1` |
| Private IPv4 | `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x` |
| Link-local | `169.254.x.x` |
| Non-HTTPS | `http://` URLs rejected |

This prevents Server-Side Request Forgery (SSRF) attacks.

## Input Validation

| Input | Validation |
|-------|------------|
| API keys | Regex: `sk_(test\|live)_[a-zA-Z0-9_]+`, min 32 chars |
| Store IDs | UUID format |
| URLs | Protocol whitelist (http/https only) |
| File uploads | 64MB max (base64 encoded) |

## Error Sanitization

Error messages are sanitized before returning to clients:

| Blocked Patterns | Examples |
|------------------|----------|
| Credentials | password, secret, token, api_key, bearer |
| Infrastructure | database, sql, connection refused |
| Internal details | stack traces, file paths |

Sensitive errors are logged to stderr but return generic messages.

## Command Injection Prevention

Browser opening uses safe argument passing:

```typescript
// Safe: array arguments, no shell
spawn("open", [url], { stdio: "ignore" });

// NOT used: shell string (vulnerable)
exec(`open "${url}"`);
```

## Request Timeouts

| Operation | Timeout |
|-----------|---------|
| Standard requests | 30 seconds |
| File uploads | 2 minutes |

Prevents hanging connections from blocking operations.

## Threat Model Summary

| Threat | Mitigation |
|--------|------------|
| API key in chat | OAuth Device Flow |
| Credential theft | AES-256-GCM encryption |
| Credential portability | Machine-specific key derivation |
| SSRF via webhooks | URL validation, private IP blocking |
| Command injection | spawn() with arrays, not exec() |
| Information disclosure | Error sanitization |
| DoS via uploads | 64MB limit, timeouts |

## Reporting Security Issues

Report security vulnerabilities to: security@barecommercecore.com

Do not open public issues for security bugs.
