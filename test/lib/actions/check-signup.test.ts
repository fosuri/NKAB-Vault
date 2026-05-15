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

  it("reports that a username is available when no matching user exists", async () => {
    selectMock.mockReturnValue(createSelectBuilder([]));

    await expect(checkUsernameAvailable("Alice")).resolves.toBe(true);
  });

  it("reports that a username is unavailable when a matching user exists", async () => {
    selectMock.mockReturnValue(createSelectBuilder([{ id: "user-1" }]));

    await expect(checkUsernameAvailable("Alice")).resolves.toBe(false);
  });

  it("reports that an email is available when no matching user exists", async () => {
    selectMock.mockReturnValue(createSelectBuilder([]));

    await expect(checkEmailAvailable("alice@example.com")).resolves.toBe(true);
  });

  it("reports that an email is unavailable when a matching user exists", async () => {
    selectMock.mockReturnValue(createSelectBuilder([{ id: "user-1" }]));

    await expect(checkEmailAvailable("alice@example.com")).resolves.toBe(false);
  });

  it("detects google-only accounts", async () => {
    selectMock.mockReturnValue(createSelectBuilder([{ id: "account-1" }]));

    await expect(checkIsGoogleOnlyAccount("alice@example.com")).resolves.toBe(true);
  });

  it("returns false when an email is not a google-only account", async () => {
    selectMock.mockReturnValue(createSelectBuilder([]));

    await expect(checkIsGoogleOnlyAccount("alice@example.com")).resolves.toBe(false);
  });
});
