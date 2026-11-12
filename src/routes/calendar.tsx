import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputCls, PageHeader, Panel, StatusBadge } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { fmtTime, hitByEvent, parseTime } from "@/lib/rules";
import type { CalendarEvent } from "@/lib/types";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar & Announcements · CISC SpaceSync" },
      { name: "description", content: "CISC academic calendar, events, holidays and room closures." },
      { property: "og:title", content: "Calendar & Announcements · CISC SpaceSync" },
      { property: "og:description", content: "CISC academic calendar, events, holidays and room closures." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const s = useStore();
  const isAdmin = s.role === "admin";
  const visible = s.events.filter((e) => e.status === "published" || isAdmin || e.proposedBy === s.me);
  const days = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
  const lead = new Date("2026-11-01T00:00").getDay();
  return (
    <div className="space-y-6">
      <PageHeader title="Calendar & Announcements" subtitle="Published holidays and CISC-wide events close all rooms. Room events close only the listed rooms." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel title="November 2026">
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: lead }).map((_, i) => <div key={i} />)}
            {days.map((d) => {
              const ev = visible.filter((e) => e.date === d);
              return (
                <div key={d} className={`min-h-20 rounded-lg border p-1 text-left text-xs ${d === "2026-11-12" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                  <div className="font-semibold">{+d.slice(8)}</div>
                  {ev.map((e) => <div key={e.id} className={`mt-0.5 truncate rounded px-1 py-0.5 text-[10px] ${e.status === "proposed" ? "border border-dashed border-warning bg-warning/15" : e.scope === "all" ? "bg-brand text-primary-foreground" : "bg-green-brand text-secondary-foreground"}`}>{e.title}</div>)}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-brand" /> All rooms closed</span>
            <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-green-brand" /> Specific rooms</span>
            <span className="flex items-center gap-1"><i className="h-3 w-3 rounded border border-dashed border-warning" /> Proposed (not official)</span>
          </div>
        </Panel>
        <ProposeForm />
      </div>
      <Panel title="Announcements" icon={<Megaphone className="h-4 w-4" />}>
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.sort((a, b) => a.date.localeCompare(b.date)).map((e) => <EventCard key={e.id} e={e} />)}
        </ul>
      </Panel>
    </div>
  );
}

function EventCard({ e }: { e: CalendarEvent }) {
  const s = useStore();
  const hits = hitByEvent(e, s.reservations);
  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div><h3 className="font-semibold">{e.title}</h3><p className="text-xs capitalize text-muted-foreground">{e.kind} · {e.date} · {e.end - e.start >= 1440 ? "Whole day" : `${fmtTime(e.start)}–${fmtTime(e.end)}`}</p></div>
        <StatusBadge status={e.status} />
      </div>
      <p className="mt-2 text-sm">{e.description}</p>
      <p className="mt-2 text-xs font-medium text-primary">{e.scope === "all" ? "Impact: all CISC rooms unavailable" : `Impact: ${e.roomIds.map(s.roomName).join(", ")} unavailable`}</p>
      {e.status === "proposed" && <p className="mt-1 text-xs text-muted-foreground">Proposed by {e.proposedBy}</p>}
      {s.role === "admin" && e.status === "proposed" && (
        <div className="mt-3 space-y-2">
          {hits.length > 0 && <p className="text-xs text-destructive">Publishing will cancel {hits.length} reservation(s) and notify requesters.</p>}
          <div className="flex gap-2"><Button size="sm" onClick={() => s.publishEvent(e.id)}>Publish</Button><Button size="sm" variant="outline" onClick={() => s.removeEvent(e.id)}>Decline</Button></div>
        </div>
      )}
    </li>
  );
}

function ProposeForm() {
  const s = useStore();
  const [f, setF] = useState({ title: "", description: "", date: "2026-11-20", start: "08:00", end: "12:00", kind: "event" as CalendarEvent["kind"], scope: "rooms" as CalendarEvent["scope"], roomIds: [] as string[] });
  const valid = f.title.trim() && parseTime(f.end) > parseTime(f.start) && (f.scope === "all" || f.roomIds.length > 0);
  return (
    <Panel title={s.role === "admin" ? "New announcement" : "Propose an event"} className="h-fit">
      <div className="grid gap-3">
        <Field label="Title"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Description & instructions"><textarea className={inputCls + " h-20 py-2"} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Date"><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="From"><input type="time" className={inputCls} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
          <Field label="To"><input type="time" className={inputCls} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
        </div>
        <Field label="Type">
          <select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as CalendarEvent["kind"], scope: e.target.value === "event" ? f.scope : "all" })}><option value="event">Event</option><option value="holiday">Holiday</option><option value="closure">Closure</option></select>
        </Field>
        <Field label="Scope">
          <select className={inputCls} value={f.scope} disabled={f.kind !== "event"} onChange={(e) => setF({ ...f, scope: e.target.value as CalendarEvent["scope"] })}><option value="rooms">Selected rooms</option><option value="all">CISC-wide (all rooms)</option></select>
        </Field>
        {f.scope === "rooms" && (
          <div className="flex flex-wrap gap-2">{s.rooms.map((r) => { const on = f.roomIds.includes(r.id); return <button type="button" key={r.id} aria-pressed={on} onClick={() => setF({ ...f, roomIds: on ? f.roomIds.filter((x) => x !== r.id) : [...f.roomIds, r.id] })} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{r.name}</button>; })}</div>
        )}
        <Button disabled={!valid} onClick={() => { s.proposeEvent({ ...f, start: parseTime(f.start), end: parseTime(f.end), roomIds: f.scope === "all" ? [] : f.roomIds }); setF({ ...f, title: "", description: "", roomIds: [] }); }}>{s.role === "admin" ? "Save draft" : "Send proposal"}</Button>
        <p className="text-xs text-muted-foreground">An administrator reviews and publishes every event.</p>
      </div>
    </Panel>
  );
}
