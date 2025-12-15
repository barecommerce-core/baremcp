/**
 * BareMCP — Customer Tools
 *
 * Tools for managing customers:
 * - list_customers
 * - get_customer
 * - create_customer
 * - update_customer
 * - delete_customer
 */

import { z } from "zod";
import type { HttpClient } from "../client/index.js";
import {
  formatError,
  formatSuccess,
  StoreIdRequiredError,
  storeApiPath,
} from "../client/index.js";
import type { Customer, Address, ListResponse, SingleResponse } from "../client/index.js";
import type { ToolDefinition } from "./types.js";

// =============================================================================
// Validation Schemas
// =============================================================================

const listCustomersSchema = z.object({
  storeId: z.string().uuid().optional(),
  search: z.string().optional(),
  marketingOptIn: z.boolean().optional(),
  hasOrders: z.boolean().optional(),
  sortBy: z
    .enum(["name", "email", "createdAt", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

const getCustomerSchema = z.object({
  storeId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  email: z.string().email().optional(),
});

const addressSchema = z.object({
  address1: z.string().min(1).max(255),
  address2: z.string().max(255).optional().nullable(),
  city: z.string().min(1).max(100),
  region: z.string().max(100).optional().nullable(),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2),
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  company: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  isDefault: z.boolean().optional(),
});

const createCustomerSchema = z.object({
  storeId: z.string().uuid().optional(),
  email: z.string().email().max(255),
  name: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  marketingOptIn: z.boolean().default(false),
  addresses: z.array(addressSchema).optional(),
});

const updateCustomerSchema = z.object({
  storeId: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  email: z.string().email().max(255).optional(),
  name: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  marketingOptIn: z.boolean().optional(),
});

const deleteCustomerSchema = z.object({
  storeId: z.string().uuid().optional(),
  customerId: z.string().uuid(),
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
 * Format customer for summary view
 */
function formatCustomerSummary(customer: Customer) {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    marketingOptIn: customer.marketingOptIn,
    addressCount: customer.addresses?.length || 0,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

/**
 * Format address for response
 */
function formatAddress(address: Address) {
  return {
    id: address.id,
    address1: address.address1,
    address2: address.address2,
    city: address.city,
    region: address.region,
    postalCode: address.postalCode,
    country: address.country,
    firstName: address.firstName,
    lastName: address.lastName,
    company: address.company,
    phone: address.phone,
    isDefault: address.isDefault,
  };
}

/**
 * Format full customer for response
 */
function formatCustomerFull(customer: Customer) {
  return {
    id: customer.id,
    storeId: customer.storeId,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    marketingOptIn: customer.marketingOptIn,
    defaultAddressId: customer.defaultAddressId,
    addresses: customer.addresses?.map(formatAddress) || [],
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * Create all customer management tools
 */
export function createCustomerTools(client: HttpClient): ToolDefinition[] {
  return [
    // =========================================================================
    // list_customers
    // =========================================================================
    {
      name: "list_customers",
      description:
        "List customers in your store with optional search, filters, and sorting.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          search: {
            type: "string",
            description: "Search in name, email, or phone",
          },
          marketingOptIn: {
            type: "boolean",
            description: "Filter by marketing opt-in status",
          },
          hasOrders: {
            type: "boolean",
            description: "Filter to only customers with orders",
          },
          sortBy: {
            type: "string",
            enum: ["name", "email", "createdAt", "updatedAt"],
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
            description: "Number of customers to return",
          },
          offset: {
            type: "integer",
            default: 0,
            minimum: 0,
            description: "Number of customers to skip",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = listCustomersSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const params: Record<string, unknown> = {
            limit: input.limit,
            offset: input.offset,
            sortBy: input.sortBy,
            sortOrder: input.sortOrder,
          };

          if (input.search) params.search = input.search;
          if (input.marketingOptIn !== undefined) {
            params.marketingOptIn = input.marketingOptIn;
          }
          if (input.hasOrders !== undefined) {
            params.hasOrders = input.hasOrders;
          }

          const response = await client.get<ListResponse<Customer>>(
            storeApiPath(storeId, "customers"),
            params
          );

          return formatSuccess({
            items: response.items.map(formatCustomerSummary),
            total: response.pagination.total,
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // get_customer
    // =========================================================================
    {
      name: "get_customer",
      description:
        "Get detailed information about a customer including their addresses and order history.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          customerId: {
            type: "string",
            description: "Customer UUID",
          },
          email: {
            type: "string",
            description: "Customer email (alternative to customerId)",
          },
        },
      },
      handler: async (args) => {
        try {
          const input = getCustomerSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          if (!input.customerId && !input.email) {
            return formatError(
              new Error("Either customerId or email must be provided")
            );
          }

          let customer: Customer;

          if (input.customerId) {
            const response = await client.get<SingleResponse<Customer>>(
              storeApiPath(storeId, `customers/${input.customerId}`)
            );
            customer = response.item;
          } else {
            // Find by email
            const response = await client.get<ListResponse<Customer>>(
              storeApiPath(storeId, "customers"),
              { search: input.email, limit: 1 }
            );
            if (response.items.length === 0) {
              return formatError(
                new Error(`Customer with email "${input.email}" not found`)
              );
            }
            customer = response.items[0]!;
          }

          return formatSuccess(formatCustomerFull(customer));
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // create_customer
    // =========================================================================
    {
      name: "create_customer",
      description:
        "Create a new customer with email and optional details like name, phone, and addresses.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          email: {
            type: "string",
            description: "Customer email (required, must be unique)",
          },
          name: {
            type: "string",
            description: "Customer full name",
          },
          phone: {
            type: "string",
            description: "Customer phone number",
          },
          marketingOptIn: {
            type: "boolean",
            default: false,
            description: "Whether customer opted in to marketing",
          },
          addresses: {
            type: "array",
            description: "Customer addresses",
            items: {
              type: "object",
              description: "Address object with address1, city, postalCode, country (2-letter code)",
            },
          },
        },
        required: ["email"],
      },
      handler: async (args) => {
        try {
          const input = createCustomerSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const { storeId: _, ...customerData } = input;

          const response = await client.post<SingleResponse<Customer>>(
            storeApiPath(storeId, "customers"),
            customerData
          );

          return formatSuccess({
            message: "Customer created successfully",
            customer: formatCustomerFull(response.item),
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // update_customer
    // =========================================================================
    {
      name: "update_customer",
      description:
        "Update customer details like email, name, phone, or marketing preferences.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          customerId: {
            type: "string",
            description: "Customer UUID (required)",
          },
          email: {
            type: "string",
            description: "New email address",
          },
          name: {
            type: "string",
            description: "Customer name",
          },
          phone: {
            type: "string",
            description: "Customer phone",
          },
          marketingOptIn: {
            type: "boolean",
            description: "Marketing opt-in status",
          },
        },
        required: ["customerId"],
      },
      handler: async (args) => {
        try {
          const input = updateCustomerSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          const { storeId: _, customerId, ...updateData } = input;

          // Remove undefined values
          const payload = Object.fromEntries(
            Object.entries(updateData).filter(([, v]) => v !== undefined)
          );

          if (Object.keys(payload).length === 0) {
            return formatError(
              new Error("No fields to update. Provide at least one field.")
            );
          }

          const response = await client.patch<SingleResponse<Customer>>(
            storeApiPath(storeId, `customers/${customerId}`),
            payload
          );

          return formatSuccess({
            message: "Customer updated successfully",
            customer: formatCustomerFull(response.item),
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },

    // =========================================================================
    // delete_customer
    // =========================================================================
    {
      name: "delete_customer",
      description:
        "Delete a customer. This is a soft delete; customer data is retained for order history.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            description: "Store UUID. If not provided, uses the default store.",
          },
          customerId: {
            type: "string",
            description: "Customer UUID to delete",
          },
        },
        required: ["customerId"],
      },
      handler: async (args) => {
        try {
          const input = deleteCustomerSchema.parse(args);
          const storeId = resolveStoreId(input.storeId, client);

          await client.delete(
            storeApiPath(storeId, `customers/${input.customerId}`)
          );

          return formatSuccess({
            deleted: true,
            customerId: input.customerId,
            message: "Customer deleted successfully",
          });
        } catch (error) {
          return formatError(error);
        }
      },
    },
  ];
}
