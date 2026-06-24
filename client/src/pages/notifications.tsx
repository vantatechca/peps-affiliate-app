import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { TopNavBar } from "../components/TopNavBar";
import { ListSkeleton } from "../components/skeletons";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch("/api/notifications", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

export default function Notifications() {
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: fetchNotifications,
  });

  return (
    <div className="space-y-6 fx-page">
      <TopNavBar />
      <h1 className="text-2xl font-bold fx-text-in fx-text-glow"><span className="fx-text-sweep">Notifications</span><span className="fx-caret ml-1">_</span></h1>

      {isLoading ? (
        <ListSkeleton count={5} />
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">No notifications</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className={`${!n.isRead ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 min-w-0">
                  <span className="font-medium truncate">{n.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{n.message}</p>
                <div className="flex gap-2">
                  <Link href={n.linkUrl || `/notifications/${n.id}` as string}>
                    <Button size="sm">View</Button>
                  </Link>
                  <Link href={`/notifications/${n.id}`}>
                    <Button variant="ghost" size="sm">Open details</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
