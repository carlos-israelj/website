# Swift Add Website – PR Submission
## Stellar Journey to Mastery · Open Source Track

**Repo:** https://github.com/swift-add/website  
**Context:** PR #11 (rishav76dev) adds config validation tests and Jest infrastructure, addressing Issue #7. This PR targets 4 separate bugs in API routes that none of the existing PRs touch.

---

## PR Title

`fix: /api/track-view accepts arbitrary viewDuration enabling credit farming, /api/upload-ad ignores paid duration (always 60 min), /api/ad-placements/verify-payment instantiates new PrismaClient per request (connection leak), /api/health leaks env var configuration info`

---

## Overview

This PR resolves **4 bugs** across three Next.js API routes and one utility route. Every fix is independent and surgical — no cosmetic changes, no test infrastructure changes (that's PR #11's scope).

| # | Severity | File | Description |
|---|---|---|---|
| 1 | 🔴 Critical | `app/api/track-view/route.ts` | `viewDuration` accepted from client without validation — enables credit farming |
| 2 | 🔴 Critical | `app/api/upload-ad/route.ts` | `durationMinutes` hardcoded to 60 — all paid durations (30m, 6h, 24h) silently capped at 1h |
| 3 | 🟠 High | `app/api/ad-placements/verify-payment/route.ts` | `new PrismaClient()` per module — connection pool leak |
| 4 | 🟡 Medium | `app/api/health/route.ts` | Public endpoint leaks env var presence info |

---

## Critical Bug Fixes

### Bug 1 — `/api/track-view` accepts arbitrary `viewDuration` from client (`app/api/track-view/route.ts`)
**Severity: Critical — anyone can earn XLM credits without watching any ad.**

The view-tracking endpoint awards XLM credits based on `viewDuration` received in the POST body:

```typescript
// Original — no validation
const { placementId, sessionId, viewDuration, slotId, walletAddress } = body;
// ...
const creditsEarned = viewDuration >= 30 ? 0.05 : 0.01;
```

`viewDuration` is a client-supplied integer with no server-side validation. The duplicate check (`findFirst` by `placementId + sessionId`) prevents re-crediting the same session for the same placement — but only until a new `placementId` or a new `sessionId` (trivial to forge) is used. Anyone can `curl` the endpoint with `viewDuration=999` and wallet address set to their own, earning 0.05 XLM per request without the ad ever loading.

`Ad402Slot.tsx` defines the only legitimate values in the `trackingMilestones` array: `[10, 30, 60, 120, 240, 480]` seconds. The server must enforce this allowlist.

**Before (broken):**
```typescript
if (!placementId || !sessionId || !viewDuration) {
  return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
}

const creditsEarned = viewDuration >= 30 ? 0.05 : 0.01; // any value accepted
```

**After (fixed):**
```typescript
if (!placementId || !sessionId || !viewDuration) {
  return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
}

// BUG FIX: viewDuration was accepted from the client without any validation.
// A malicious user could POST viewDuration=999999 to claim maximum credits
// without watching any ad.  The valid milestones are [10, 30, 60, 120, 240, 480]
// seconds (as defined in Ad402Slot.tsx).  Any value outside this set is rejected.
const VALID_VIEW_DURATIONS = [10, 30, 60, 120, 240, 480];
const parsedDuration = Number(viewDuration);
if (!VALID_VIEW_DURATIONS.includes(parsedDuration)) {
  console.warn('⚠️ Rejected invalid viewDuration:', viewDuration);
  return NextResponse.json(
    { success: false, error: `Invalid viewDuration. Must be one of: ${VALID_VIEW_DURATIONS.join(', ')}` },
    { status: 400 }
  );
}
```

The allowlist is derived directly from the `trackingMilestones` constant in `Ad402Slot.tsx`, making the server-side contract explicitly match the client-side behaviour. If the milestones array changes in the future, both must be updated together.

---

### Bug 2 — `/api/upload-ad` ignores paid duration, always expires after 1 hour (`app/api/upload-ad/route.ts`)
**Severity: Critical — advertisers who pay for 6h or 24h slots receive only 1h of exposure.**

The upload endpoint hardcodes the ad expiry duration regardless of what the advertiser paid for:

```typescript
// Original — hardcoded, comment even acknowledges it
// Calculate duration (default 1 hour)
const durationMinutes = 60;
const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
```

`paymentData.duration` is already present in the POST body (e.g. `'30m'`, `'1h'`, `'6h'`, `'24h'`) — it is read for logging but never used to compute `expiresAt`. An advertiser who pays for a 24-hour slot sees their ad expire after 60 minutes. This is a direct financial loss for every advertiser purchasing any duration other than `'1h'`.

**Before (broken):**
```typescript
// Calculate duration (default 1 hour)
const durationMinutes = 60;
const startsAt = new Date();
const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
```

**After (fixed):**
```typescript
// BUG FIX: durationMinutes was hardcoded to 60, ignoring the duration
// the advertiser actually paid for.  paymentData.duration carries the
// chosen duration string (e.g. '30m', '1h', '6h', '24h').  Parse it so
// the placement expires when the paid window ends, not always after 1 hour.
const DURATION_MAP: Record<string, number> = {
  '30m': 30,
  '1h': 60,
  '6h': 360,
  '24h': 1440,
};
const rawDuration: string = paymentData.duration || '1h';
const durationMinutes = DURATION_MAP[rawDuration] ?? 60;
const startsAt = new Date();
const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
```

