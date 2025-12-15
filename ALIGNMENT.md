# BareMCP Alignment Specification

> **Version:** 1.0.0
> **Status:** Binding
> **Scope:** Agent governance, contract enforcement, context loading

This document defines how BareMCP orchestrates, governs, and constrains LLM-driven agents operating on BareCommerceCore.

---

## Section 1 — Authoritative Context

### 1.1 Primary Context Files

BareMCP loads **exactly three files** as authoritative context:

| File | Path | Role |
|------|------|------|
| Frontend README | `barecommerce-core/README.md` | Descriptive truth for frontend |
| Backend README | `barecommerce-api/README.md` | Descriptive truth for backend |
| Contract | `contract-objectives.md` | Binding law for both |

### 1.2 Context Hierarchy

```
contract-objectives.md (LAW)
    │
    ├── barecommerce-api/README.md (BACKEND TRUTH)
    │
    └── barecommerce-core/README.md (FRONTEND TRUTH)
```

**Rule:** If code violates `contract-objectives.md`, the code must change — not the contract.

### 1.3 Context Loading Requirements

Context loading MUST be:

| Requirement | Description |
|-------------|-------------|
| **Explicit** | Files are loaded by path, not inferred |
| **Deterministic** | Same paths produce same context |
| **Complete** | All three files loaded together |
| **Immutable** | Context is read-only during agent execution |

Prohibited:
- Implicit repo structure inference
- File naming convention assumptions
- LLM memory of previous sessions
- Partial context loading

---

## Section 2 — Contract Enforcement

### 2.1 The Contract Rule

```
IF code violates contract-objectives.md
THEN code MUST change
     contract MUST NOT change
```

### 2.2 Enforcement Triggers

Contract audits are triggered by:

| Trigger | Description |
|---------|-------------|
| **Pre-change** | Before any code modification |
| **Post-change** | After code modification |
| **On-demand** | Explicit audit request |
| **Drift-detection** | Periodic compliance check |

### 2.3 Audit Classification

All audits produce one of:

| Status | Definition | Action |
|--------|------------|--------|
| `PASS` | All contract terms satisfied | Proceed |
| `PARTIAL` | Some violations, non-blocking | Flag, remediate |
| `FAIL` | Critical contract violations | Block, remediate |

### 2.4 Specific Contract Violations

Based on `contract-objectives.md`:

| Violation Category | Examples |
|--------------------|----------|
| **Path violation** | Using `/products` instead of `/stores/{storeId}/products` |
| **Method violation** | Using PUT (contract prohibits) |
| **Response envelope violation** | Not wrapping in `{ item: ... }` |
| **Field type violation** | Sending price as string instead of number |
| **Required field omission** | Missing `title` on product create |
| **Error format violation** | Not using `{ error: { code, message } }` |

---

## Section 3 — Change Classification

### 3.1 Classification Categories

Every proposed change MUST be classified as one of:

| Category | Definition | Coordination |
|----------|------------|--------------|
| **Frontend-only** | Changes only to `barecommerce-core` | Safe, no coordination |
| **Backend-only** | Changes only to `barecommerce-api` | Safe, no coordination |
| **Coordinated** | Changes to both repositories | Requires frontend + backend |
| **Contract-breaking** | Violates `contract-objectives.md` | REJECTED or remediated |

### 3.2 Classification Rules

Classification is derived from READMEs and contract:

```
IF change affects response envelope structure
THEN category = Coordinated OR Contract-breaking

IF change adds optional response field
THEN category = Backend-only (contract Section 5.2 permits)

IF change removes response field frontend consumes
THEN category = Contract-breaking (contract Section 5.1 prohibits)

IF change is UI-only (no API impact)
THEN category = Frontend-only

IF change is API-only (no frontend consumption)
THEN category = Backend-only
```

### 3.3 Examples from Contract

| Change | Category | Reason |
|--------|----------|--------|
| Add new CSS component | Frontend-only | No API impact |
| Add optional `createdBy` field to response | Backend-only | Contract 5.2: non-breaking |
| Change `/products` to `/items` | Contract-breaking | Contract 5.1: path change |
| Add new endpoint `/stores/{storeId}/reviews` | Backend-only | Contract 5.2: new endpoint |
| Change `{ item }` to `{ data }` | Contract-breaking | Contract 5.1: envelope change |
| Add validation in both frontend and backend | Coordinated | Touches both repos |

---

## Section 4 — Agent Discipline

### 4.1 Agent Constraints

Agents operating under BareMCP MUST:

| Constraint | Description |
|------------|-------------|
| **Read before modify** | Never propose changes to unread code |
| **Consult READMEs** | Check relevant README before action |
| **Respect invariants** | Honor "Always True" sections in READMEs |
| **Avoid non-goals** | Never implement items in "Explicit Non-Goals" |
| **Mark undefined** | Flag any behavior not specified in context |
| **Refuse illegal** | Reject changes violating contract invariants |

