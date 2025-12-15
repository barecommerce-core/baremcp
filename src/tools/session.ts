/**
 * BareMCP — Session Tools
 *
 * Tools for authentication and session management using OAuth Device Flow:
 * - connect: Initiates browser-based authentication (no API key in chat!)
 * - disconnect: Clears stored credentials
 * - status: Check connection status
 */

import { z } from "zod";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import type { HttpClient } from "../client/index.js";
import { formatError, formatSuccess, NotAuthenticatedError } from "../client/index.js";
import type { Store, Role } from "../client/index.js";
import type { ToolDefinition } from "./types.js";

// =============================================================================
// Constants
// =============================================================================

const CONFIG_DIR = join(homedir(), ".baremcp");
const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials.json");
const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 180; // 15 minutes max

// =============================================================================
// Credential Storage (Encrypted at rest with integrity verification)
// =============================================================================

/**
 * Stored credential structure.
 * Encrypted using AES-256-GCM which provides both confidentiality AND integrity.
 * The GCM auth tag ensures any tampering with the encrypted data will be detected.
 */
interface StoredCredentials {
  apiKey: string;
  storeId: string;
  storeName: string;
  role: Role;
  scopes: string[];
  createdAt: string;
}

interface EncryptedData {
  version: 1;
  iv: string; // hex encoded
  data: string; // hex encoded encrypted data + GCM auth tag (provides integrity)
}

/**
 * Validate that decrypted credentials have all required fields.
 * This protects against partial corruption or format changes.
 */
function isValidCredentials(obj: unknown): obj is StoredCredentials {
  if (!obj || typeof obj !== "object") return false;
  const creds = obj as Record<string, unknown>;
  return (
    typeof creds.apiKey === "string" &&
    creds.apiKey.length > 0 &&
    typeof creds.storeId === "string" &&
    creds.storeId.length > 0 &&
    typeof creds.storeName === "string" &&
    typeof creds.role === "string" &&
    Array.isArray(creds.scopes) &&
    typeof creds.createdAt === "string"
  );
}

// Derive encryption key from machine-specific data
// This provides some protection against copying credential files between machines
function getEncryptionKey(): Buffer {
  // Use a combination of user home directory and a static salt
  // This is not perfect security but significantly better than plaintext
  const salt = "baremcp-creds-v1";
  const keyMaterial = `${homedir()}-${process.env.USER || process.env.USERNAME || "user"}`;
  return scryptSync(keyMaterial, salt, 32);
}

function encrypt(data: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Append auth tag to encrypted data
  const authTag = cipher.getAuthTag();
  encrypted += authTag.toString("hex");

  return {
    version: 1,
    iv: iv.toString("hex"),
    data: encrypted,
  };
}

function decrypt(encrypted: EncryptedData): string {
  if (encrypted.version !== 1) {
    throw new Error("Unsupported credential format version");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, "hex");

  // Extract auth tag (last 32 hex chars = 16 bytes)
  const authTag = Buffer.from(encrypted.data.slice(-32), "hex");
  const encryptedData = encrypted.data.slice(0, -32);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

function saveCredentials(creds: StoredCredentials): void {
  ensureConfigDir();
  const encrypted = encrypt(JSON.stringify(creds));
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(encrypted, null, 2), { mode: 0o600 });
}

function loadCredentials(): StoredCredentials | null {
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      const data = readFileSync(CREDENTIALS_FILE, "utf-8");
      const parsed = JSON.parse(data);

      // Check if it's encrypted format
      if (parsed.version && parsed.iv && parsed.data) {
        // Decryption will fail (throw) if data has been tampered with
        // because the GCM auth tag won't match
        const decrypted = decrypt(parsed as EncryptedData);
        const credentials = JSON.parse(decrypted);

        // Validate credential structure after decryption
        if (!isValidCredentials(credentials)) {
          console.error("[BareMCP] Invalid credential structure in stored file");
          return null;
        }

        return credentials;
      }

      // Legacy unencrypted format - migrate on next save
      // Return the data but it will be re-saved encrypted when credentials are updated
      if (isValidCredentials(parsed)) {
        return parsed;
      }
    }
  } catch {
    // This could be:
    // - GCM auth tag mismatch (tampering detected)
    // - Credentials from different machine
    // - File corruption
    // - JSON parse error
    console.error("[BareMCP] Could not load credentials (may be corrupt or from another machine)");
  }
  return null;
}

function clearCredentials(): void {
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      unlinkSync(CREDENTIALS_FILE);
    }
  } catch {
    // Ignore errors
  }
}

// =============================================================================
// Browser Opening (Safe - no shell injection)
// =============================================================================

/**
 * Validate that a URL is safe to open (HTTPS or HTTP only)
 */
function isValidBrowserUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Open a URL in the default browser safely using spawn (no shell)
 * This prevents command injection attacks
 */
