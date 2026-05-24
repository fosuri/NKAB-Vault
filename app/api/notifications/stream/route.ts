import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/auth-server";
import { chatEventEmitter } from "@/lib/events";

export const dynamic = "force-dynamic";

/**
 * Notifications SSE Route.
 * Sends a real-time signal to the client whenever a new notification is created for the user.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();

  // Authentication check
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  /**
   * Initialize SSE Stream.
   * Listens for 'notifications:{userId}' events and sends an update signal to the client.
   */
  const stream = new ReadableStream({
    start(controller) {
      const listener = () => {
        // Send a simple ping event instructing the client to refetch its notification data
        controller.enqueue(
          new TextEncoder().encode(`data: {"type": "update"}\n\n`)
        );
      };

      const eventName = `notifications:${userId}`;
      chatEventEmitter.on(eventName, listener);

      // Cleanup: remove listener on connection abort
      req.signal.addEventListener("abort", () => {
        chatEventEmitter.off(eventName, listener);
        try {
          controller.close();
        } catch {
          // Ignore stream close errors
        }
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
