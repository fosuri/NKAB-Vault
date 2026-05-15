import { createCheckoutSession } from "../../../lib/actions/stripe";
import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";
import Stripe from "stripe";

jest.mock("stripe", () =>
  jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: jest.fn() } },
    subscriptions: { cancel: jest.fn(), list: jest.fn() },
  }))
);

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((field, value) => ({ field, type: "eq", value })),
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

describe("createCheckoutSession", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findUserMock = db.query.user.findFirst as unknown as jest.Mock;
  const stripeInstance = (Stripe as unknown as jest.Mock).mock.results[0].value;
  const createCheckoutMock = stripeInstance.checkout.sessions.create as jest.Mock;

  beforeEach(() => {
    process.env.STRIPE_PRO_PRICE_ID = "price-pro";
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL = "https://app.example.com";
    getSessionMock.mockResolvedValue({ user: { email: "alice@example.com" } } as never);
    findUserMock.mockResolvedValue({ email: "alice@example.com", id: "user-1" });
    createCheckoutMock.mockResolvedValue({ url: "https://stripe.example.com/session" });
  });

  afterEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(createCheckoutSession()).resolves.toEqual({ error: "Not authenticated" });
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it("returns a checkout URL for a valid user", async () => {
    await expect(createCheckoutSession()).resolves.toEqual({
      url: "https://stripe.example.com/session",
    });
    expect(createCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: "user-1",
        customer_email: "alice@example.com",
        mode: "subscription",
      })
    );
  });
});
