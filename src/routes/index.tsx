import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Bell, Building2, CalendarDays, ClipboardList, LifeBuoy, Sparkles, TableProperties } from "lucide-react";
import { CapacityBar, Panel, StatusBadge } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { dayOf, fmtTime, rankRooms, remainingCapacity, scheduleConflicts } from "@/lib/rules";
import { TODAY } from "@/lib/seed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · CISC SpaceSync" },
      { name: "description", content: "Today's classes, room availability, reservations and announcements for CISC." },
      { property: "og:title", content: "Dashboard · CISC SpaceSync" },
      { property: "og:description", content: "Today's classes, room availability, reservations and announcements for CISC." },
    ],
  }),
  component: Dashboard,
});

const NOW = 10 * 60 + 30;

function Dashboard() {
  const s = useStore();
  const today = dayOf(TODAY);
  const classesToday = s.schedules.filter((c) => c.status === "official" && c.day === today && (s.role !== "faculty" || c.faculty === s.me) && (s.role !== "student" || c.section === "BSCS 3-A")).sort((a, b) => a.start - b.start);
  const mine = s.reservations.filter((r) => r.requester === s.me);
  const pending = s.reservations.filter((r) => r.status === "pending");
  const upcoming = s.events.filter((e) => e.status === "published").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const recs = rankRooms(s.rooms, { date: TODAY, start: NOW, end: NOW + 60, people: 5 }, s.schedules, s.events, s.reservations).slice(0, 3);
  const conflicts = scheduleConflicts(s.schedules, s.rooms);
  const bumped = s.reservations.filter((r) => r.note?.startsWith("Replaced by faculty"));
  const openReports = s.reports.filter((r) => !["Resolved", "Returned / Closed"].includes(r.status));
  const myReports = s.reports.filter((r) => r.reporter === s.me);
  const notes = s.notifications.filter((n) => n.to === s.me || n.to === "all").slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-brand p-6 text-primary-foreground shadow-card md:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-foreground/10" aria-hidden />
        <div className="absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-primary-foreground/10" aria-hidden />
        <p className="text-sm opacity-80">Good morning,</p>
        <h1 className="mt-1 text-3xl font-semibold md:text-4xl">{s.me}</h1>
        <p className="mt-2 max-w-xl text-sm opacity-90">
          {s.role === "admin" ? `${pending.length} room requests waiting for review · ${conflicts.length} schedule issues flagged.` : `You have ${classesToday.length} class${classesToday.length === 1 ? "" : "es"} today. Find a room or check your requests below.`}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {s.role === "admin" ? (
            <>
              <QuickLink to="/reservations" label="Review requests" />
              <QuickLink to="/schedules" label="Scheduling assistant" />
              <QuickLink to="/calendar" label="Publish an event" />
            </>
          ) : (
            <>
              <QuickLink to="/rooms" label="Find a room" />
              <QuickLink to="/reservations" label="My requests" />
              <QuickLink to="/reports" label="Report an issue" />
            </>
          )}
        </div>
      </section>

      {s.role === "admin" && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat icon={<Building2 className="h-4 w-4" />} label="Rooms" value={s.rooms.length} />
          <Stat icon={<ClipboardList className="h-4 w-4" />} label="Pending requests" value={pending.length} />
          <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Schedule conflicts" value={conflicts.length} />
          <Stat icon={<LifeBuoy className="h-4 w-4" />} label="Open reports" value={openReports.length} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={s.role === "faculty" ? "Today's teaching" : s.role === "admin" ? "Classes today" : "Today's classes"} icon={<TableProperties className="h-4 w-4" />} className="lg:col-span-2">
          {(s.role === "admin" ? s.schedules.filter((c) => c.status === "official" && c.day === today) : classesToday).length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes today.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(s.role === "admin" ? s.schedules.filter((c) => c.status === "official" && c.day === today) : classesToday).map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <div className="font-medium">{c.course}</div>
                    <div className="text-xs text-muted-foreground">{c.section} · {c.faculty}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium text-primary">{s.roomName(c.roomId)}</div>
                    <div className="text-xs text-muted-foreground">{fmtTime(c.start)} – {fmtTime(c.end)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Room availability now" icon={<Building2 className="h-4 w-4" />}>
          <ul className="space-y-3">
            {s.rooms.slice(0, 5).map((r) => {
              const left = remainingCapacity(r, TODAY, NOW, NOW + 30, s.reservations);
              return (
                <li key={r.id}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{r.name}</span><span className="text-muted-foreground">{left}/{r.capacity} seats left</span></div>
                  <CapacityBar used={r.capacity - left} total={r.capacity} />
                </li>
              );
            })}
          </ul>
        </Panel>

        {s.role === "admin" ? (
          <Panel title="Pending room requests" icon={<ClipboardList className="h-4 w-4" />} action={<Link to="/reservations" className="text-sm font-medium text-primary">Review</Link>} className="lg:col-span-2">
            <ResList list={pending} />
          </Panel>
        ) : (
          <Panel title="My room requests" icon={<ClipboardList className="h-4 w-4" />} action={<Link to="/reservations" className="text-sm font-medium text-primary">View all</Link>} className="lg:col-span-2">
            <ResList list={mine} />
          </Panel>
        )}

        {s.role === "student" ? (
          <Panel title="Recommended now" icon={<Sparkles className="h-4 w-4" />}>
            <ul className="space-y-2">
              {recs.map((r) => (
                <li key={r.room.id} className="flex items-center justify-between rounded-xl bg-muted p-3 text-sm">
                  <div><div className="font-medium">{r.room.name}</div><div className="text-xs text-muted-foreground">{r.room.type} · {r.remaining} seats left</div></div>
                  {r.available ? <StatusBadge status="approved" /> : <span className="text-xs text-muted-foreground">{r.reason}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Recommendations don't reserve a room — requests still need approval.</p>
          </Panel>
        ) : s.role === "admin" ? (
          <Panel title="Needs attention" icon={<AlertTriangle className="h-4 w-4" />}>
            <ul className="space-y-2 text-sm">
              {conflicts.slice(0, 3).map((c, i) => <li key={i} className="rounded-xl bg-destructive/10 p-3 text-destructive">{c.message}</li>)}
              {bumped.length > 0 && <li className="rounded-xl bg-warning/20 p-3">{bumped.length} student reservation(s) replaced by faculty bookings.</li>}
              {conflicts.length === 0 && bumped.length === 0 && <li className="text-muted-foreground">All clear.</li>}
            </ul>
          </Panel>
        ) : (
          <Panel title="My reports" icon={<LifeBuoy className="h-4 w-4" />}>
            <ReportList list={myReports} />
          </Panel>
        )}

        <Panel title="Upcoming events" icon={<CalendarDays className="h-4 w-4" />}>
          <ul className="space-y-3">
            {upcoming.map((e) => (
              <li key={e.id} className="flex gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-green-brand text-center text-secondary-foreground">
                  <div className="text-[10px] uppercase leading-none">{new Date(e.date + "T00:00").toLocaleString("en", { month: "short" })}</div>
                  <div className="text-lg font-bold leading-none">{e.date.slice(8)}</div>
                </div>
                <div className="text-sm"><div className="font-medium">{e.title}</div><div className="text-xs text-muted-foreground">{e.scope === "all" ? "All CISC rooms closed" : e.roomIds.map(s.roomName).join(", ")}</div></div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={s.role === "admin" ? "Reports to handle" : "My reports"} icon={<LifeBuoy className="h-4 w-4" />} className={s.role === "faculty" ? "hidden" : ""}>
          <ReportList list={s.role === "admin" ? openReports : myReports} />
        </Panel>

        <Panel title="Notifications" icon={<Bell className="h-4 w-4" />} action={<Link to="/notifications" className="text-sm font-medium text-primary">All</Link>}>
          <ul className="space-y-3 text-sm">
            {notes.map((n) => <li key={n.id}><div className="font-medium">{n.title}</div><div className="text-xs text-muted-foreground">{n.body}</div></li>)}
            {notes.length === 0 && <li className="text-muted-foreground">Nothing new.</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function QuickLink({ to, label }: { to: "/rooms" | "/reservations" | "/reports" | "/schedules" | "/calendar"; label: string }) {
  return <Link to={to} className="rounded-full bg-primary-foreground/15 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-primary-foreground/25">{label}</Link>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-accent-foreground">{icon}</span>{label}</div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
    </div>
  );
}

function ResList({ list }: { list: ReturnType<typeof useStore>["reservations"] }) {
  const s = useStore();
  if (!list.length) return <p className="text-sm text-muted-foreground">No requests yet.</p>;
  return (
    <ul className="divide-y divide-border">
      {list.slice(0, 5).map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
          <div><div className="font-medium">{s.roomName(r.roomId)} · {r.purpose}</div><div className="text-xs text-muted-foreground">{r.date} · {fmtTime(r.start)}–{fmtTime(r.end)} · {r.people} people · {r.requester}</div></div>
          <StatusBadge status={r.status} />
        </li>
      ))}
    </ul>
  );
}

function ReportList({ list }: { list: ReturnType<typeof useStore>["reports"] }) {
  if (!list.length) return <p className="text-sm text-muted-foreground">No reports.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {list.slice(0, 4).map((r) => <li key={r.id} className="flex items-center justify-between gap-2"><span>{r.title}</span><StatusBadge status={r.status} /></li>)}
    </ul>
  );
}
