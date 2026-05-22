# Testing Guide for NKAB-Vault

This document provides an overview of the testing infrastructure, methods, and coverage in the NKAB-Vault project.

## Testing Stack

We use a modern and robust testing stack to ensure code quality and prevent regressions:

- **[Jest](https://jestjs.io/)**: Used as our primary test runner for Unit and Integration testing. It provides a fast and reliable environment for testing our utility functions, API routes, and core business logic.
- **[Playwright](https://playwright.dev/)**: Used for End-to-End (E2E) testing. It allows us to simulate real user interactions in a browser environment to ensure the entire system works together flawlessly.
- **[Bun](https://bun.sh/)**: Used as our fast JavaScript runtime and package manager, capable of executing tests quickly.

## Test Coverage

Our current test coverage is excellent, ensuring a high level of confidence in the codebase. 

- **Overall Coverage**: ~92%
- **Statements**: 91.17%
- **Lines**: 91.79%
- **Functions**: 91.58%
- **Branches**: 75.24%

*Note: You can generate an up-to-date coverage report at any time by running `bunx jest --coverage`.*

## Available Scripts

The following npm/bun scripts are configured in `package.json` to help you run tests easily:

### Unit & Integration Tests (Jest)
- `bun run test` - Runs the standard Jest test suite once.
- `bun run test:watch` - Runs Jest in watch mode, automatically re-running tests when files are modified. Useful during active development.
- `bunx jest --coverage` - Runs tests and generates a detailed coverage report in the terminal.

### End-to-End Tests (Playwright)
> **Important:** Before running E2E tests for the first time, you must install the required Playwright browsers by running `bunx playwright install` (or `npx playwright install`).

- `bun run test:e2e` - Runs all Playwright E2E tests in headless mode.
- `bun run test:e2e:ui` - Opens the Playwright UI mode, which provides a visual interface for exploring, running, and debugging E2E tests.

## Testing Methods

We employ a multi-layered testing strategy:

1. **Unit Testing**: We test individual functions and components in isolation (e.g., utility functions, formatters).
2. **Integration Testing**: We test how different pieces of the system work together, particularly focusing on our Next.js API routes, database operations (Drizzle ORM), and authentication flows.
3. **End-to-End (E2E) Testing**: We test critical user journeys from the perspective of an end-user in a real browser using Playwright, verifying that the frontend and backend are integrated correctly.

## Writing Tests

- Unit and Integration tests should be placed in the `tests/` directory, mirroring the structure of the `app/` and `lib/` folders.
- Use `*.test.ts` or `*.spec.ts` naming conventions for your test files.
- E2E tests are typically configured in `playwright.config.ts` and reside in their designated directory (often `tests-e2e/` or similar, check Playwright config).