### 4.2 Prohibited Agent Behaviors

| Prohibited Behavior | Reason |
|---------------------|--------|
| Infer intent beyond READMEs | READMEs define boundaries |
| Assume "typical" framework behavior | Only documented behavior counts |
| Implement non-goals | READMEs explicitly exclude them |
| Bypass authentication checks | API README: all `/stores/*` require auth |
| Create orders via API | Backend README: webhook-only creation |
| Trust frontend permissions | Frontend README: UI gating is UX only |
| Use PUT methods | Contract: no endpoint uses PUT |

### 4.3 Invariants from READMEs

**Frontend Invariants (barecommerce-core/README.md Section 7):**

| Invariant | Agent must respect |
|-----------|-------------------|
| `AuthProvider` wraps entire app | Never modify without understanding |
| `credentials: 'include'` on all API calls | Never remove |
| Protected routes redirect without cookie | Never bypass |

**Backend Invariants (barecommerce-api/README.md Section 7):**

| Invariant | Agent must respect |
|-----------|-------------------|
| All `/stores/*` routes require authentication | Never bypass |
| Payment webhooks bypass authentication | By design |
| Body size limited to 10MB | Never increase |
| Error messages never expose internals | Never leak |
| Passwords hashed with Argon2id | Never weaken |
| API keys hashed with SHA-256 | Never expose |
| Audit logs are immutable | Never allow UPDATE |

### 4.4 Explicit Non-Goals (Agent Must NOT Implement)

**From Frontend README Section 10:**

- Server-side session validation
- Authorization enforcement
- Direct database access
- API route business logic
- Static site generation
- State management library (Redux, etc.)
- Internationalization
- Offline support

**From Backend README Section 10:**

- HTML rendering
- Direct order creation via API
- UI-level permission gating
- File storage in database
- Session storage in memory
- Rate limiting in memory
- Internationalization
- GraphQL

---

## Section 5 — Audit and Remediation Loop

### 5.1 The Loop

```
1. Change proposed or applied
         │
         v
2. Contract audit triggered
         │
         v
3. Findings classified (PASS / PARTIAL / FAIL)
         │
         v
4. If FAIL or PARTIAL:
         │
         ├── Code changes generated to remediate
         │
         └── Return to step 2
         │
5. Audit passes → Change complete
```

### 5.2 Audit Checklist

Every audit checks:

**Contract Compliance:**

| Check | Source |
|-------|--------|
| Path patterns correct | Contract 1.1 |
| HTTP methods correct | Contract 1.2 |
| Request schemas valid | Contract 1.3 |
| Response envelopes correct | Contract 1.4 |
| Error format correct | Contract 1.6 |
| Authentication mechanism | Contract 1.7 |

**Frontend Guarantees:**

| Check | Source |
|-------|--------|
| `Content-Type: application/json` | Contract 2.1 |
| `credentials: 'include'` | Contract 2.1 |
| Numeric fields are numbers | Contract 2.1 |
| Responses accessed via `.item` / `.items` | Contract 2.2 |
| HTTP 204 handled | Contract 2.2 |
| HTTP 401 clears session | Contract 2.2 |

**Backend Guarantees:**

| Check | Source |
|-------|--------|
| Endpoints exist and stable | Contract 3.1 |
| Response shapes correct | Contract 3.2 |
| One-time fields present only on create | Contract 3.3 |
| Validation returns 400 | Contract 3.4 |
| Missing auth returns 401 | Contract 3.4 |
| Insufficient permissions returns 403 | Contract 3.4 |

### 5.3 Remediation Rules

| Finding | Remediation |
|---------|-------------|
| Wrong HTTP method | Change to correct method |
| Wrong path pattern | Change to `/stores/{storeId}/...` |
| Missing response envelope | Wrap in `{ item: ... }` or `{ items: ..., pagination }` |
| Wrong error format | Change to `{ error: { code, message } }` |
| PUT method used | Change to PATCH |
| Numeric field as string | Change to number type |
| Missing required field | Add field with valid value |

---

## Section 6 — Coordination Requirements

### 6.1 Breaking Changes (Contract 5.1)

The following require coordinated frontend/backend deployment:

1. Removing an endpoint
2. Changing an endpoint path
3. Changing an HTTP method
4. Removing a required request field
5. Adding a new required request field
6. Removing a response field frontend consumes
7. Changing response envelope structure
8. Changing error code values
9. Changing pagination response structure
10. Changing authentication mechanism

### 6.2 Non-Breaking Changes (Contract 5.2)

The following do NOT require coordination:

1. Adding a new endpoint
2. Adding an optional request field
3. Adding a new response field
4. Adding a new error code
5. Adding a new enum value (if frontend ignores unknown)
6. Changing error message text
7. Changing rate limit thresholds

