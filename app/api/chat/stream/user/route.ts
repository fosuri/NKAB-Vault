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
      const listener = (eventData: any) => {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(eventData)}\n\n`)
        );
      };

      const userEventName = `user:${userId}`;
      chatEventEmitter.on(userEventName, listener);

      req.signal.addEventListener("abort", () => {
        chatEventEmitter.off(userEventName, listener);
        try {
          controller.close();
        } catch (e) {
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
