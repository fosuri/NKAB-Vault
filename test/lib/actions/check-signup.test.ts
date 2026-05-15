import {
  checkEmailAvailable,
  checkIsGoogleOnlyAccount,
  checkUsernameAvailable,
} from "../../../lib/actions/check-signup";
import { db } from "@/lib/db/db";

jest.mock("drizzle-orm", () => ({
  and: jest.fn((...conditions) => ({ type: "and", conditions })),
  eq: jest.fn((field, value) => ({ type: "eq", field, value })),
  isNull: jest.fn((field) => ({ type: "isNull", field })),
}));

jest.mock("@/lib/db/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock("@/lib/db/auth-schema", () => ({
  account: {
    id: "account.id",
    password: "account.password",
    providerId: "account.providerId",
    userId: "account.userId",
  },
  user: {
    email: "user.email",
    id: "user.id",
    name: "user.name",
  },
}));

function createSelectBuilder(result: Array<{ id: string }>) {
  const builder = {
    from: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    limit: jest.fn(),
  };

  builder.from.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.limit.mockResolvedValue(result);

  return builder;
}

describe("signup availability actions", () => {
  const selectMock = db.select as unknown as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Confirms that a username can be claimed if nobody else is using it.
  it("reports that a username is available when no matching user exists", async () => {
    selectMock.mockReturnValue(createSelectBuilder([]));

    await expect(checkUsernameAvailable("Alice")).resolves.toBe(true);
  });

  // Prevents someone from picking a username that belongs to an existing account.
  it("reports that a username is unavailable when a matching user exists", async () => {
    selectMock.mockReturnValue(createSelectBuilder([{ id: "user-1" }]));

    await expect(checkUsernameAvailable("Alice")).resolves.toBe(false);
  });

  // Confirms that an email can be used to sign up if it's not already in the system.
  it("reports that an email is available when no matching user exists", async () => {
    selectMock.mockReturnValue(createSelectBuilder([]));

    await expect(checkEmailAvailable("alice@example.com")).resolves.toBe(true);
  });

  // Prevents someone from registering a new account with an email that is already used.
  it("reports that an email is unavailable when a matching user exists", async () => {
    selectMock.mockReturnValue(createSelectBuilder([{ id: "user-1" }]));

    await expect(checkEmailAvailable("alice@example.com")).resolves.toBe(false);
  });

  // Checks if the user signed up using Google instead of a normal password.
  it("detects google-only accounts", async () => {
    selectMock.mockReturnValue(createSelectBuilder([{ id: "account-1" }]));

    await expect(checkIsGoogleOnlyAccount("alice@example.com")).resolves.toBe(true);
  });

  // Confirms that a standard email/password account is not flagged as a Google-only account.
  it("returns false when an email is not a google-only account", async () => {
    selectMock.mockReturnValue(createSelectBuilder([]));

    await expect(checkIsGoogleOnlyAccount("alice@example.com")).resolves.toBe(false);
  });
});
