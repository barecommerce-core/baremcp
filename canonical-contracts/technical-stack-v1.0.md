# BareMCP — Technical Stack v1.0

**Status:** Authoritative Reference  
**Purpose:** Defines technologies, architecture, and implementation details

---

# 1. Technology Stack

## 1.1 Core Runtime

| Component | Technology | Version | Justification |
|-----------|------------|---------|---------------|
| Runtime | Bun | 1.x | Fast, built-in TS, bundler, test runner |
| Language | TypeScript | 5.x | Type safety, better DX |
| Package Manager | bun | built-in | Faster than npm/yarn |

## 1.2 MCP Framework

| Component | Package | Version | Purpose |
|-----------|---------|---------|---------|
| MCP SDK | @modelcontextprotocol/sdk | latest | Core MCP implementation |
| Transport | stdio | built-in | Standard MCP transport |

## 1.3 HTTP Client

| Component | Technology | Purpose |
|-----------|------------|---------|
| HTTP | fetch (built-in) | API calls to BareCommerceCore |
| Form Data | Bun's FormData | Media uploads |

## 1.4 Validation

| Component | Package | Version | Purpose |
|-----------|---------|---------|---------|
| Schema Validation | zod | ^3.x | Input validation |

## 1.5 Development

| Component | Technology | Purpose |
|-----------|------------|---------|
| Build | bun build | Built-in bundling |
| Testing | bun test | Built-in test runner (Jest-compatible) |
| Linting | eslint | Code quality |
| Formatting | prettier | Code formatting |

---

# 2. Project Structure

```
baremcp/
├── src/
│   ├── index.ts                 # Entry point, MCP server setup
│   ├── client/
│   │   ├── http.ts              # HTTP client with auth
│   │   ├── errors.ts            # Error handling
│   │   └── types.ts             # API response types
│   ├── tools/
│   │   ├── index.ts             # Tool registry
│   │   ├── store.ts             # Store management tools
│   │   ├── products.ts          # Product tools
│   │   ├── orders.ts            # Order tools
│   │   ├── customers.ts         # Customer tools
│   │   ├── categories.ts        # Category tools
│   │   ├── pages.ts             # Page tools
│   │   ├── media.ts             # Media tools
│   │   ├── webhooks.ts          # Webhook tools
│   │   └── audit.ts             # Audit log tools
│   ├── resources/
│   │   └── index.ts             # MCP resources
│   ├── prompts/
│   │   └── index.ts             # MCP prompts
│   └── utils/
│       ├── validation.ts        # Zod schemas
│       └── formatting.ts        # Response formatting
├── tests/
│   ├── tools/
│   │   ├── products.test.ts
│   │   ├── orders.test.ts
│   │   └── ...
│   ├── client/
│   │   └── http.test.ts
│   └── mocks/
│       └── api.ts               # API response mocks
├── package.json
├── tsconfig.json
├── bunfig.toml                  # Bun configuration
├── .eslintrc.json
├── .prettierrc
├── README.md
├── LICENSE
└── canonical-contracts/
    ├── project-specification-v1.0.md
    ├── mcp-tools-contract-v1.0.md
    ├── technical-stack-v1.0.md
    └── prompts-resources-contract-v1.0.md
```

---

# 3. Architecture

## 3.1 Entry Point

```typescript
// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";
import { createHttpClient } from "./client/http.js";

async function main() {
  // Validate required environment variables
  const apiUrl = process.env.BARECOMMERCE_API_URL;
  const apiKey = process.env.BARECOMMERCE_API_KEY;

  if (!apiUrl) {
    console.error("Error: BARECOMMERCE_API_URL is required");
    process.exit(1);
  }
  if (!apiKey) {
    console.error("Error: BARECOMMERCE_API_KEY is required");
    process.exit(1);
  }

  const server = new Server(
    { name: "baremcp", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  );

  const client = createHttpClient({
    baseUrl: apiUrl,
    apiKey: apiKey,
    defaultStoreId: process.env.BARECOMMERCE_DEFAULT_STORE_ID,
  });

  registerTools(server, client);
  registerResources(server, client);
  registerPrompts(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

## 3.2 HTTP Client

```typescript
// src/client/http.ts
import { ApiError } from "./errors.js";

interface HttpClientConfig {
  baseUrl: string;
  apiKey: string;
  defaultStoreId?: string;
}

