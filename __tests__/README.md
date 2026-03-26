# Test Suite for Bug Fixes

This test suite provides comprehensive coverage for all bug fixes implemented in this PR.

## Bug Fixes Covered

### 1. CRITICAL - `/api/track-view` viewDuration validation
**File:** `__tests__/api/track-view.test.ts`

Tests ensure that:
- Only valid viewDuration values `[10, 30, 60, 120, 240, 480]` are accepted
- Invalid values (0, negative, 999, etc.) are rejected with 400 status
- Wallet addresses are validated (Stellar and Ethereum formats)
- Session IDs are validated for proper format

### 2. CRITICAL - `/api/upload-ad` duration parsing
**File:** `__tests__/api/upload-ad.test.ts`

Tests verify that:
- `30m` is parsed as 30 minutes
- `1h` is parsed as 60 minutes
- `6h` is parsed as 360 minutes
- `24h` is parsed as 1440 minutes
- Unknown durations default to 60 minutes
- Expiry times are calculated correctly based on paid duration

### 3. HIGH - PrismaClient singleton usage
**Coverage:** Manual verification

Fixed files:
- `app/api/ad-placements/route.ts`
- `app/api/ad-slots/route.ts`
- `app/api/analytics/route.ts`
- `app/api/ad-slots/[slotId]/route.ts`
- `app/api/ad-placements/verify-payment/route.ts`

All now use `import { prisma } from '@/lib/prisma'` instead of `new PrismaClient()`.

### 4. MEDIUM - `/api/health` information disclosure
**File:** `__tests__/api/health.test.ts`

Tests ensure that:
- Only `status` and `timestamp` fields are returned
- `environment`, `lighthouseApiKey`, `lighthouseStorageHash` are NOT exposed
- Response structure contains exactly 2 properties

### 5. HIGH - Exposed Lighthouse API key
**Coverage:** Manual verification

Fixed file: `lib/lighthouse.ts`
- Hardcoded API key replaced with `process.env.LIGHTHOUSE_API_KEY`
- Warning logged if environment variable is not set

### 6. MEDIUM - Wallet address validation
**File:** `__tests__/lib/validation.test.ts`

Tests cover:
- Stellar address validation (G prefix, 56 chars, base32)
- Ethereum address validation (0x prefix, 40 hex chars)
- Combined wallet validation
- Session ID validation (alphanumeric, underscores, proper length)

## Running the Tests

### Install dependencies (if not already installed)
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm test __tests__/api/track-view.test.ts
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Generate coverage report
```bash
npm test -- --coverage
```

## Test Configuration

If Jest is not configured yet, add this to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

Create `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.json' }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  collectCoverageFrom: [
    'app/api/**/*.ts',
    'lib/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};
```

## Expected Test Results

All tests should pass with the bug fixes implemented:
- ✅ `/api/track-view` - 15 tests
- ✅ `/api/upload-ad` - 10 tests
- ✅ `/api/health` - 6 tests
- ✅ `lib/validation` - 25 tests

**Total:** 56 tests covering all bug fixes

## Additional Tests Recommended

For production readiness, consider adding:
1. Integration tests with actual database (using test database)
2. E2E tests for complete user flows
3. Performance tests for rate limiting
4. Security tests for CSRF protection
