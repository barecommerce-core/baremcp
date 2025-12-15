/**
 * BareMCP — API Response Types
 *
 * Type definitions for BareCommerceCore API responses.
 */

// =============================================================================
// Role Types
// =============================================================================

export type Role = "owner" | "admin" | "editor" | "viewer";

// =============================================================================
// Generic Response Types
// =============================================================================

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ListResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface SingleResponse<T> {
  item: T;
}

// =============================================================================
// Store Types
// =============================================================================

export interface Store {
  id: string;
  merchantId: string;
  name: string;
  domain: string | null;
  status: "active" | "suspended" | "deleted";
  currency: string;
  timezone: string;
  weightUnit: string;
  shopEmail: string | null;
  shopPhone: string | null;
  shopDescription: string | null;
  shopIndustry: string | null;
  businessAddress1: string | null;
  businessAddress2: string | null;
  businessCity: string | null;
  businessRegion: string | null;
  businessZip: string | null;
  businessCountry: string | null;
  orderNumberPrefix: string;
  logoMediaId: string | null;
  faviconMediaId: string | null;
  attributeSchema: Record<string, { label: string }> | null;
  metafieldSchema: Record<string, { type: string }> | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
    orders: number;
    pages?: number;
    categories?: number;
    customers?: number;
    media?: number;
    webhooks?: number;
    apiKeys?: number;
  };
}

// =============================================================================
// Product Types
// =============================================================================

export type ProductStatus = "draft" | "published" | "archived" | "deleted";

export interface Product {
  id: string;
  storeId: string;
  title: string;
  slug: string;
  status: ProductStatus;
  publishedAt: string | null;
  description: string | null;
  price: string;
  compareAtPrice: string | null;
  sku: string | null;
  barcode: string | null;
  variantGroupId: string | null;
  attributes: Record<string, string>;
  trackStock: boolean;
  stock: number;
  allowBackorder: boolean;
  categoryIds: string[];
  primaryMediaId: string | null;
  featuredMediaUrl: string | null;
  mediaIds: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  seoImageId: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Order Types
// =============================================================================

export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled";
export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded"
  | "partially_refunded"
  | "cancelled";

export interface OrderAddress {
  address1: string;
  address2?: string;
  city: string;
  region?: string;
  postalCode: string;
  country: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  titleSnapshot: string;
  skuSnapshot: string | null;
  primaryImageId: string | null;
  variantTitle: string | null;
  attributesSnapshot: Record<string, string> | null;
  unitPrice: string;
  quantity: number;
  lineDiscount: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  storeId: string;
  customerId: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  subtotal: string | null;
  tax: string | null;
  taxRate: string | null;
  shipping: string | null;
  discount: string | null;
  discountCode: string | null;
  total: string;
  paymentProvider: string | null;
  paymentId: string | null;
  paymentStatus: PaymentStatus | null;
  paymentMethod: string | null;
  paymentDetails: Record<string, unknown> | null;
  shippingAddress: OrderAddress | null;
  billingAddress: OrderAddress | null;
  customerNote: string | null;
  merchantNote: string | null;
  items: OrderItem[];
  placedAt: string | null;
  paidAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Customer Types
// =============================================================================

export interface Address {
  id: string;
  customerId: string;
  address1: string;
  address2: string | null;
  city: string;
  region: string | null;
  postalCode: string;
  country: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  storeId: string;
  email: string;
  name: string | null;
  phone: string | null;
  marketingOptIn: boolean;
  defaultAddressId: string | null;
  addresses?: Address[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Category Types
// =============================================================================

export type CategoryStatus = "draft" | "published" | "archived" | "deleted";

export interface Category {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  status: CategoryStatus;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  productCount: number;
  imageId: string | null;
  imageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Page Types
// =============================================================================

export type PageStatus = "draft" | "published" | "archived" | "deleted";
export type PageBodyFormat = "plain" | "html" | "markdown";

export interface Page {
  id: string;
  storeId: string;
  title: string;
  slug: string;
  status: PageStatus;
  body: string | null;
  bodyFormat: PageBodyFormat;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  seoImageId: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Media Types
// =============================================================================

export interface Media {
  id: string;
  storeId: string;
  filename: string;
  alt: string | null;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  url: string;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Webhook Types
// =============================================================================

export type WebhookEvent =
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "order.created"
  | "order.updated"
  | "order.paid"
  | "order.fulfilled"
  | "order.cancelled"
  | "order.refunded"
  | "customer.created"
  | "customer.updated"
  | "customer.deleted"
  | "category.created"
  | "category.updated"
  | "category.deleted"
  | "page.created"
  | "page.updated"
  | "page.deleted"
  | "media.created"
  | "media.deleted";

export interface Webhook {
  id: string;
  storeId: string;
  url: string;
  events: WebhookEvent[];
  secret: string | null;
  isActive: boolean;
  description: string | null;
  lastTriggeredAt: string | null;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Audit Log Types
// =============================================================================

export type AuditActorType = "merchant" | "api_key" | "system" | "webhook";
export type AuditAction = "create" | "update" | "delete" | "export";
export type AuditResourceType =
  | "store"
  | "product"
  | "page"
  | "category"
  | "customer"
  | "order"
  | "media"
  | "webhook"
  | "api_key"
  | "merchant"
  | "payment_settings";

export interface AuditLog {
  id: string;
  storeId: string;
  actorId: string;
  actorType: AuditActorType;
  action: AuditAction;
  resourceId: string;
  resourceType: AuditResourceType;
  diff: {
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  } | null;
  ipAddress: string | null;
  createdAt: string;
}

// =============================================================================
// API Key Types
// =============================================================================

export interface StoreApiKey {
  id: string;
  storeId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}
