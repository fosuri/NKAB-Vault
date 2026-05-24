import { getSession } from "@/lib/auth/auth-server";
import { redirect } from "next/navigation";
import { getNotifications } from "@/lib/actions/notifications";
import { NotificationsList, Notification } from "@/components/NotificationsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Notifications Page.
 * Displays a list of recent activities related to the user (likes, comments, etc.).
 */
export default async function NotificationsPage() {
  const session = await getSession();

  // Authentication check
  if (!session?.user) {
    redirect("/sign-in");
  }

  // Fetch notifications from the database
  const result = await getNotifications();
  const notifications = result.success && result.data ? (result.data as Notification[]) : [];

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Real-time enabled Notifications List component */}
          <NotificationsList initialNotifications={notifications} />
        </CardContent>
      </Card>
    </div>
  );
}

