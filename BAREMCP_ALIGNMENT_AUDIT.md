# BareMCP Alignment Audit Report

**Generated:** 2025-12-15
**Auditor:** Independent Verification Agent
**Scope:** baremcp repository alignment with UNIFIED_CONTRACT.md

---

## Executive Summary

| Category | Count | Status |
|----------|-------|--------|
| Confirmed Alignments | 32 | ✅ |
| Violations (Must-Fix) | 3 | ❌ |
| Assumptions (Review) | 2 | ⚠️ |

**Final Verdict:** ⚠️ **MOSTLY ALIGNED** — 3 issues require correction before full compliance.

---

## 1. Confirmed Alignments

### 1.1 Canonical Enums

All canonical enum values are correctly implemented:

| Enum | Contract Source | baremcp Location | Status |
|------|-----------------|------------------|--------|
| OrderStatus | UNIFIED_CONTRACT §1.1 | `types.ts:116`, `orders.ts:27` | ✅ Exact match: `pending\|paid\|fulfilled\|cancelled` |
| PaymentStatus | UNIFIED_CONTRACT §1.2 | `types.ts:117-124`, `orders.ts:28-36` | ✅ All 7 values match |
| ProductStatus | UNIFIED_CONTRACT §1.3 | `types.ts:81` | ✅ `draft\|published\|archived\|deleted` |
| PageStatus | UNIFIED_CONTRACT §1.4 | `types.ts:251` | ✅ `draft\|published\|archived\|deleted` |
| PageBodyFormat | UNIFIED_CONTRACT §1.5 | `types.ts:252`, `pages.ts:28` | ✅ `plain\|html\|markdown` |
| CategoryStatus | UNIFIED_CONTRACT §1.6 | `types.ts:225` | ✅ `draft\|published\|archived\|deleted` |
| StoreStatus | UNIFIED_CONTRACT §1.7 | `types.ts:44`, `store.ts:36` | ✅ `active\|suspended\|deleted` |
| WebhookEvent | UNIFIED_CONTRACT §1.11 | `types.ts:293-313`, `webhooks.ts:26-47` | ✅ All 19 events match |
| AuditActorType | UNIFIED_CONTRACT §2.6 | `types.ts:333`, `audit.ts:24` | ✅ `merchant\|api_key\|system\|webhook` |
| AuditAction | UNIFIED_CONTRACT §2.6 | `types.ts:334`, `audit.ts:25` | ✅ `create\|update\|delete\|export` |
| AuditResourceType | UNIFIED_CONTRACT §2.6 | `types.ts:335-346`, `audit.ts:26-38` | ✅ All 11 types match |

### 1.2 Response Formats

| Format | Contract | baremcp | Status |
|--------|----------|---------|--------|
| Single item | `{ item: T }` | `types.ts:31-33` | ✅ |
| List | `{ items: T[], pagination }` | `types.ts:26-29` | ✅ |
| Pagination | `page, limit, total, totalPages, hasNext, hasPrev` | `types.ts:17-24` | ✅ |
| Delete | HTTP 204 No Content | `http.ts:256-259` | ✅ |

### 1.3 HTTP Methods

| Method | Contract Usage | baremcp Implementation | Status |
|--------|----------------|------------------------|--------|
| GET | Read resources | `http.ts:29-30, 266-267` | ✅ |
| POST | Create resources | `http.ts:34-35, 269-270` | ✅ |
| PATCH | Partial updates | `http.ts:44-45, 275-276` | ✅ Used in all update handlers |
| DELETE | Delete resources | `http.ts:49-50, 278-279` | ✅ |

### 1.4 Store-Scoped API Paths

- **Contract:** `/stores/{storeId}/{resource}`
- **baremcp:** `storeApiPath()` function at `http.ts:331-333` generates correct paths
- **Status:** ✅ Aligned

### 1.5 Error Handling

| Error Code | Contract HTTP | baremcp Handling | Status |
|------------|---------------|------------------|--------|
| VALIDATION_ERROR | 400 | `errors.ts:92-134` | ✅ |
| UNAUTHORIZED | 401 | `http.ts:210` | ✅ |
| FORBIDDEN | 403 | `errors.ts:155-175`, `http.ts:161-190` | ✅ |
| NOT_FOUND | 404 | `http.ts:210` | ✅ |
| CONFLICT | 409 | `http.ts:210` | ✅ |
| RATE_LIMITED | 429 | `http.ts:210` | ✅ |
| INTERNAL_ERROR | 500 | `http.ts:210` | ✅ |

### 1.6 Field Mappings

| Field | Contract | baremcp | Status |
|-------|----------|---------|--------|
| Page content | `body` (canonical) | `types.ts:260` | ✅ Uses `body` |
| Order item title | `titleSnapshot` | `types.ts:142`, `orders.ts:149` | ✅ Maps correctly |
| Order item price | `unitPrice` | `types.ts:147`, `orders.ts:152` | ✅ Maps correctly |
| Media size | `size` (bytes) | `types.ts:280` | ✅ |

### 1.7 Authentication