interface HttpClient {
  get<T>(path: string, params?: Record<string, any>): Promise<T>;
  post<T>(path: string, body?: any): Promise<T>;
  put<T>(path: string, body?: any): Promise<T>;
  delete<T>(path: string): Promise<T>;
  upload<T>(path: string, formData: FormData): Promise<T>;
  getDefaultStoreId(): string | undefined;
  setDefaultStoreId(storeId: string): void;
}

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const { baseUrl, apiKey } = config;
  let defaultStoreId = config.defaultStoreId;

  const headers = {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
  };

  async function request<T>(
    method: string,
    path: string,
    options?: { body?: any; params?: Record<string, any> }
  ): Promise<T> {
    const url = new URL(path, baseUrl);
    
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: { code: "UNKNOWN", message: response.statusText } 
      }));
      throw new ApiError(
        error.error?.code || "UNKNOWN",
        error.error?.message || response.statusText,
        error.error?.details
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true } as T;
    }

    return response.json();
  }

  return {
    get: <T>(path: string, params?: Record<string, any>) => 
      request<T>("GET", path, { params }),
    post: <T>(path: string, body?: any) => 
      request<T>("POST", path, { body }),
    put: <T>(path: string, body?: any) => 
      request<T>("PUT", path, { body }),
    delete: <T>(path: string) => 
      request<T>("DELETE", path),
    upload: async <T>(path: string, formData: FormData) => {
      const url = new URL(path, baseUrl);
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "X-API-Key": apiKey },
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: { code: "UPLOAD_FAILED", message: response.statusText }
        }));
        throw new ApiError(
          error.error?.code || "UPLOAD_FAILED",
          error.error?.message || "Upload failed"
        );
      }
      return response.json();
    },
    getDefaultStoreId: () => defaultStoreId,
    setDefaultStoreId: (id: string) => { defaultStoreId = id; },
  };
}
```

## 3.3 Tool Registration Pattern

```typescript
// src/tools/products.ts
import { z } from "zod";
import type { HttpClient } from "../client/http.js";
import type { ToolDefinition } from "./types.js";
import { formatError } from "../client/errors.js";

const listProductsSchema = z.object({
  storeId: z.string().uuid().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

export function createProductTools(client: HttpClient): ToolDefinition[] {
  return [
    {
      name: "list_products",
      description: "List products in your store with optional filters",
      inputSchema: {
        type: "object",
        properties: {
          storeId: { type: "string", description: "Store UUID" },
          status: { type: "string", enum: ["draft", "published", "archived"] },
          search: { type: "string", description: "Search query" },
          limit: { type: "integer", default: 50 },
          offset: { type: "integer", default: 0 },
        },
      },
      handler: async (args: unknown) => {
        try {
          const input = listProductsSchema.parse(args);
          const storeId = input.storeId || client.getDefaultStoreId();
          
          if (!storeId) {
            return formatError(new Error(
              "storeId is required. Use list_stores first or set BARECOMMERCE_DEFAULT_STORE_ID."
            ));
          }

          const response = await client.get(`/api/stores/${storeId}/products`, {
            status: input.status,
            search: input.search,
            limit: input.limit,
            offset: input.offset,
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({ success: true, data: response }, null, 2),
            }],
          };
        } catch (error) {
          return formatError(error);
        }
      },
    },
    // ... more tools
  ];
}
```

## 3.4 Error Handling

```typescript
// src/client/errors.ts
import { z } from "zod";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function formatError(error: unknown): {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
} {
  if (error instanceof ApiError) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify({
          code: error.code,
          message: error.message,
          details: error.details,
        }),
      }],
    };
  }

  if (error instanceof z.ZodError) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify({
          code: "INVALID_INPUT",
          message: "Validation failed",
          details: error.errors,
        }),
      }],
    };
  }

  return {
    isError: true,
    content: [{
      type: "text",
      text: JSON.stringify({
        code: "UNKNOWN_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    }],
  };
}
```

---

# 4. Configuration

## 4.1 package.json

```json
{
  "name": "baremcp",
  "version": "1.0.0",
  "description": "MCP server for BareCommerceCore store management",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "baremcp": "dist/index.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --target node",
    "dev": "bun --watch src/index.ts",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "lint": "eslint src",
    "format": "prettier --write src",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "bun run build"
  },
  "keywords": [
    "mcp",
    "model-context-protocol",
    "barecommercecore",
    "ecommerce",
    "ai",
    "bun"
  ],
  "author": "BareCommerceCore Team",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.4.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "prettier": "^3.2.0"
  }
}
```

## 4.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## 4.3 bunfig.toml

```toml
[install]
# Use exact versions for reproducibility
exact = true

[test]
# Test configuration
coverage = true
coverageDir = "coverage"

[build]
# Build configuration
target = "node"
minify = false
sourcemap = "external"
```

---

# 5. Testing Strategy

## 5.1 Unit Tests

Test individual tools with mocked HTTP client using Bun's built-in test runner:

```typescript
// tests/tools/products.test.ts
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createProductTools } from "../../src/tools/products.js";

