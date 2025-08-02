# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal finance MVP application built with Next.js 15, React 19, TypeScript, Prisma, and SQLite. The application provides user authentication, transaction management, and automatic transaction categorization using both rule-based and machine learning approaches.

## Common Development Commands

```bash
# Development
npm run dev              # Start development server on port 3000
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:ci          # Run tests for CI (no watch, with coverage)

# Database
npm run db:seed         # Seed the database with default categories
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema changes to database
npx prisma studio       # Open Prisma Studio for database management
```

## Architecture Overview

### Core Structure
- **Next.js App Router**: Uses the new app directory structure with route handlers in `app/api/`
- **Database**: SQLite with Prisma ORM, schema defined in `prisma/schema.prisma`
- **Authentication**: JWT-based auth with bcrypt password hashing
- **Transaction Processing**: CSV upload, parsing, and automatic categorization

### Key Models
- **User**: Authentication and user data
- **BankAccount**: User's financial accounts
- **Transaction**: Financial transactions with amounts, dates, descriptions
- **Category**: Transaction categories (Income, Food, Transportation, etc.)
- **LearnedPattern**: Machine learning patterns for auto-categorization

### Authentication Flow
- JWT tokens stored in cookies and Authorization headers
- Auth utilities in `lib/auth.ts` handle token generation/verification
- Protected routes use `getUserFromRequest()` for authentication

### Transaction Categorization System
The app uses a hybrid categorization approach:

1. **Rule-based categorization** (`lib/auto-categorizer.ts`):
   - Predefined keyword rules for common transaction types
   - Priority-based matching system
   - Handles positive amounts as income detection

2. **Machine learning categorization** (`lib/ml-trainer.ts`):
   - Learns from user's past categorization decisions
   - Extracts keywords and creates patterns
   - Confidence-based predictions with fallback to rules

3. **Hybrid approach**: Combines both methods, preferring learned patterns for high-confidence matches

### API Routes Structure
- `api/auth/`: Authentication endpoints (login, signup, logout)
- `api/transactions/`: Transaction CRUD, CSV upload, auto-categorization
- `api/categories/`: Category management and statistics
- `api/dashboard/`: Summary statistics and recent transactions

### CSV Processing
- Supports transaction CSV uploads via `lib/csv-parser.ts`
- Automatically categorizes imported transactions
- Handles various CSV formats with date/description/amount parsing

### Database Seeding
Run `npm run db:seed` to populate initial categories:
- Income, Housing, Transportation, Food, Healthcare, Entertainment, Shopping, Utilities, Miscellaneous

## Development Notes

### File Structure
- `app/`: Next.js 15 app directory with pages and API routes
- `lib/`: Shared utilities (auth, ML, CSV parsing, Prisma client)
- `prisma/`: Database schema, migrations, and seed file
- Configuration files: TypeScript, Tailwind, PostCSS, Next.js config

### Key Libraries
- `@prisma/client`: Database ORM
- `bcryptjs`: Password hashing
- `jsonwebtoken`: JWT authentication
- `csv-parser`: CSV file processing
- `multer`: File upload handling

### Authentication Pattern
Most API routes use this pattern:
```typescript
const user = getUserFromRequest(request)
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Transaction Processing Pattern
When adding transactions, the system:
1. Parses and validates transaction data
2. Attempts auto-categorization using hybrid approach
3. Stores transaction with or without category
4. Updates learned patterns for future categorization

### Environment Variables
- `JWT_SECRET`: JWT signing secret
- `DATABASE_URL`: SQLite database path (defaults to `file:./dev.db`)

## Testing

The project uses Jest and React Testing Library for comprehensive testing. Test files are located in `__tests__/` directory.

### Test Structure
- `__tests__/api/`: API route tests
- `__tests__/lib/`: Library/utility function tests  
- `__tests__/components/`: React component tests
- `__tests__/utils/`: Custom test utilities

### Custom Test Utilities

#### Authentication Testing (`__tests__/utils/auth-utils.ts`)
- `createMockUser()`: Generate test user objects
- `createMockJWT()`: Create valid JWT tokens for testing
- `createAuthenticatedRequest()`: Mock Next.js requests with authentication
- `setupAuthMocks()`: Mock all auth functions with Jest

#### Database Testing (`__tests__/utils/database-utils.ts`)
- `setupDatabaseMocks()`: Initialize Prisma mocks using jest-mock-extended
- `mockDatabaseScenarios`: Pre-configured database states (user exists, has transactions, etc.)
- `createMockUser/BankAccount/Transaction/Category()`: Generate test data
- Full Prisma client mocking for isolated unit tests

#### CSV Testing (`__tests__/utils/csv-utils.ts`)
- `createMockCSVFile()`: Generate test CSV files as File objects
- `csvTestData`: Pre-defined CSV test datasets (standard, edge cases, large files)
- `csvParsingHelpers`: Utilities for testing file uploads and multipart data
- `csvAssertions`: Assertions for validating parsed transaction data

### Test Patterns

#### API Route Testing
```typescript
import { setupAuthMocks, createAuthenticatedRequest } from '../../utils/auth-utils'
import { setupDatabaseMocks, mockDatabaseScenarios } from '../../utils/database-utils'

// Mock modules and setup test data
const authMocks = setupAuthMocks()
setupDatabaseMocks()
mockDatabaseScenarios.userExists(mockUser)
```

#### Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock Next.js navigation and fetch
global.fetch = jest.fn()
```

#### CSV Processing Testing
```typescript
import { csvTestData, createMockCSVBuffer, csvAssertions } from '../utils/csv-utils'

const buffer = createMockCSVBuffer(csvTestData.standard)
csvAssertions.expectValidTransactions(results)
```

### Running Tests
- Use `npm test` for single test run
- Use `npm run test:watch` during development
- Use `npm run test:coverage` to check coverage
- Tests use environment variables: `JWT_SECRET=test-jwt-secret`, `DATABASE_URL=file:./test.db`