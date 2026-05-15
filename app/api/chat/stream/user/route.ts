import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/auth-server";
import { chatEventEmitter } from "@/lib/events";

export const dynamic = "force-dynamic";

/**
 * User-level SSE route for chat events and notification invalidations.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();

  // Ensure the user is authenticated
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let isClosed = false;

      const cleanup = () => {
        if (isClosed) {
          return;
        }

        isClosed = true;
        chatEventEmitter.off(userEventName, userListener);
        chatEventEmitter.off(notificationsEventName, notificationListener);

        try {
          controller.close();
        } catch {
          // Ignore close errors
        }
      };

      const userEventName = `user:${userId}`;
      const notificationsEventName = `notifications:${userId}`;

      const send = (eventData: unknown) => {
        if (isClosed) {
          return;
        }

        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`)
          );
        } catch {
          cleanup();
        }
      };

      const userListener = (eventData: unknown) => {
        send(eventData);
      };

      const notificationListener = () => {
        send({ type: "notifications_update" });
      };

      chatEventEmitter.on(userEventName, userListener);
      chatEventEmitter.on(notificationsEventName, notificationListener);

      // Cleanup: remove listener when the connection is aborted
      req.signal.addEventListener("abort", () => {
        cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
