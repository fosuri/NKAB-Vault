import { cancelSubscription } from "../../../lib/actions/stripe";
import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";
import { revalidatePath } from "next/cache";

jest.mock("stripe", () =>
  jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: jest.fn() } },
    subscriptions: { cancel: jest.fn(), list: jest.fn() },
  }))
);

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((field, value) => ({ field, type: "eq", value })),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/auth/auth-server", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/db/db", () => ({
  db: { query: { user: { findFirst: jest.fn() } } },
}));

jest.mock("@/lib/db/auth-schema", () => ({
  user: { email: "user.email" },
}));

describe("cancelSubscription", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;
  const revalidatePathMock = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
  const stripeInstance = (jest.requireMock("stripe") as jest.Mock).mock.results[0].value;
  const cancelMock = stripeInstance.subscriptions.cancel as jest.Mock;
  const listMock = stripeInstance.subscriptions.list as jest.Mock;

  beforeEach(() => {
    getSessionMock.mockResolvedValue({ user: { email: "alice@example.com" } } as never);
    findUserMock.mockResolvedValue({ customerId: "cus_123" });
    listMock.mockResolvedValue({ data: [{ id: "sub_123" }] });
    cancelMock.mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  // Ensures you must be logged in to cancel a subscription.
  it("requires authentication", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(cancelSubscription()).resolves.toEqual({ error: "Not authenticated" });
    expect(listMock).not.toHaveBeenCalled();
  });

  // Verifies that the cancellation request is successfully sent to Stripe.
  it("cancels the active Stripe subscription", async () => {
    await expect(cancelSubscription()).resolves.toEqual({ success: true });
    expect(listMock).toHaveBeenCalledWith({
      customer: "cus_123",
      limit: 1,
      status: "active",
    });
    expect(cancelMock).toHaveBeenCalledWith("sub_123");
    expect(revalidatePathMock).toHaveBeenCalledWith("/subscription");
  });
});
