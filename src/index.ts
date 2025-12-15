#!/usr/bin/env bun
/**
 * BareMCP — MCP Server for BareCommerceCore
 *
 * Entry point for the Model Context Protocol server.
 * Enables LLM-powered management of BareCommerceCore stores.
 *
 * Multi-tenant hosted mode: Users authenticate at runtime using the 'connect' tool.
 *
 * @see https://github.com/barecommerce-core/baremcp
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createHttpClient, ConfigError } from "./client/index.js";
import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

// =============================================================================
// Configuration
// =============================================================================

const VERSION = "1.0.0";
const NAME = "baremcp";

// Default API URL for BareCommerceCore cloud
const DEFAULT_API_URL = "https://api.barecommercecore.com";

interface Config {
  apiUrl: string;
  apiKey?: string; // Optional — users can authenticate at runtime
  defaultStoreId?: string;
}

// =============================================================================
// CLI Argument Handling
// =============================================================================

if (process.argv.includes("--version") || process.argv.includes("-v")) {
  console.log(VERSION);
  process.exit(0);
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
BareMCP v${VERSION}

MCP server for BareCommerceCore e-commerce management.

Usage: baremcp [options]

Options:
  -v, --version    Print version
  -h, --help       Show this help

Environment Variables:
  BARECOMMERCE_API_URL           API endpoint (default: ${DEFAULT_API_URL})
  BARECOMMERCE_API_KEY           Pre-configured API key (optional)
  BARECOMMERCE_DEFAULT_STORE_ID  Default store UUID (optional)

Authentication:
  If no API key is configured, use the 'connect' tool to authenticate
  via browser-based OAuth Device Flow.

Documentation: https://github.com/AltEnding/baremcp
`);
  process.exit(0);
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate API key format
 * Store API keys: sk_test_* or sk_live_* (minimum 32 chars after prefix)
 */
function isValidApiKeyFormat(key: string): boolean {
  // Must start with sk_test_ or sk_live_
  if (!key.startsWith("sk_test_") && !key.startsWith("sk_live_")) {
    return false;
  }
  // Total length should be reasonable (prefix + at least 24 chars for the key portion)
  if (key.length < 32) {
    return false;
  }
  // Only alphanumeric and underscore allowed
  if (!/^sk_(test|live)_[a-zA-Z0-9_]+$/.test(key)) {
    return false;
  }
  return true;
}

/**
 * Load configuration from environment variables
 * All values are optional - defaults to BareCommerceCore cloud
 */
function loadConfig(): Config {
  const apiUrl = process.env.BARECOMMERCE_API_URL || DEFAULT_API_URL;
  const apiKey = process.env.BARECOMMERCE_API_KEY; // Optional
  const defaultStoreId = process.env.BARECOMMERCE_DEFAULT_STORE_ID;

  // If API key is provided, strictly validate format
  if (apiKey) {
    if (!isValidApiKeyFormat(apiKey)) {
      throw new ConfigError(
        "Invalid BARECOMMERCE_API_KEY format. " +
          "Store API keys must match pattern: sk_test_* or sk_live_* (at least 32 characters total). " +
          "Alternatively, omit the API key and use the 'connect' tool to authenticate via browser."
      );
    }
  }

  return {
    apiUrl,
    apiKey,
    defaultStoreId,
  };
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.error(`[BareMCP] Starting ${NAME} v${VERSION}`);

  // Load configuration
  let config: Config;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`[BareMCP] Configuration Error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  console.error(`[BareMCP] API endpoint: ${config.apiUrl}`);

  if (config.apiKey) {
    console.error(`[BareMCP] Pre-authenticated with API key`);
    if (config.defaultStoreId) {
      console.error(`[BareMCP] Default store: ${config.defaultStoreId}`);
    }
  } else {
    console.error(
      `[BareMCP] Hosted mode — users must authenticate with 'connect' tool`
    );
  }

  // Create HTTP client
  const client = createHttpClient({
    baseUrl: config.apiUrl,
    apiKey: config.apiKey,
    defaultStoreId: config.defaultStoreId,
  });

  // Create MCP server with full metadata
  const server = new Server(
    {
      name: NAME,
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // Log server info for debugging
  console.error(`[BareMCP] Server: ${NAME} v${VERSION}`);

  // Register capabilities
  registerTools(server, client);
  registerResources(server, client);
  registerPrompts(server);

  // Connect via stdio transport
  const transport = new StdioServerTransport();

  console.error("[BareMCP] Connecting to transport...");

  await server.connect(transport);

  console.error("[BareMCP] Server running. Waiting for requests...");

  // Handle shutdown
  process.on("SIGINT", async () => {
    console.error("[BareMCP] Shutting down...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("[BareMCP] Shutting down...");
    await server.close();
    process.exit(0);
  });
}

// Run
main().catch((error) => {
  console.error("[BareMCP] Fatal error:", error);
  process.exit(1);
});
