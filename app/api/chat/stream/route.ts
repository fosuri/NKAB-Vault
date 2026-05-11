import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/auth-server";
import { db } from "@/lib/db/db";
import { conversationParticipants } from "@/lib/db/auth-schema";
import { and, eq } from "drizzle-orm";
import { chatEventEmitter } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const conversationId = req.nextUrl.searchParams.get("conversationId");

  if (!conversationId) {
    return new Response("Missing conversationId", { status: 400 });
  }

  // Verify access
  const participant = await db.query.conversationParticipants.findFirst({
    where: and(
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.userId, userId)
    ),
  });

  if (!participant) {
    return new Response("Forbidden", { status: 403 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const listener = (message: any) => {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`)
        );
      };

      const eventName = `chat:${conversationId}`;
      chatEventEmitter.on(eventName, listener);

      req.signal.addEventListener("abort", () => {
        chatEventEmitter.off(eventName, listener);
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
