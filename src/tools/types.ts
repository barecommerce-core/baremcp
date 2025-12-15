/**
 * BareMCP — Tool Types
 *
 * Type definitions for MCP tools.
 */

import type { McpErrorResponse, McpSuccessResponse } from "../client/index.js";

/**
 * JSON Schema type for tool input
 */
export interface JsonSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
  format?: string;
  items?: JsonSchemaProperty;
}

/**
 * Tool handler response type
 */
export type ToolResponse = McpSuccessResponse | McpErrorResponse;

/**
 * Tool handler function
 */
export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResponse>;

/**
 * Tool definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  handler: ToolHandler;
}

/**
 * Tool category for organization
 */
export type ToolCategory =
  | "store"
  | "products"
  | "orders"
  | "customers"
  | "categories"
  | "pages"
  | "media"
  | "webhooks"
  | "audit";