async function openBrowser(url: string): Promise<void> {
  // Validate URL before opening
  if (!isValidBrowserUrl(url)) {
    throw new Error("Invalid URL: must be http:// or https://");
  }

  const { spawn } = await import("child_process");
  const platform = process.platform;

  return new Promise((resolve, reject) => {
    let child;

    if (platform === "darwin") {
      // macOS: use 'open' command
      child = spawn("open", [url], { stdio: "ignore" });
    } else if (platform === "win32") {
      // Windows: use 'cmd' with /c start
      // We use cmd.exe with specific args to avoid shell interpretation
      child = spawn("cmd", ["/c", "start", "", url], { stdio: "ignore" });
    } else {
      // Linux: use xdg-open
      child = spawn("xdg-open", [url], { stdio: "ignore" });
    }

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`Browser open failed with code ${code}`));
      }
    });

    // Don't wait for the browser process to exit
    child.unref();
  });
}

// =============================================================================
// Device Flow Types
// =============================================================================

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  store: {
    id: string;
    name: string;
    domain: string | null;
    currency: string;
    status: string;
  };
  role: Role;
  scopes: string[];
}

interface TokenErrorResponse {
  error: string;
  error_description: string;
}

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * Create session management tools with OAuth Device Flow
 */
export function createSessionTools(client: HttpClient): ToolDefinition[] {
  // Try to auto-connect from stored credentials on startup
  const storedCreds = loadCredentials();
  if (storedCreds) {
    client.setApiKey(storedCreds.apiKey);
    client.setDefaultStoreId(storedCreds.storeId);
    console.error(`[BareMCP] Auto-connected to "${storedCreds.storeName}" from saved credentials`);
  }

  return [
    // =========================================================================
    // connect
    // =========================================================================
    {
      name: "connect",
      description:
        "Connect to your BareCommerceCore store securely via browser login. " +
        "This opens your browser where you log in and authorize access — no API key needed in chat! " +
        "Your credentials are stored locally in ~/.baremcp/credentials.json. " +
        "Optionally specify 'apiUrl' to connect to a self-hosted BareCommerce instance.",
      inputSchema: {
        type: "object",
        properties: {
          apiUrl: {
            type: "string",
            description: "Custom API URL for self-hosted BareCommerce instances (e.g., https://api.mystore.com). Defaults to https://api.barecommercecore.com",
          },
        },
      },
      handler: async (args: { apiUrl?: string }) => {
        try {
          // If custom API URL provided, update client
          if (args.apiUrl) {
            client.setBaseUrl(args.apiUrl);
            console.error(`[BareMCP] Using custom API URL: ${args.apiUrl}`);
          }

          // Check if already connected
          if (client.isAuthenticated()) {
            const storeId = client.getDefaultStoreId();
            if (storeId) {
              try {
                const response = await client.get<{ item: Store }>(`/stores/${storeId}`);
                return formatSuccess({
                  connected: true,
                  store: {
                    id: response.item.id,
                    name: response.item.name,
                    domain: response.item.domain,
                    currency: response.item.currency,
                  },
                  message: `Already connected to "${response.item.name}". Use 'disconnect' first to connect to a different store.`,
                });
              } catch {
                // Token might be invalid, continue with new auth
                client.clearAuth();
              }
            }
          }

          // Step 1: Request device code
          const apiUrl = client.getBaseUrl();
          const deviceResponse = await fetch(`${apiUrl}/auth/device`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_name: "BareMCP" }),
          });

          if (!deviceResponse.ok) {
            throw new Error(`Failed to initiate device flow: ${deviceResponse.statusText}`);
          }

          const deviceData = (await deviceResponse.json()) as DeviceCodeResponse;

          // Step 2: Open browser for user authorization
          console.error(`\n[BareMCP] Opening browser for authorization...`);
          console.error(`[BareMCP] If browser doesn't open, visit: ${deviceData.verification_uri_complete}`);
          console.error(`[BareMCP] Enter code: ${deviceData.user_code}\n`);

          try {
            await openBrowser(deviceData.verification_uri_complete);
          } catch {
            console.error(`[BareMCP] Could not open browser automatically. Please visit the URL manually.`);
          }

          // Step 3: Poll for token
          console.error(`[BareMCP] Waiting for authorization...`);
          
          let attempts = 0;
          const interval = Math.max(deviceData.interval * 1000, POLL_INTERVAL_MS);

          while (attempts < MAX_POLL_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, interval));
            attempts++;

            const tokenResponse = await fetch(`${apiUrl}/auth/device/token`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                device_code: deviceData.device_code,
                grant_type: "urn:ietf:params:oauth:grant-type:device_code",
              }),
            });

            if (tokenResponse.ok) {
              // Success!
              const tokenData = (await tokenResponse.json()) as TokenResponse;

              // Save credentials with role and scopes
              saveCredentials({
                apiKey: tokenData.access_token,
                storeId: tokenData.store.id,
                storeName: tokenData.store.name,
                role: tokenData.role,
                scopes: tokenData.scopes,
                createdAt: new Date().toISOString(),
              });

              // Set up client
              client.setApiKey(tokenData.access_token);
              client.setDefaultStoreId(tokenData.store.id);

              console.error(`[BareMCP] Successfully authorized as ${tokenData.role}!`);

              return formatSuccess({
                connected: true,
                store: {
                  id: tokenData.store.id,
                  name: tokenData.store.name,
                  domain: tokenData.store.domain,
                  currency: tokenData.store.currency,
                },
                role: tokenData.role,
                message: `Connected to "${tokenData.store.name}" as ${tokenData.role}. Credentials saved to ~/.baremcp/credentials.json`,
              });
            }

            // Check error type
            const errorData = (await tokenResponse.json()) as TokenErrorResponse;

            if (errorData.error === "authorization_pending") {
              // Still waiting, continue polling
              if (attempts % 6 === 0) {
                console.error(`[BareMCP] Still waiting for authorization... (${Math.floor(attempts * interval / 1000)}s)`);
              }
              continue;
            }

            if (errorData.error === "slow_down") {
              // Increase interval and continue
              await new Promise((resolve) => setTimeout(resolve, 5000));
              continue;
            }

            if (errorData.error === "access_denied") {
              return formatError(new Error("Authorization denied. Please try again."));
            }

            if (errorData.error === "expired_token") {
              return formatError(new Error("Authorization code expired. Please try again."));
            }

            // Unknown error
            return formatError(new Error(errorData.error_description || "Authorization failed"));
          }

          return formatError(new Error("Authorization timed out. Please try again."));
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // disconnect
    // =========================================================================
    {
      name: "disconnect",
      description: "Disconnect from the current store and clear saved credentials.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async () => {
        const wasConnected = client.isAuthenticated();
        client.clearAuth();
        clearCredentials();

        return formatSuccess({
          disconnected: true,
          message: wasConnected
            ? "Disconnected and cleared saved credentials. Use 'connect' to authenticate again."
            : "No active connection to disconnect.",
        });
      },
    },

    // =========================================================================
    // status
    // =========================================================================
    {
      name: "status",
      description: "Check the current connection status, store, and your role/permissions.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async () => {
        const isConnected = client.isAuthenticated();
        const defaultStoreId = client.getDefaultStoreId();
        const storedCreds = loadCredentials();

        if (!isConnected) {
          return formatSuccess({
            connected: false,
            message: "Not connected. Use 'connect' to authenticate via browser.",
            hint: "The connect tool will open your browser for secure login — no API key needed in chat!",
          });
        }

        // Fetch current store info
        if (defaultStoreId) {
          try {
            const response = await client.get<{ item: Store }>(`/stores/${defaultStoreId}`);

            return formatSuccess({
              connected: true,
              store: {
                id: response.item.id,
                name: response.item.name,
                domain: response.item.domain,
                currency: response.item.currency,
                status: response.item.status,
              },
              role: storedCreds?.role || null,
              credentials: storedCreds
                ? { savedAt: storedCreds.createdAt, location: CREDENTIALS_FILE }
                : null,
            });
          } catch {
            return formatSuccess({
              connected: true,
              defaultStoreId,
              role: storedCreds?.role || null,
              message: "Connected, but could not fetch store details. Token may be expired — try 'disconnect' then 'connect'.",
            });
          }
        }

        return formatSuccess({
          connected: true,
          defaultStoreId: null,
          role: storedCreds?.role || null,
          message: "Connected, but no default store set.",
        });
      },
    },

    // =========================================================================
    // diagnostics
    // =========================================================================
    {
      name: "diagnostics",
      description:
        "Get diagnostic information about the BareMCP server for troubleshooting. " +
        "Returns version, configuration, API connectivity status, and environment info.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async () => {
        const startTime = Date.now();
        const apiUrl = client.getBaseUrl();
        let apiReachable = false;
        let apiLatencyMs: number | null = null;
        let apiError: string | null = null;

        // Test API connectivity
        try {
          const pingStart = Date.now();
          const response = await fetch(`${apiUrl}/health`, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
          });
          apiLatencyMs = Date.now() - pingStart;
          apiReachable = response.ok;
        } catch (error) {
          apiError = error instanceof Error ? error.message : "Unknown error";
        }

        // Check credentials file
        const credsExist = existsSync(CREDENTIALS_FILE);
        const storedCreds = loadCredentials();

        return formatSuccess({
          version: "1.0.0",
          runtime: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            bunVersion: process.versions.bun || null,
          },
          configuration: {
            apiUrl,
            defaultStoreId: client.getDefaultStoreId() || null,
            authenticated: client.isAuthenticated(),
            credentialsFile: CREDENTIALS_FILE,
            credentialsExist: credsExist,
            credentialsValid: storedCreds !== null,
          },
          connectivity: {
            apiReachable,
            apiLatencyMs,
            apiError,
          },
          session: storedCreds
            ? {
                role: storedCreds.role,
                scopes: storedCreds.scopes,
                createdAt: storedCreds.createdAt,
              }
            : null,
          diagnosticsTimeMs: Date.now() - startTime,
        });
      },
    },
  ];
}
