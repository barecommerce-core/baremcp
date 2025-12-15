/**
 * BareMCP — Order Tools
 *
 * Tools for managing orders:
 * - list_orders
 * - get_order
 * - update_order_notes
 * - record_refund
 * - export_orders
 */

import { z } from "zod";
import type { HttpClient } from "../client/index.js";
import {
  formatError,
  formatSuccess,
  StoreIdRequiredError,
  storeApiPath,
} from "../client/index.js";
import type { Order, ListResponse, SingleResponse } from "../client/index.js";
import type { ToolDefinition } from "./types.js";

// =============================================================================
// Validation Schemas
// =============================================================================

const orderStatusFilter = z.enum(["pending", "paid", "fulfilled", "cancelled"]);
const paymentStatusFilter = z.enum([
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
  "cancelled",
]);

const listOrdersSchema = z.object({
  storeId: z.string().uuid().optional(),
  status: orderStatusFilter.optional(),
  paymentStatus: paymentStatusFilter.optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(), // ISO date
  dateTo: z.string().optional(), // ISO date
  sortBy: z
    .enum(["orderNumber", "total", "placedAt", "createdAt", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

const getOrderSchema = z.object({
  storeId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  orderNumber: z.string().optional(),
});

const updateOrderNotesSchema = z.object({
  storeId: z.string().uuid().optional(),
  orderId: z.string().uuid(),
  merchantNote: z.string().max(1000),
});

const recordRefundSchema = z.object({
  storeId: z.string().uuid().optional(),
  orderId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().max(500).optional(),
});

const exportOrdersSchema = z.object({
  storeId: z.string().uuid().optional(),
  status: orderStatusFilter.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  format: z.enum(["csv", "json"]).default("csv"),
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
 * Format order for summary view
 */
function formatOrderSummary(order: Order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    customerId: order.customerId,
    currency: order.currency,
    subtotal: order.subtotal,
    tax: order.tax,
    shipping: order.shipping,
    discount: order.discount,
    total: order.total,
    itemCount: order.items?.length || 0,
    placedAt: order.placedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/**
 * Format full order for response
 */
function formatOrderFull(order: Order) {
  return {
    id: order.id,
    storeId: order.storeId,
    customerId: order.customerId,
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    subtotal: order.subtotal,
    tax: order.tax,
    taxRate: order.taxRate,
    shipping: order.shipping,
    discount: order.discount,
    discountCode: order.discountCode,
    total: order.total,
    paymentProvider: order.paymentProvider,
    paymentId: order.paymentId,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    customerNote: order.customerNote,
    merchantNote: order.merchantNote,
    items: order.items?.map((item) => ({
      id: item.id,
      productId: item.productId,
      title: item.titleSnapshot,
      sku: item.skuSnapshot,
      variantTitle: item.variantTitle,
      attributes: item.attributesSnapshot,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineDiscount: item.lineDiscount,
    })),
    placedAt: order.placedAt,
    paidAt: order.paidAt,
    fulfilledAt: order.fulfilledAt,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * Create all order management tools
 */
export function createOrderTools(client: HttpClient): ToolDefinition[] {
  return [
    // =========================================================================
    // list_orders
    // =========================================================================
    {
      name: "list_orders",
      description:
        "List orders in your store with filters for status, payment status, customer, date range, and search.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          status: {
            type: "string",
            enum: ["pending", "paid", "fulfilled", "cancelled"],
            description: "Filter by order status",
          },
          paymentStatus: {
            type: "string",
            enum: [
              "pending",
              "processing",
              "succeeded",
              "failed",
              "refunded",
              "partially_refunded",
              "cancelled",
            ],
            description: "Filter by payment status",
          },
          customerId: {
            type: "string",
            description: "Filter by customer UUID",
          },
          search: {
            type: "string",
            description: "Search in order number, customer email, or notes",
          },
          dateFrom: {
            type: "string",
            description: "Filter orders placed after this date (ISO format)",
          },
          dateTo: {
            type: "string",
            description: "Filter orders placed before this date (ISO format)",
          },
          sortBy: {
            type: "string",
            enum: ["orderNumber", "total", "placedAt", "createdAt", "updatedAt"],
            default: "createdAt",
            description: "Sort field",
          },
          sortOrder: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
            description: "Sort direction",
          },
          limit: {
            type: "integer",
            default: 50,
            minimum: 1,
            maximum: 200,
            description: "Number of orders to return",
          },
          offset: {
            type: "integer",
            default: 0,
            minimum: 0,
            description: "Number of orders to skip",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = listOrdersSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const params: Record<string, unknown> = {
            limit: input.limit,
            offset: input.offset,
            sortBy: input.sortBy,
            sortOrder: input.sortOrder,
          };

          if (input.status) params.status = input.status;
          if (input.paymentStatus) params.paymentStatus = input.paymentStatus;
          if (input.customerId) params.customerId = input.customerId;
          if (input.search) params.search = input.search;
          if (input.dateFrom) params.dateFrom = input.dateFrom;
          if (input.dateTo) params.dateTo = input.dateTo;

          const response = await client.get<ListResponse<Order>>(
            storeApiPath(storeId, "orders"),
            params
          );

          return formatSuccess({
            items: response.items.map(formatOrderSummary),
            total: response.pagination.total,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // get_order
    // =========================================================================
    {
      name: "get_order",
      description:
        "Get detailed information about a specific order including items, addresses, and payment details.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          orderId: {
            type: "string",
            description: "Order UUID",
          },
          orderNumber: {
            type: "string",
            description: "Order number (alternative to orderId, e.g., 'ORD-000123')",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = getOrderSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          if (!input.orderId && !input.orderNumber) {
            return formatError(
              new Error("Either orderId or orderNumber must be provided")
            );
          }

          let order: Order;

          if (input.orderId) {
            const response = await client.get<SingleResponse<Order>>(
              storeApiPath(storeId, `orders/${input.orderId}`)
            );
            order = response.item;
          } else {
            // Find by order number
            const response = await client.get<ListResponse<Order>>(
              storeApiPath(storeId, "orders"),
              { search: input.orderNumber, limit: 1 }
            );
            if (response.items.length === 0) {
              return formatError(
                new Error(`Order with number "${input.orderNumber}" not found`)
              );
            }
            order = response.items[0]!;
          }

          return formatSuccess(formatOrderFull(order));
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // update_order_notes
    // =========================================================================
    {
      name: "update_order_notes",
      description:
        "Add or update merchant notes on an order. These notes are only visible to the merchant, not the customer.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          orderId: {
            type: "string",
            description: "Order UUID (required)",
          },
          merchantNote: {
            type: "string",
            description: "Note text to add or update (max 1000 chars)",
            maxLength: 1000,
          },
        },
        required: ["orderId", "merchantNote"],
      },
      handler: async (args) => {
        try {
          const input = updateOrderNotesSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          // Per contract-objectives.md Section 1.2: No endpoint uses PUT
          // Use PATCH for partial updates
          const response = await client.patch<SingleResponse<Order>>(
            storeApiPath(storeId, `orders/${input.orderId}`),
            { merchantNote: input.merchantNote }
          );

          return formatSuccess({
            message: "Order note updated successfully",
            order: {
              id: response.item.id,
              orderNumber: response.item.orderNumber,
              merchantNote: response.item.merchantNote,
              updatedAt: response.item.updatedAt,
            },
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // record_refund
    // =========================================================================
    {
      name: "record_refund",
      description:
        "Record a refund for an order. This updates the payment status and records the refund amount.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          orderId: {
            type: "string",
            description: "Order UUID (required)",
          },
          amount: {
            type: "number",
            description: "Refund amount (must be positive)",
            minimum: 0.01,
          },
          reason: {
            type: "string",
            description: "Reason for the refund",
            maxLength: 500,
          },
        },
        required: ["orderId", "amount"],
      },
      handler: async (args) => {
        try {
          const input = recordRefundSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const response = await client.post<{
            success: boolean;
            order: Order;
            refundedAmount: string;
          }>(storeApiPath(storeId, `orders/${input.orderId}/refund`), {
            amount: input.amount,
            reason: input.reason,
          });

          return formatSuccess({
            message: "Refund recorded successfully",
            orderId: response.order.id,
            orderNumber: response.order.orderNumber,
            refundedAmount: response.refundedAmount,
            paymentStatus: response.order.paymentStatus,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // export_orders
    // =========================================================================
    {
      name: "export_orders",
      description:
        "Export orders to CSV or JSON format with optional filters. Returns download URL or data.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          status: {
            type: "string",
            enum: ["pending", "paid", "fulfilled", "cancelled"],
            description: "Filter by order status",
          },
          dateFrom: {
            type: "string",
            description: "Export orders placed after this date (ISO format)",
          },
          dateTo: {
            type: "string",
            description: "Export orders placed before this date (ISO format)",
          },
          format: {
            type: "string",
            enum: ["csv", "json"],
            default: "csv",
            description: "Export format",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = exportOrdersSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const params: Record<string, unknown> = {
            format: input.format,
          };

          if (input.status) params.status = input.status;
          if (input.dateFrom) params.dateFrom = input.dateFrom;
          if (input.dateTo) params.dateTo = input.dateTo;

          const response = await client.post<{
            downloadUrl?: string;
            data?: unknown;
            count: number;
          }>(storeApiPath(storeId, "orders/export"), params);

          return formatSuccess({
            message: `Exported ${response.count} orders`,
            format: input.format,
            count: response.count,
            downloadUrl: response.downloadUrl,
            data: response.data,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },
  ];
}
