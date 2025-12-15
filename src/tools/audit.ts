/**
 * BareMCP — Audit Tools
 *
 * Tools for viewing audit logs:
 * - list_audit_logs
 * - get_audit_log
 */

import { z } from "zod";
import type { HttpClient } from "../client/index.js";
import {
  formatError,
  formatSuccess,
  StoreIdRequiredError,
  storeApiPath,
} from "../client/index.js";
import type { AuditLog, ListResponse, SingleResponse } from "../client/index.js";
import type { ToolDefinition } from "./types.js";

// =============================================================================
// Validation Schemas
// =============================================================================

const auditActorType = z.enum(["merchant", "api_key", "system", "webhook"]);
const auditAction = z.enum(["create", "update", "delete", "export"]);
const auditResourceType = z.enum([
  "product",
  "page",
  "category",
  "customer",
  "order",
  "media",
  "webhook",
  "api_key",
  "store",
  "merchant",
  "payment_settings",
]);

const listAuditLogsSchema = z.object({
  storeId: z.string().uuid().optional(),
  actorType: auditActorType.optional(),
  action: auditAction.optional(),
  resourceType: auditResourceType.optional(),
  resourceId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

const getAuditLogSchema = z.object({
  storeId: z.string().uuid().optional(),
  logId: z.string().uuid(),
});

// =============================================================================
// Helper Functions
// =============================================================================

function resolveStoreId(
  providedStoreId: string | undefined,
  client: HttpClient
): string {
  const storeId = providedStoreId || client.getDefaultStoreId();
  if (!storeId) {
    throw new StoreIdRequiredError();
  }
  return storeId;
}

/**
 * Format audit log for summary view
 */
function formatAuditLogSummary(log: AuditLog) {
  return {
    id: log.id,
    actorId: log.actorId,
    actorType: log.actorType,
    action: log.action,
    resourceId: log.resourceId,
    resourceType: log.resourceType,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt,
  };
}

/**
 * Format full audit log for response
 */
function formatAuditLogFull(log: AuditLog) {
  return {
    id: log.id,
    storeId: log.storeId,
    actorId: log.actorId,
    actorType: log.actorType,
    action: log.action,
    resourceId: log.resourceId,
    resourceType: log.resourceType,
    diff: log.diff,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt,
  };
}

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * Create all audit log tools
 */
export function createAuditTools(client: HttpClient): ToolDefinition[] {
  return [
    // =========================================================================
    // list_audit_logs
    // =========================================================================
    {
      name: "list_audit_logs",
      description:
        "List audit logs showing changes made to store data. Filter by actor, action, resource type, or date range.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          actorType: {
            type: "string",
            enum: ["merchant", "api_key", "system", "webhook"],
            description: "Filter by type of actor who made the change",
          },
          action: {
            type: "string",
            enum: ["create", "update", "delete", "export"],
            description: "Filter by action type",
          },
          resourceType: {
            type: "string",
            enum: [
              "product",
              "page",
              "category",
              "customer",
              "order",
              "media",
              "webhook",
              "api_key",
              "store",
              "merchant",
              "payment_settings",
            ],
            description: "Filter by type of resource changed",
          },
          resourceId: {
            type: "string",
            description: "Filter by specific resource UUID",
          },
          actorId: {
            type: "string",
            description: "Filter by specific actor UUID",
          },
          dateFrom: {
            type: "string",
            description: "Show logs after this date (ISO format)",
          },
          dateTo: {
            type: "string",
            description: "Show logs before this date (ISO format)",
          },
          sortOrder: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
            description: "Sort direction (newest first by default)",
          },
          limit: {
            type: "integer",
            default: 50,
            minimum: 1,
            maximum: 200,
            description: "Number of logs to return",
          },
          offset: {
            type: "integer",
            default: 0,
            minimum: 0,
            description: "Number of logs to skip",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = listAuditLogsSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const params: Record<string, unknown> = {
            limit: input.limit,
            offset: input.offset,
            sortOrder: input.sortOrder,
          };

          if (input.actorType) params.actorType = input.actorType;
          if (input.action) params.action = input.action;
          if (input.resourceType) params.resourceType = input.resourceType;
          if (input.resourceId) params.resourceId = input.resourceId;
          if (input.actorId) params.actorId = input.actorId;
          if (input.dateFrom) params.dateFrom = input.dateFrom;
          if (input.dateTo) params.dateTo = input.dateTo;

          const response = await client.get<ListResponse<AuditLog>>(
            storeApiPath(storeId, "audit-logs"),
            params
          );

          return formatSuccess({
            items: response.items.map(formatAuditLogSummary),
            total: response.pagination.total,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // get_audit_log
    // =========================================================================
    {
      name: "get_audit_log",
      description:
        "Get detailed information about a specific audit log entry including the before/after diff.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          logId: {
            type: "string",
            description: "Audit log UUID",
          },
        },
        required: ["logId"],
      },
      handler: async (args) => {
        try {
          const input = getAuditLogSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const response = await client.get<SingleResponse<AuditLog>>(
            storeApiPath(storeId, `audit-logs/${input.logId}`)
          );

          return formatSuccess(formatAuditLogFull(response.item));
        } catch (error) {
          return formatError(error);
        }
      },
    },
  ];
}
