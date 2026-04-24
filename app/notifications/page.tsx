import { getSession } from "@/lib/auth/auth-server";
import { redirect } from "next/navigation";
import { getNotifications } from "@/lib/actions/notifications";
import { NotificationsList } from "@/components/NotificationsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NotificationsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const result = await getNotifications();
  const notifications = result.success && result.data ? result.data : [];

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationsList initialNotifications={notifications as any} />
        </CardContent>
      </Card>
    </div>
  );
}
