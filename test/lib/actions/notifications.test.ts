import {
  clearAllNotifications,
  deleteNotification,
  getNotifications,
  markNotificationsAsRead,
} from "../../../lib/actions/notifications";
import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";
import { revalidatePath } from "next/cache";

jest.mock("drizzle-orm", () => ({
  desc: jest.fn((field) => ({ type: "desc", field })),
  eq: jest.fn((field, value) => ({ type: "eq", field, value })),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/auth/auth-server", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/db/db", () => ({
  db: {
    delete: jest.fn(),
    query: {
      notifications: {
        findMany: jest.fn(),
      },
    },
    update: jest.fn(),
  },
}));

jest.mock("@/lib/db/auth-schema", () => ({
  notifications: {
    createdAt: "notifications.createdAt",
    id: "notifications.id",
    userId: "notifications.userId",
  },
}));

function session(userId = "user-1") {
  return { user: { id: userId } };
}

function createMutationBuilder() {
  const builder = {
    set: jest.fn(),
    where: jest.fn(),
  };

  builder.set.mockReturnValue(builder);
  builder.where.mockResolvedValue(undefined);

  return builder;
}

describe("notification actions", () => {
  const getSessionMock = getSession as jest.MockedFunction<typeof getSession>;
  const findManyMock = db.query.notifications.findMany as unknown as jest.Mock;
  const updateMock = db.update as unknown as jest.Mock;
  const deleteMock = db.delete as unknown as jest.Mock;
  const revalidatePathMock = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session() as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Stops unauthenticated users from accessing the notifications feed.
  it("requires authentication before fetching notifications", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(getNotifications()).resolves.toEqual({
      error: "Not authenticated",
      data: null,
    });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  // Confirms that the user successfully receives their notification history.
  it("fetches notifications for the current user", async () => {
    const notifications = [{ id: "notification-1", message: "hello" }];
    findManyMock.mockResolvedValue(notifications);

    await expect(getNotifications()).resolves.toEqual({
      success: true,
      data: notifications,
    });
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 20,
        with: expect.objectContaining({
          actor: expect.any(Object),
          post: expect.any(Object),
        }),
      })
    );
  });

  // Checks that the "Mark all as read" button successfully updates the database.
  it("marks all notifications as read for the current user", async () => {
    const builder = createMutationBuilder();
    updateMock.mockReturnValue(builder);

    await expect(markNotificationsAsRead()).resolves.toEqual({ success: true });
    expect(builder.set).toHaveBeenCalledWith({ isRead: true });
    expect(builder.where).toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  // Prevents unauthenticated users from triggering the "Mark all as read" action.
  it("requires authentication before marking notifications as read", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(markNotificationsAsRead()).resolves.toEqual({
      error: "Not authenticated",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  // Verifies that a user can dismiss a single specific notification.
  it("deletes a single notification", async () => {
    const builder = createMutationBuilder();
    deleteMock.mockReturnValue(builder);

    await expect(deleteNotification("notification-1")).resolves.toEqual({ success: true });
    expect(builder.where).toHaveBeenCalledWith({
      field: "notifications.id",
      type: "eq",
      value: "notification-1",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  // Checks that the user can clear their entire notification history at once.
  it("clears all notifications for the current user", async () => {
    const builder = createMutationBuilder();
    deleteMock.mockReturnValue(builder);

    await expect(clearAllNotifications()).resolves.toEqual({ success: true });
    expect(builder.where).toHaveBeenCalledWith({
      field: "notifications.userId",
      type: "eq",
      value: "user-1",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });
});