### 6.3 Coordination Protocol

For coordinated changes:

```
1. Document change in both READMEs
2. Update contract-objectives.md if needed
3. Implement backend changes
4. Implement frontend changes
5. Test end-to-end
6. Deploy together
```

---

## Section 7 — Security-Critical Boundaries

### 7.1 Frontend Security Boundaries

From `barecommerce-core/README.md`:

| Boundary | Rule |
|----------|------|
| Session validation | Cannot validate, only detect cookie presence |
| Permission enforcement | UI-only, never trusted |
| CSRF | Browser sends Origin automatically |
| Cookie handling | Never access, `httpOnly` |

### 7.2 Backend Security Boundaries

From `barecommerce-api/README.md`:

| Boundary | Rule |
|----------|------|
| Session validation | Always validate via Lucia |
| Permission enforcement | Check on every request |
| CSRF | Validate Origin for session + state-change |
| Password storage | Argon2id only |
| API key storage | SHA-256 hash only |
| Rate limiting | Fail-closed, circuit breaker |

### 7.3 Security Files (Never Modify Without Audit)

**Frontend:**
- `src/middleware.ts` — route protection
- `src/lib/auth/context.tsx` — authentication state
- `src/lib/permissions/` — permission gating
- Security headers in `next.config.mjs`
- Sanitization in rich-text/markdown editors

**Backend:**
- `src/middleware/csrf.ts` — CSRF protection
- `src/middleware/auth.ts` — authentication
- `src/lib/permissions.ts` — permission enforcement
- `src/lib/auth/password.ts` — password hashing
- `src/lib/auth/lucia.ts` — session management
- `src/index.ts` error handler — information disclosure

---

## Section 8 — Undefined Behavior Handling

### 8.1 Undefined in Contract

From `contract-objectives.md` Section 3.5:

| Undefined Behavior | Agent Action |
|--------------------|--------------|
| Order status transition validation | Mark as undefined, do not assume |
| Product stock decrement on order | Mark as undefined, do not implement |
| Webhook delivery retry | Mark as undefined, do not rely on |
| API key expiration | Mark as undefined, do not enforce |
| Session expiration timing | Mark as undefined, do not assume |

### 8.2 Undefined in READMEs

| Undefined Behavior | Agent Action |
|--------------------|--------------|
| Audit log creation success | May fail, retry queue may fail |
| Webhook delivery success | External systems, no guarantee |
| Rate limit counter accuracy | DB contention possible |
| Session validity from cookie | Middleware cannot validate |
| User permission from UI button | UI gating is UX only |
| API reachability | Network can fail |
| Data freshness | No automatic revalidation |

### 8.3 Handling Protocol

```
IF behavior is undefined:
    1. Mark explicitly as undefined
    2. Do not assume default behavior
    3. Do not implement hidden logic
    4. Document as undefined in changes
    5. Ask for clarification if blocking
```

---

## Section 9 — BareMCP Explicit Non-Responsibilities

### 9.1 What BareMCP Does NOT Do

| Non-Responsibility | Reason |
|--------------------|--------|
| Interpret undocumented behavior | Only READMEs and contract are truth |
| Weaken contract terms | Contract is binding law |
| Introduce soft guidelines | All rules are hard requirements |
| Allow audit bypass | All changes audited |
| Assume framework defaults | Only documented behavior counts |
| Persist agent state | Each session is stateless |
| Cache context between sessions | Always reload from files |
| Auto-merge conflicting changes | Coordination is explicit |

### 9.2 What Agents Cannot Do

| Prohibition | Enforcement |
|-------------|-------------|
| Modify contract-objectives.md | File is read-only |
| Ignore audit findings | Loop until PASS |
| Propose non-goal implementations | Reject immediately |
| Bypass security files without audit | Flag as security-critical |
| Assume implicit coordination | Explicit classification required |

---

## Section 10 — Completion Criteria

### 10.1 Agent Onboarding

An agent is ready when it can:

1. Load all three context files explicitly
2. Classify any proposed change correctly
3. Run contract audit on changes
4. Identify and refuse illegal changes
5. Remediate audit failures via code changes
6. Complete audit loop until PASS
7. Respect all invariants
8. Mark undefined behavior explicitly

### 10.2 Session Success

A session is successful when:

1. All changes pass contract audit
2. No invariants violated
3. No non-goals implemented
4. All undefined behavior marked
5. Security-critical changes flagged
6. Coordination requirements identified

### 10.3 Zero-Context Agent Test

Drop an agent with:
- Only this ALIGNMENT.md
- barecommerce-core/README.md
- barecommerce-api/README.md
- contract-objectives.md

The agent MUST be able to:
- Modify code safely
- Detect contract violations
- Refuse illegal changes
- Close its own audit findings

---

*End of ALIGNMENT.md*