| Aspect | Contract | baremcp | Status |
|--------|----------|---------|--------|
| API Key header | `X-API-Key: {key}` | `http.ts:132-134` | ✅ |
| OAuth Device Flow | 5 endpoints | `session.ts:254-502` | ✅ Fully implemented |

### 1.8 Security Validations

| Validation | Contract Requirement | baremcp Implementation | Status |
|------------|---------------------|------------------------|--------|
| Webhook URL HTTPS | Required | `webhooks.ts:52-101` | ✅ Enforced |
| Block localhost | Required | `webhooks.ts:64-72` | ✅ Enforced |
| Block private IPs | Required | `webhooks.ts:76-91` | ✅ Enforced |
| Credential encryption | Best practice | `session.ts:50-96` | ✅ AES-256-GCM |

### 1.9 Endpoint Paths

| Resource | Contract Path | baremcp Path | Status |
|----------|---------------|--------------|--------|
| Products | `GET/POST /stores/:storeId/products` | `products.ts:296, 498` | ✅ |
| Orders | `GET /stores/:storeId/orders` | `orders.ts:269` | ✅ |
| Customers | `GET/POST /stores/:storeId/customers` | `customers.ts` | ✅ |
| Categories | `GET/POST /stores/:storeId/categories` | `categories.ts` | ✅ |
| Pages | `GET/POST /stores/:storeId/pages` | `pages.ts:203-206` | ✅ |
| Media | `GET/POST /stores/:storeId/media` | `media.ts` | ✅ |
| Webhooks | `GET/POST /stores/:storeId/webhooks` | `webhooks.ts:251-254` | ✅ |
| Audit Logs | `GET /stores/:storeId/audit-logs` | `audit.ts:214-217` | ✅ |
| Stores | `GET/PATCH /stores/:storeId` | `store.ts:118-120, 202-205` | ✅ |
| Refunds | `POST /stores/:storeId/orders/:orderId/refund` | `orders.ts:439` | ✅ |
| Order Export | `POST /stores/:storeId/orders/export` | `orders.ts:505-509` | ✅ |

---

## 2. Violations (Must-Fix)

### 2.1 HTTP Client Exposes PUT Method

| Attribute | Value |
|-----------|-------|
| **File** | `src/client/http.ts` |
| **Lines** | 38-40, 272-273 |
| **Severity** | Medium |

**Contract Requirement:**
> "PUT is not used. Use PATCH for updates."
— UNIFIED_CONTRACT.md, barecommerce-core README, barecommerce-api README

**Current Implementation:**
```typescript
// http.ts:38-40
put<T>(path: string, body?: unknown): Promise<T>;

// http.ts:272-273
put: <T>(path: string, body?: unknown) =>
  request<T>("PUT", path, { body }),
```

**Wrong Assumption:** baremcp assumes PUT may be needed.

**What Contract Allows:** Only POST, GET, PATCH, DELETE.

**Corrective Action:**
- Remove `put` method from `HttpClient` interface
- Remove `put` implementation from `createHttpClient` return object
- Update any internal usages (none found)

---

### 2.2 Product Create Status Too Restrictive

| Attribute | Value |
|-----------|-------|
| **File** | `src/tools/products.ts` |
| **Line** | 32 |
| **Severity** | Low |

**Contract Requirement:**
> "Create/Update Input Values: `draft | published | archived`"
— UNIFIED_CONTRACT.md §1.3

**Current Implementation:**
```typescript
// products.ts:32
const productStatusCreate = z.enum(["draft", "published"]);
```

**Wrong Assumption:** Products cannot be created with `archived` status.

**What Contract Allows:** Products can be created with `draft`, `published`, OR `archived` status.

**Corrective Action:**
```typescript
// Change from:
const productStatusCreate = z.enum(["draft", "published"]);

// To:
const productStatusCreate = z.enum(["draft", "published", "archived"]);
```

---

### 2.3 Order merchantNote Max Length Exceeds Contract

| Attribute | Value |
|-----------|-------|
| **File** | `src/tools/orders.ts` |
| **Line** | 63 |
| **Severity** | Medium |

**Contract Requirement:**
> "merchantNote?: string; // max 1000"
— UNIFIED_CONTRACT.md §3.4

**Current Implementation:**
```typescript
// orders.ts:63
merchantNote: z.string().max(5000),
```

**Wrong Assumption:** Merchant notes can be 5000 characters.

**What Contract Allows:** Maximum 1000 characters.

**Impact:** Users may enter notes up to 5000 chars that the API will reject with VALIDATION_ERROR.

**Corrective Action:**
```typescript
// Change from:
merchantNote: z.string().max(5000),

// To:
merchantNote: z.string().max(1000),
```

Also update the inputSchema description at line 366-368:
```typescript
// Change from:
description: "Note text to add or update (max 5000 chars)",
maxLength: 5000,

// To:
description: "Note text to add or update (max 1000 chars)",
maxLength: 1000,
```

---

## 3. Assumptions (Review Recommended)

### 3.1 Page Body Max Length More Restrictive

| Attribute | Value |
|-----------|-------|
| **File** | `src/tools/pages.ts` |
| **Line** | 50 |
| **Assessment** | Acceptable |