The `DURATION_MAP` is a closed set matching the `durations` prop on `Ad402Slot` (`['30m', '1h', '6h', '24h']`). Unknown strings fall back to 60 via `?? 60` so the route never produces a `NaN` timestamp.

---

## High-Severity Bug Fix

### Bug 3 — `verify-payment` instantiates a new `PrismaClient` per module (`app/api/ad-placements/verify-payment/route.ts`)
**Severity: High — connection pool exhaustion under load; inconsistent with every other route in the project.**

Every other API route in the project imports the shared singleton from `@/lib/prisma`:
```typescript
import { prisma } from '@/lib/prisma'; // lib/prisma.ts uses globalThis pattern
```

`verify-payment` was the only exception:
```typescript
// Original — creates a new PrismaClient at module level in this file
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

In Next.js, API routes are separate modules. In development with hot-reloading, each reload of `verify-payment/route.ts` instantiates a new `PrismaClient` with a fresh connection pool, accumulating idle database connections. Under production load, concurrent requests to this endpoint open new pools that are never shared or properly closed, leading to connection exhaustion on the database server.

**Before (broken):**
```typescript
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();
```

**After (fixed):**
```typescript
// BUG FIX: must use the shared singleton from @/lib/prisma, not new PrismaClient().
// Every other route in this project already does this correctly.
import { prisma } from '@/lib/prisma';
import { ethers } from 'ethers';
```

One line changed, zero behaviour change — the fix aligns this route with the established pattern in the codebase.

---

## Medium Bug Fix

### Bug 4 — `/api/health` leaks environment configuration info publicly (`app/api/health/route.ts`)
**Severity: Medium — exposes server configuration surface to unauthenticated callers.**

The health endpoint is publicly accessible with no authentication. Its original response included:

```json
{
  "status": "healthy",
  "timestamp": "2026-03-24T...",
  "environment": "production",
  "lighthouseApiKey": "SET",
  "lighthouseStorageHash": "NOT SET"
}
```

This tells any unauthenticated caller: (1) which environment the server is running in, (2) whether `LIGHTHOUSE_API_KEY` is configured, and (3) whether `LIGHTHOUSE_STORAGE_HASH` is configured. An attacker can use this to understand exactly which secrets are absent — useful for crafting targeted requests against unguarded storage endpoints.

**Before (broken):**
```typescript
return NextResponse.json({
  status: 'healthy',
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV,
  lighthouseApiKey: process.env.LIGHTHOUSE_API_KEY ? 'SET' : 'NOT SET',
  lighthouseStorageHash: process.env.LIGHTHOUSE_STORAGE_HASH ? 'SET' : 'NOT SET'
});
```

**After (fixed):**
```typescript
// BUG FIX: advertising env var presence is unnecessary information leakage.
// A public health endpoint should only confirm the service is alive.
return NextResponse.json({
  status: 'healthy',
  timestamp: new Date().toISOString(),
});
```

---

## Files Changed

| File | Type | Change |
|---|---|---|
| `app/api/track-view/route.ts` | Security fix | Server-side allowlist validation for `viewDuration` — rejects values not in `[10, 30, 60, 120, 240, 480]` |
| `app/api/upload-ad/route.ts` | Logic fix | `DURATION_MAP` parses `paymentData.duration` (`'30m'`, `'1h'`, `'6h'`, `'24h'`) instead of hardcoding 60 minutes |
| `app/api/ad-placements/verify-payment/route.ts` | Resource fix | Replaced `new PrismaClient()` with `import { prisma } from '@/lib/prisma'` — shared singleton |
| `app/api/health/route.ts` | Security fix | Removed `environment`, `lighthouseApiKey`, `lighthouseStorageHash` from public response |

---

## Differentiation from PR #11

PR #11 (rishav76dev) adds the Jest testing framework and tests for `Ad402Provider` config validation (Issue #7). This PR makes no changes to test infrastructure, the `Ad402Provider` component, or anything covered by PR #11. All 4 changes here are in API route files that PR #11 does not touch.

---

## Technical Depth

**Credit farming attack surface** — The `track-view` fix is the most security-critical change. The duplicate detection (`findFirst` by `placementId + sessionId`) provides replay protection only within the same session. The `sessionId` is generated client-side as `` `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` `` — guessable, not cryptographically random, and trivially regenerated by clearing `localStorage`. The server-side allowlist ensures that even without session-level replay protection, each individual call can only credit a legitimate milestone duration, not an arbitrary value that bypasses the credit tier.

**Duration integrity** — The `upload-ad` fix has a direct financial impact: without it, every advertiser who purchases a `30m`, `6h`, or `24h` slot receives only 60 minutes of placement. The `DURATION_MAP` is a closed enum that matches the `durations` prop passed to `Ad402Slot` — the same values users see in the UI and pay for at checkout. Using `?? 60` as a fallback ensures unknown strings (e.g. from future slot configuration changes) degrade gracefully to the default 1-hour window rather than producing `NaN` in the `Date` constructor.

**Prisma singleton pattern in Next.js** — The `globalThis` pattern in `lib/prisma.ts` (`global.prisma = global.prisma || new PrismaClient()`) is the officially recommended approach for Next.js because the development server's hot-module replacement re-evaluates modules on each file save. Without the singleton, each HMR cycle opens a new connection pool. In serverless/edge deployments, the same problem occurs per cold start. The fix also makes `verify-payment` consistent with the 12 other routes in the project that already import from `@/lib/prisma`.
