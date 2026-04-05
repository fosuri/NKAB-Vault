import { db } from "@/lib/db/db";
import { user } from "@/lib/db/auth-schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/auth-server";
import { getUserModerationState } from "@/lib/auth/moderation";
import { redirect } from "next/navigation";

export default async function ModeratorPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  const moderationState = await getUserModerationState(session.user.id);
  if (moderationState?.activeBan) {
    redirect("/banned");
  }

  if (!dbUser || (dbUser.role !== "moderator" && dbUser.role !== "admin")) {
    redirect("/");
  }

  return (
    <div>
      <h1>Moderator Dashboard</h1>
      <p>Username: {dbUser.name}</p>
      <p>Email: {dbUser.email}</p>
      <p>Role: {dbUser.role}</p>
    </div>
  );
}
