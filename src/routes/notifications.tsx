import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · CISC SpaceSync" },
      { name: "description", content: "Reservation updates, cancellations, reminders and announcements." },
      { property: "og:title", content: "Notifications · CISC SpaceSync" },
      { property: "og:description", content: "Reservation updates, cancellations, reminders and announcements." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const s = useStore();
  const list = s.notifications.filter((n) => n.to === s.me || n.to === "all");
  return (
    <div>
      <PageHeader title="Notifications" action={<Button variant="outline" onClick={s.markAllRead}>Mark all as read</Button>} />
      <Panel>
        <ul className="divide-y divide-border">
          {list.map((n) => (
            <li key={n.id} className="flex gap-3 py-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-muted" : "bg-secondary"}`} aria-label={n.read ? "Read" : "Unread"} />
              <div><div className="font-medium">{n.title}</div><div className="text-sm text-muted-foreground">{n.body}</div><div className="text-xs text-muted-foreground">{n.time}</div></div>
            </li>
          ))}
          {!list.length && <li className="py-3 text-sm text-muted-foreground">No notifications.</li>}
        </ul>
      </Panel>
    </div>
  );
}
