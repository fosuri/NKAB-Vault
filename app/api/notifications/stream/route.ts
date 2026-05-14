import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/auth-server";
import { chatEventEmitter } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      const listener = () => {
        // Send a ping event that tells the client to refetch notifications
        controller.enqueue(
          new TextEncoder().encode(`data: {"type": "update"}\n\n`)
        );
      };

      const eventName = `notifications:${userId}`;
      chatEventEmitter.on(eventName, listener);

      req.signal.addEventListener("abort", () => {
        chatEventEmitter.off(eventName, listener);
        try {
          controller.close();
        } catch (e) {
          // ignore stream close errors
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
