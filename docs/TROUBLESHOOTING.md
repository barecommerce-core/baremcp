# Troubleshooting Guide

## Error Code Reference

### Authentication Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `NOT_AUTHENTICATED` | Must call connect first | No active session | Run the `connect` tool |
| `UNAUTHORIZED` | Invalid or expired API key | Token expired or revoked | Run `disconnect` then `connect` |
| `PERMISSION_DENIED` | Missing permission: X | Role lacks required permission | Contact store admin for access |

### Configuration Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `STORE_ID_REQUIRED` | No store ID provided | Missing storeId parameter | Pass `storeId` or set `BARECOMMERCE_DEFAULT_STORE_ID` |
| `CONFIG_ERROR` | Invalid configuration | Bad API key format or URL | Check environment variables |

### Request Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `NOT_FOUND` | Resource not found | ID doesn't exist | Verify the ID is correct |
| `INVALID_INPUT` | Validation failed | Bad input data | Check `details` field for specifics |
| `RATE_LIMITED` | Too many requests | Rate limit exceeded | Wait 60 seconds, retry |
| `TIMEOUT` | Request timed out | Network issue or slow API | Check connection, retry |

### System Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `UNKNOWN_ERROR` | An error occurred | Internal/sanitized error | Check server logs (stderr) |

## Common Issues

### Browser Doesn't Open During Connect

**Symptoms:** Running `connect` shows URL but browser doesn't open.

**Solutions:**
1. Copy the URL from terminal and open manually
2. Check default browser settings
3. On Linux, ensure `xdg-open` is installed
4. On Windows WSL, browser opening may not work

### Credentials File Corrupt

**Symptoms:** "Could not load credentials" error on startup.

**Cause:** File damaged, or copied from another machine.

**Solution:**
```bash
rm ~/.baremcp/credentials.json
```
Then run `connect` again.

### Wrong Store Connected

**Symptoms:** Operations affect wrong store.

**Solution:**
1. Run `disconnect` tool
2. Run `connect` tool
3. Select correct store during OAuth

### "Permission Denied" Errors

**Symptoms:** `PERMISSION_DENIED` on operations you expect to work.

**Cause:** Your API key role lacks the required permission.

**Solution:**
1. Run `status` tool to check your role
2. Contact store admin for elevated access
3. Use a different API key with more permissions

### Connection Timeout

**Symptoms:** `TIMEOUT` error on requests.

**Possible causes:**
- Network connectivity issues
- API server down
- Firewall blocking requests

**Solutions:**
1. Check internet connection
2. Verify API URL is correct
3. Try again later
4. Check BareCommerceCore status page

### Rate Limiting

**Symptoms:** `RATE_LIMITED` error.

**Solution:**
- Wait 60 seconds before retrying
- Reduce request frequency
- Contact support for higher limits

## Debug Mode

Enable verbose logging:

```bash
DEBUG=baremcp baremcp
```

This outputs detailed request/response information to stderr.

## Log Locations

| Log Type | Location |
|----------|----------|
| Server logs | stderr (console) |
| Credential errors | stderr |
| Request details | stderr (debug mode) |

BareMCP does not write log files. All logging goes to stderr.

## Verifying Installation

```bash
# Check version
baremcp --version

# Should output: 1.0.0

# Check help
baremcp --help
```

## Verifying Connection

After connecting, run the `status` tool:

```
User: "Check my connection status"
Claude: [calls status tool]
```

Should return:
- Connected: true/false
- Store name
- Your role
- Credential file location

## Getting Help

1. Check this troubleshooting guide
2. Search [GitHub Issues](https://github.com/barecommerce-core/baremcp/issues)
3. Open a new issue with:
   - Error message (full text)
   - Steps to reproduce
   - BareMCP version (`baremcp --version`)
   - OS and version
