import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/auth-server";
import { chatEventEmitter } from "@/lib/events";

export const dynamic = "force-dynamic";

/**
 * User-level Chat SSE Route.
 * Provides real-time updates for events specific to the authenticated user 
 * (e.g., new conversations, message read status, conversation deletions).
 */
export async function GET(req: NextRequest) {
  const session = await getSession();

  // Ensure the user is authenticated
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  /**
   * Initialize SSE Stream.
   * Listens to the 'user:{userId}' event and enqueues data for the client.
   */
  const stream = new ReadableStream({
    start(controller) {
      const listener = (eventData: any) => {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(eventData)}\n\n`)
        );
      };

      const userEventName = `user:${userId}`;
      chatEventEmitter.on(userEventName, listener);

      // Cleanup: remove listener when the connection is aborted
      req.signal.addEventListener("abort", () => {
        chatEventEmitter.off(userEventName, listener);
        try {
          controller.close();
        } catch (e) {
          // Ignore close errors
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