describe("list_products", () => {
  const mockClient = {
    get: mock(() => Promise.resolve({ items: [], total: 0 })),
    getDefaultStoreId: mock(() => "store-123"),
  };

  beforeEach(() => {
    mockClient.get.mockClear();
    mockClient.getDefaultStoreId.mockClear();
  });

  it("should list products with default parameters", async () => {
    mockClient.get.mockResolvedValue({
      items: [{ id: "1", title: "Test Product" }],
      total: 1,
    });

    const tools = createProductTools(mockClient as any);
    const listProducts = tools.find(t => t.name === "list_products")!;
    
    const result = await listProducts.handler({});

    expect(mockClient.get).toHaveBeenCalledWith(
      "/api/stores/store-123/products",
      expect.objectContaining({ limit: 50, offset: 0 })
    );
    expect(result.content[0].text).toContain("Test Product");
  });

  it("should require storeId when no default is set", async () => {
    mockClient.getDefaultStoreId.mockReturnValue(undefined);

    const tools = createProductTools(mockClient as any);
    const listProducts = tools.find(t => t.name === "list_products")!;

    const result = await listProducts.handler({});
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("storeId is required");
  });
});
```

## 5.2 Integration Tests

Test against a local BareCommerceCore instance:

```typescript
// tests/integration/products.test.ts
import { describe, it, expect, beforeAll } from "bun:test";
import { createHttpClient } from "../../src/client/http.js";

describe("Products Integration", () => {
  const client = createHttpClient({
    baseUrl: process.env.TEST_API_URL || "http://localhost:3000",
    apiKey: process.env.TEST_API_KEY!,
    defaultStoreId: process.env.TEST_STORE_ID!,
  });

  it("should list products", async () => {
    const response = await client.get(
      `/api/stores/${process.env.TEST_STORE_ID}/products`
    );
    expect(response).toHaveProperty("items");
    expect(response).toHaveProperty("total");
  });
});
```

## 5.3 Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/tools/products.test.ts

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch
```

---

# 6. Distribution

## 6.1 NPM Publishing

```bash
# Login to npm
npm login

# Build and publish
bun run build
npm publish
```

## 6.2 Usage in MCP Clients

### Claude Desktop (claude_desktop_config.json)

```json
{
  "mcpServers": {
    "barecommercecore": {
      "command": "npx",
      "args": ["-y", "baremcp"],
      "env": {
        "BARECOMMERCE_API_URL": "https://your-instance.com",
        "BARECOMMERCE_API_KEY": "sk_live_xxxxx"
      }
    }
  }
}
```

### Using Bun Directly

```json
{
  "mcpServers": {
    "barecommercecore": {
      "command": "bunx",
      "args": ["baremcp"],
      "env": {
        "BARECOMMERCE_API_URL": "https://your-instance.com",
        "BARECOMMERCE_API_KEY": "sk_live_xxxxx"
      }
    }
  }
}
```

### Local Development

```json
{
  "mcpServers": {
    "barecommercecore": {
      "command": "bun",
      "args": ["run", "C:/path/to/baremcp/src/index.ts"],
      "env": {
        "BARECOMMERCE_API_URL": "http://localhost:3000",
        "BARECOMMERCE_API_KEY": "sk_test_xxxxx"
      }
    }
  }
}
```

---

# 7. Why Bun?

| Feature | Bun | Node.js |
|---------|-----|---------|
| TypeScript | Native, no build step for dev | Requires compilation |
| Bundler | Built-in | Requires tsup/esbuild/webpack |
| Test Runner | Built-in (Jest-compatible) | Requires vitest/jest |
| Package Install | ~10x faster | Standard |
| Startup Time | ~4x faster | Standard |
| fetch API | Built-in | Built-in (Node 18+) |

---

# 8. Document Control

**Version:** 1.0  
**Updated:** 2025  
**Changes:** 
- Switched from Node.js to Bun runtime
- Updated all tooling to use Bun's built-in features
- Simplified dependencies (no tsup, vitest needed)

**Dependencies:**
- Bun 1.x
- MCP SDK
- BareCommerceCore API v1.7