**Contract:**
> "body?: string; // max 1,000,000"
— UNIFIED_CONTRACT.md §3.5

**baremcp:**
```typescript
body: z.string().max(100000).optional().nullable(),
```

**Analysis:** baremcp limits to 100,000 characters while contract allows 1,000,000. This is **more restrictive** than the contract, which is generally safe but may limit legitimate use cases (very long pages).

**Recommendation:** Consider increasing to match contract or document the limitation.

---

### 3.2 Low Stock Threshold Hardcoded

| Attribute | Value |
|-----------|-------|
| **File** | `src/tools/products.ts` |
| **Lines** | 302-303 |
| **Assessment** | Acceptable |

**Implementation:**
```typescript
if (input.lowStock) {
  items = items.filter((p) => p.trackStock && p.stock <= 10);
}
```

**Analysis:** The `lowStock` filter uses a hardcoded threshold of 10. This is a baremcp-specific convenience feature, not derived from the contract. The API does not provide a `lowStock` filter.

**Note:** This is client-side filtering after API response, which is acceptable but may be inefficient for large product lists. The contract does not define "low stock" semantics.

**Recommendation:** Document this as a baremcp convenience feature, not an API capability.

---

## 4. Proposed Corrective Plan

### Phase 1: Must-Fix Violations (Immediate)

| # | File | Change Type | Risk |
|---|------|-------------|------|
| 1 | `src/client/http.ts` | Remove PUT method | Low - breaking if PUT was used |
| 2 | `src/tools/products.ts:32` | Add "archived" to create enum | None |
| 3 | `src/tools/orders.ts:63,366-368` | Change max 5000 → 1000 | Low - may affect existing users |

### Suggested Diff

**http.ts:**
```diff
export interface HttpClient {
  get<T>(path: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
- put<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
  upload<T>(path: string, formData: FormData): Promise<T>;
  // ... rest unchanged
}

// In createHttpClient return object:
return {
  get: <T>(path: string, params?: Record<string, unknown>) =>
    request<T>("GET", path, { params }),
  post: <T>(path: string, body?: unknown) =>
    request<T>("POST", path, { body }),
- put: <T>(path: string, body?: unknown) =>
-   request<T>("PUT", path, { body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>("PATCH", path, { body }),
  // ... rest unchanged
}
```

**products.ts:**
```diff
- const productStatusCreate = z.enum(["draft", "published"]);
+ const productStatusCreate = z.enum(["draft", "published", "archived"]);
```

**orders.ts:**
```diff
const updateOrderNotesSchema = z.object({
  storeId: z.string().uuid().optional(),
  orderId: z.string().uuid(),
- merchantNote: z.string().max(5000),
+ merchantNote: z.string().max(1000),
});

// In inputSchema:
merchantNote: {
  type: "string",
- description: "Note text to add or update (max 5000 chars)",
- maxLength: 5000,
+ description: "Note text to add or update (max 1000 chars)",
+ maxLength: 1000,
},
```

### Phase 2: Optional Improvements

| # | File | Change | Priority |
|---|------|--------|----------|
| 1 | `src/tools/pages.ts:50` | Consider increasing body max to 1,000,000 | Low |
| 2 | `src/tools/products.ts:302-303` | Document lowStock as client-side filter | Low |

---

## 5. Verification Checklist

After applying fixes, verify:

- [ ] `npm run typecheck` passes
- [ ] All tools compile without errors
- [ ] No tool uses `client.put()`
- [ ] Product creation accepts `status: "archived"`
- [ ] Order note update rejects strings > 1000 chars
- [ ] Existing tests pass (if any)

---

## 6. Appendix: Source Files Reviewed

| File | Lines | Purpose |
|------|-------|---------|
| `src/client/http.ts` | 1-334 | HTTP client implementation |
| `src/client/errors.ts` | 1-292 | Error handling and formatting |
| `src/client/types.ts` | 1-378 | TypeScript type definitions |
| `src/client/index.ts` | 1-23 | Module exports |
| `src/tools/products.ts` | 1-836 | Product management tools |
| `src/tools/orders.ts` | 1-525 | Order management tools |
| `src/tools/customers.ts` | 1-488 | Customer management tools |
| `src/tools/categories.ts` | 1-506 | Category management tools |
| `src/tools/pages.ts` | 1-491 | Page management tools |
| `src/tools/media.ts` | 1-359 | Media management tools |
| `src/tools/webhooks.ts` | 1-463 | Webhook management tools |
| `src/tools/audit.ts` | 1-267 | Audit log tools |
| `src/tools/store.ts` | 1-222 | Store management tools |
| `src/tools/session.ts` | 1-504 | OAuth Device Flow authentication |

---

## 7. Authoritative Documents Referenced

| Document | Location | Purpose |
|----------|----------|---------|
| UNIFIED_CONTRACT.md | `/BareCommerceCore/UNIFIED_CONTRACT.md` | Canonical API contract |
| barecommerce-core README | `/barecommerce-core/README.md` | Frontend expectations |
| barecommerce-api README | `/barecommerce-api/README.md` | Backend API specification |

---

**Report End**